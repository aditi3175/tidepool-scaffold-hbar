// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { SafeCast } from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import { FullMath } from "@uniswap/v4-core/src/libraries/FullMath.sol";
import { TickMath } from "@uniswap/v4-core/src/libraries/TickMath.sol";
import { HederaTokenService } from "@hiero-ledger/hiero-contracts/token-service/HederaTokenService.sol";
import { IHederaTokenService } from "@hiero-ledger/hiero-contracts/token-service/IHederaTokenService.sol";
import { HederaResponseCodes } from "@hiero-ledger/hiero-contracts/common/HederaResponseCodes.sol";
import { IExchangeRate } from "@hiero-ledger/hiero-contracts/exchange-rate/IExchangeRate.sol";

import { ISaucerSwapV2Factory, ISaucerSwapV2Pool, ISaucerSwapV2NonfungiblePositionManager as INPM, ISaucerSwapV2SwapRouter } from "./interfaces/ISaucerSwapV2.sol";
import { RangeMath } from "./libraries/RangeMath.sol";

/// @title TidepoolVault
/// @notice Holds a single SaucerSwap V2 concentrated-liquidity position, issues an HTS fungible
///         share token, compounds swap fees back into the position, and re-centres the range when
///         the pool's time-weighted price leaves it. Every state-changing function except
///         `initialize` is permissionless; there is no owner and no upgrade path.
contract TidepoolVault is HederaTokenService, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using SafeCast for uint256;

    struct Config {
        address pool; // SaucerSwap V2 pool (checked against the factory)
        address positionManager; // SaucerSwapV2NonfungiblePositionManager
        address swapRouter; // SaucerSwapV2SwapRouter
        int24 halfWidth; // half range width in ticks, a positive multiple of the pool's tickSpacing
        uint32 twapWindow; // seconds used for the TWAP
        int24 maxTwapDeviation; // max |spotTick - twapTick| for deposit / compound / rebalance
        uint32 rebalanceCooldown; // minimum seconds between rebalances
        uint16 swapSlippageBps; // extra slippage allowed on the compound and rebalance swaps, on top of the pool fee
    }

    /// @dev HTS amounts are int64, so shares use 8 decimals and a fixed first mint.
    int32 public constant SHARE_DECIMALS = 8;
    uint256 public constant INITIAL_SHARES = 100 * 1e8;
    /// @dev Minted to the vault (HTS treasury) on the first deposit and never released: defeats share-price inflation.
    uint256 public constant DEAD_SHARES = 1e5;
    int64 private constant SHARE_AUTO_RENEW_PERIOD = 7_776_000; // 90 days, the HTS default
    /// @dev Largest allowance HTS accepts (allowances are int64, so uint256 max is not valid). Tokens with a finite
    ///      max supply are capped lower: HTS rejects an allowance above maxSupply (AMOUNT_EXCEEDS_TOKEN_MAX_SUPPLY).
    uint256 private constant MAX_HTS_ALLOWANCE = uint256(uint64(type(int64).max));
    address private constant EXCHANGE_RATE_PRECOMPILE = address(0x168);

    address public immutable deployer;
    address public immutable pool;
    address public immutable token0;
    address public immutable token1;
    uint24 public immutable fee;
    int24 public immutable tickSpacing;
    address public immutable factory;
    INPM public immutable positionManager;
    ISaucerSwapV2SwapRouter public immutable swapRouter;
    address public immutable positionNft;
    int24 public immutable halfWidth;
    uint32 public immutable twapWindow;
    int24 public immutable maxTwapDeviation;
    uint32 public immutable rebalanceCooldown;
    uint16 public immutable swapSlippageBps;

    address public shareToken;
    uint256 public totalShares;
    uint256 public positionSerial; // SaucerSwap LP NFT serial; 0 = no position yet
    int24 public tickLower;
    int24 public tickUpper;
    uint64 public lastRebalance;
    /// @notice Standing allowance granted to the position manager and swap router on token0 / token1, set in
    ///         initialize(): the token's maxSupply if it has a finite supply, otherwise type(int64).max.
    uint256 public approvalCap0;
    uint256 public approvalCap1;

    event Initialized(address indexed shareToken);
    event Deposit(address indexed sender, address indexed receiver, uint256 shares, uint256 amount0, uint256 amount1);
    event Withdraw(address indexed owner, address indexed receiver, uint256 shares, uint256 amount0, uint256 amount1);
    event FeesCollected(uint256 fee0, uint256 fee1);
    event Compound(address indexed caller, uint128 liquidityAdded, uint256 amount0, uint256 amount1);
    event Rebalance(
        address indexed caller,
        int24 twapTick,
        int24 oldTickLower,
        int24 oldTickUpper,
        int24 newTickLower,
        int24 newTickUpper,
        uint256 newPositionSerial
    );

    error InvalidConfig();
    error NotDeployer();
    error AlreadyInitialized();
    error NotInitialized();
    error HtsCallFailed(int64 responseCode);
    error PriceDeviation(int24 spotTick, int24 twapTick);
    error InsufficientFee(uint256 required, uint256 provided);
    error ZeroShares();
    error SlippageExceeded();
    error NothingToCompound();
    error NoPosition();
    error StillInRange(int24 twapTick);
    error OutOfRange(int24 twapTick);
    error CooldownActive(uint256 readyAt);
    error RefundFailed();
    error ApproveFailed(address token, address spender);

    constructor(Config memory cfg) {
        ISaucerSwapV2Pool p = ISaucerSwapV2Pool(cfg.pool);
        address t0 = p.token0();
        address t1 = p.token1();
        uint24 poolFee = p.fee();
        int24 spacing = p.tickSpacing();
        address npmFactory = INPM(cfg.positionManager).factory();

        // The vault trusts the pool for prices, so it must be a genuine SaucerSwap V2 pool.
        if (ISaucerSwapV2Factory(npmFactory).getPool(t0, t1, poolFee) != cfg.pool) revert InvalidConfig();
        if (ISaucerSwapV2SwapRouter(cfg.swapRouter).factory() != npmFactory) revert InvalidConfig();
        if (cfg.halfWidth <= 0 || cfg.halfWidth % spacing != 0) revert InvalidConfig();
        if (cfg.twapWindow == 0 || cfg.maxTwapDeviation <= 0 || cfg.swapSlippageBps >= 10_000) revert InvalidConfig();

        deployer = msg.sender;
        pool = cfg.pool;
        token0 = t0;
        token1 = t1;
        fee = poolFee;
        tickSpacing = spacing;
        factory = npmFactory;
        positionManager = INPM(cfg.positionManager);
        swapRouter = ISaucerSwapV2SwapRouter(cfg.swapRouter);
        positionNft = INPM(cfg.positionManager).nft();
        halfWidth = cfg.halfWidth;
        twapWindow = cfg.twapWindow;
        maxTwapDeviation = cfg.maxTwapDeviation;
        rebalanceCooldown = cfg.rebalanceCooldown;
        swapSlippageBps = cfg.swapSlippageBps;
    }

    // ------------------------------------------------------------------------------------------
    // One-time setup (HTS association + share token creation)
    // ------------------------------------------------------------------------------------------

    /// @notice Associates the vault with token0, token1 and the LP NFT, then creates the HTS share token
    ///         with the vault as treasury and supply key, and grants the position manager and swap router
    ///         standing allowances on token0 and token1, capped per token (see approvalCap0/1). Each HTS
    ///         approval costs ~705k gas, so they are paid once here instead of on every compound/rebalance.
    ///         msg.value pays the HTS token-creation fee; any HBAR left in the vault afterwards is returned
    ///         to the caller.
    function initialize(string calldata name, string calldata symbol) external payable nonReentrant {
        if (msg.sender != deployer) revert NotDeployer();
        if (shareToken != address(0)) revert AlreadyInitialized();

        address[] memory tokens = new address[](3);
        tokens[0] = token0;
        tokens[1] = token1;
        tokens[2] = positionNft;
        _checkHts(associateTokens(address(this), tokens));

        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](1);
        keys[0] = IHederaTokenService.TokenKey({
            keyType: 16, // bit 4 = supply key
            key: IHederaTokenService.KeyValue({
                inheritAccountKey: false,
                contractId: address(this),
                ed25519: "",
                ECDSA_secp256k1: "",
                delegatableContractId: address(0)
            })
        });

        IHederaTokenService.HederaToken memory token = IHederaTokenService.HederaToken({
            name: name,
            symbol: symbol,
            treasury: address(this),
            memo: "Tidepool vault shares",
            tokenSupplyType: false, // infinite
            maxSupply: 0,
            freezeDefault: false,
            tokenKeys: keys,
            expiry: IHederaTokenService.Expiry({
                second: 0,
                autoRenewAccount: address(this),
                autoRenewPeriod: SHARE_AUTO_RENEW_PERIOD
            })
        });

        (int64 rc, address created) = createFungibleToken(token, 0, SHARE_DECIMALS);
        _checkHts(rc);
        shareToken = created;

        approvalCap0 = _approvalCap(token0);
        approvalCap1 = _approvalCap(token1);
        _grantStandingApprovals();

        _refund(address(this).balance);
        emit Initialized(created);
    }

    // ------------------------------------------------------------------------------------------
    // Depositor actions
    // ------------------------------------------------------------------------------------------

    /// @notice Deposit token0 and token1 in the vault's current ratio and receive HTS shares.
    /// @dev Deposits sit idle until the next compound(), so no HBAR mint fee is charged here.
    ///      The receiver must be associated with the share token (or have a free auto-association slot).
    function deposit(
        uint256 amount0Max,
        uint256 amount1Max,
        uint256 minShares,
        address receiver
    ) external nonReentrant returns (uint256 shares, uint256 amount0, uint256 amount1) {
        _requireInitialized();
        (uint160 sqrtPriceX96, , ) = _checkedPrices();
        _collectFees();

        uint256 supply = totalShares;
        if (supply == 0) {
            if (amount0Max == 0 || amount1Max == 0) revert ZeroShares();
            amount0 = amount0Max;
            amount1 = amount1Max;
            shares = INITIAL_SHARES - DEAD_SHARES;
            _mintShares(INITIAL_SHARES);
        } else {
            (uint256 total0, uint256 total1) = _totalAmounts(sqrtPriceX96);
            if (total0 == 0) {
                shares = FullMath.mulDiv(amount1Max, supply, total1);
            } else if (total1 == 0) {
                shares = FullMath.mulDiv(amount0Max, supply, total0);
            } else {
                uint256 s0 = FullMath.mulDiv(amount0Max, supply, total0);
                uint256 s1 = FullMath.mulDiv(amount1Max, supply, total1);
                shares = s0 < s1 ? s0 : s1;
            }
            if (shares == 0) revert ZeroShares();
            amount0 = FullMath.mulDivRoundingUp(shares, total0, supply);
            amount1 = FullMath.mulDivRoundingUp(shares, total1, supply);
            _mintShares(shares);
        }
        if (shares < minShares) revert SlippageExceeded();

        if (amount0 > 0) IERC20(token0).safeTransferFrom(msg.sender, address(this), amount0);
        if (amount1 > 0) IERC20(token1).safeTransferFrom(msg.sender, address(this), amount1);
        IERC20(shareToken).safeTransfer(receiver, shares);

        emit Deposit(msg.sender, receiver, shares, amount0, amount1);
    }

    /// @notice Burn `shares` and receive the matching slice of the position and of the idle balances.
    /// @dev The caller must first approve the vault to transfer `shares` of the share token.
    ///      Withdrawals do not check the TWAP, so users can always exit; amount0Min/amount1Min protect them.
    function withdraw(
        uint256 shares,
        uint256 amount0Min,
        uint256 amount1Min,
        address receiver
    ) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        _requireInitialized();
        if (shares == 0) revert ZeroShares();

        _collectFees();
        uint256 supply = totalShares;
        amount0 = FullMath.mulDiv(IERC20(token0).balanceOf(address(this)), shares, supply);
        amount1 = FullMath.mulDiv(IERC20(token1).balanceOf(address(this)), shares, supply);

        if (positionSerial != 0) {
            (, , , , , uint128 liquidity, , , , ) = positionManager.positions(positionSerial);
            uint128 toRemove = FullMath.mulDiv(liquidity, shares, supply).toUint128();
            if (toRemove > 0) {
                (uint256 out0, uint256 out1) = _removeLiquidity(toRemove);
                amount0 += out0;
                amount1 += out1;
            }
        }
        if (amount0 < amount0Min || amount1 < amount1Min) revert SlippageExceeded();

        IERC20(shareToken).safeTransferFrom(msg.sender, address(this), shares);
        _burnShares(shares);

        if (amount0 > 0) IERC20(token0).safeTransfer(receiver, amount0);
        if (amount1 > 0) IERC20(token1).safeTransfer(receiver, amount1);

        emit Withdraw(msg.sender, receiver, shares, amount0, amount1);
    }

    // ------------------------------------------------------------------------------------------
    // Keeper actions (permissionless; the caller pays SaucerSwap's HBAR position fee)
    // ------------------------------------------------------------------------------------------

    /// @notice Collect fees, swap idle balances to the range's ratio, and add everything to the position
    ///         (minting the first position if none exists). msg.value must cover `quoteMintFee()`; the rest is refunded.
    function compound() external payable nonReentrant {
        _requireInitialized();
        (uint160 sqrtPriceX96, , int24 twapTick) = _checkedPrices();
        _collectFees();

        if (positionSerial == 0) {
            if (IERC20(token0).balanceOf(address(this)) == 0 && IERC20(token1).balanceOf(address(this)) == 0) {
                revert NothingToCompound();
            }
            (int24 lower, int24 upper) = RangeMath.rangeAround(twapTick, tickSpacing, halfWidth);
            _swapToRatio(sqrtPriceX96, twapTick, lower, upper);
            _mintPosition(lower, upper);
            lastRebalance = uint64(block.timestamp);
            emit Rebalance(msg.sender, twapTick, 0, 0, lower, upper, positionSerial);
            return;
        }

        // Adding to an out-of-range position would swap everything to one token; rebalance() is the path there.
        if (twapTick < tickLower || twapTick >= tickUpper) revert OutOfRange(twapTick);
        _swapToRatio(sqrtPriceX96, twapTick, tickLower, tickUpper);
        uint256 idle0 = IERC20(token0).balanceOf(address(this));
        uint256 idle1 = IERC20(token1).balanceOf(address(this));
        if (idle0 == 0 && idle1 == 0) revert NothingToCompound();

        uint256 mintFeeTinybars = _chargeMintFee();
        (uint128 liquidity, uint256 used0, uint256 used1) = positionManager.increaseLiquidity{ value: mintFeeTinybars }(
            INPM.IncreaseLiquidityParams({
                tokenSN: positionSerial,
                amount0Desired: idle0,
                amount1Desired: idle1,
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp
            })
        );
        _refund(msg.value - mintFeeTinybars);

        emit Compound(msg.sender, liquidity, used0, used1);
    }

    /// @notice When the TWAP tick has left the range: withdraw everything, re-centre the range on the TWAP
    ///         tick, swap to the new ratio through the SaucerSwap router, and mint a new position.
    function rebalance() external payable nonReentrant {
        _requireInitialized();
        if (positionSerial == 0) revert NoPosition();
        uint256 readyAt = uint256(lastRebalance) + rebalanceCooldown;
        if (block.timestamp < readyAt) revert CooldownActive(readyAt);

        (uint160 sqrtPriceX96, , int24 twapTick) = _checkedPrices();
        if (twapTick >= tickLower && twapTick < tickUpper) revert StillInRange(twapTick);

        _collectFees();
        (, , , , , uint128 liquidity, , , , ) = positionManager.positions(positionSerial);
        if (liquidity > 0) _removeLiquidity(liquidity);

        int24 oldLower = tickLower;
        int24 oldUpper = tickUpper;
        (int24 lower, int24 upper) = RangeMath.rangeAround(twapTick, tickSpacing, halfWidth);
        _swapToRatio(sqrtPriceX96, twapTick, lower, upper);
        _mintPosition(lower, upper);
        lastRebalance = uint64(block.timestamp);

        emit Rebalance(msg.sender, twapTick, oldLower, oldUpper, lower, upper, positionSerial);
    }

    /// @notice Re-grants the standing allowances to the position manager and swap router, up to approvalCap0/1.
    ///         Permissionless: the spenders and amounts are fixed, so calling it can only restore the allowances
    ///         that compound/rebalance spend down over time.
    function refreshApprovals() external nonReentrant {
        _requireInitialized();
        _grantStandingApprovals();
    }

    // ------------------------------------------------------------------------------------------
    // Views and quotes
    // ------------------------------------------------------------------------------------------

    /// @notice Token amounts the vault controls at the current pool price: the position's principal
    ///         plus idle balances. Uncollected swap fees are not included until the next collect.
    function getTotalAmounts() external view returns (uint256 total0, uint256 total1) {
        (uint160 sqrtPriceX96, , , , , , ) = ISaucerSwapV2Pool(pool).slot0();
        return _totalAmounts(sqrtPriceX96);
    }

    /// @notice Spot tick, TWAP tick, and whether the TWAP tick is inside the current range.
    function getPriceState() external view returns (int24 spotTick, int24 twapTick, bool inRange) {
        (, spotTick, , , , , ) = ISaucerSwapV2Pool(pool).slot0();
        twapTick = RangeMath.consultTwapTick(pool, twapWindow);
        inRange = positionSerial != 0 && twapTick >= tickLower && twapTick < tickUpper;
    }

    /// @notice HBAR (in tinybars) that compound() and rebalance() forward to SaucerSwap for the position fee.
    /// @dev Not `view` because the exchange-rate system contract is declared non-view; call it with eth_call.
    function quoteMintFee() external returns (uint256 tinybars) {
        return _mintFeeTinybars();
    }

    // ------------------------------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------------------------------

    function _requireInitialized() private view {
        if (shareToken == address(0)) revert NotInitialized();
    }

    /// @dev Reverts unless the spot tick is within maxTwapDeviation of the TWAP tick.
    function _checkedPrices() private view returns (uint160 sqrtPriceX96, int24 spotTick, int24 twapTick) {
        (sqrtPriceX96, spotTick, , , , , ) = ISaucerSwapV2Pool(pool).slot0();
        twapTick = RangeMath.consultTwapTick(pool, twapWindow);
        int24 diff = spotTick > twapTick ? spotTick - twapTick : twapTick - spotTick;
        if (diff > maxTwapDeviation) revert PriceDeviation(spotTick, twapTick);
    }

    function _totalAmounts(uint160 sqrtPriceX96) private view returns (uint256 total0, uint256 total1) {
        total0 = IERC20(token0).balanceOf(address(this));
        total1 = IERC20(token1).balanceOf(address(this));
        if (positionSerial != 0) {
            (, , , , , uint128 liquidity, , , , ) = positionManager.positions(positionSerial);
            (uint256 p0, uint256 p1) = RangeMath.amountsForLiquidity(sqrtPriceX96, tickLower, tickUpper, liquidity);
            total0 += p0;
            total1 += p1;
        }
    }

    /// @dev Moves all fees owed to the position into the vault's idle balances.
    function _collectFees() private {
        if (positionSerial == 0) return;
        (uint256 fee0, uint256 fee1) = positionManager.collect(
            INPM.CollectParams({
                tokenSN: positionSerial,
                recipient: address(this),
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            })
        );
        if (fee0 > 0 || fee1 > 0) emit FeesCollected(fee0, fee1);
    }

    /// @dev decreaseLiquidity only credits tokensOwed; collect moves them to the vault. No HBAR fee applies.
    function _removeLiquidity(uint128 liquidity) private returns (uint256 amount0, uint256 amount1) {
        positionManager.decreaseLiquidity(
            INPM.DecreaseLiquidityParams({
                tokenSN: positionSerial,
                liquidity: liquidity,
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp
            })
        );
        (amount0, amount1) = positionManager.collect(
            INPM.CollectParams({
                tokenSN: positionSerial,
                recipient: address(this),
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            })
        );
    }

    function _mintPosition(int24 lower, int24 upper) private {
        uint256 bal0 = IERC20(token0).balanceOf(address(this));
        uint256 bal1 = IERC20(token1).balanceOf(address(this));
        uint256 mintFeeTinybars = _chargeMintFee();

        (uint256 serial, , , ) = positionManager.mint{ value: mintFeeTinybars }(
            INPM.MintParams({
                token0: token0,
                token1: token1,
                fee: fee,
                tickLower: lower,
                tickUpper: upper,
                amount0Desired: bal0,
                amount1Desired: bal1,
                amount0Min: 0,
                amount1Min: 0,
                recipient: address(this),
                deadline: block.timestamp
            })
        );

        positionSerial = serial;
        tickLower = lower;
        tickUpper = upper;
        _refund(msg.value - mintFeeTinybars);
    }

    /// @dev Swaps through the SaucerSwap V2 router so idle balances match the range's ratio.
    ///      amountOutMinimum is derived from the TWAP price, net of the pool fee and swapSlippageBps.
    function _swapToRatio(uint160 sqrtPriceX96, int24 twapTick, int24 lower, int24 upper) private {
        uint256 bal0 = IERC20(token0).balanceOf(address(this));
        uint256 bal1 = IERC20(token1).balanceOf(address(this));
        (bool zeroForOne, uint256 amountIn) = RangeMath.swapToRatio(bal0, bal1, sqrtPriceX96, lower, upper);
        if (amountIn == 0) return;

        uint160 sqrtTwapX96 = TickMath.getSqrtPriceAtTick(twapTick);
        uint256 expectedOut = zeroForOne
            ? RangeMath.token0ToToken1(amountIn, sqrtTwapX96)
            : RangeMath.token1ToToken0(amountIn, sqrtTwapX96);
        if (expectedOut == 0) return; // dust: not worth a swap
        uint256 minOut = FullMath.mulDiv(
            expectedOut,
            uint256(1_000_000 - fee) * (10_000 - swapSlippageBps),
            1_000_000 * 10_000
        );

        (address tokenIn, address tokenOut) = zeroForOne ? (token0, token1) : (token1, token0);
        swapRouter.exactInputSingle(
            ISaucerSwapV2SwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: minOut,
                sqrtPriceLimitX96: 0
            })
        );
    }

    /// @dev SaucerSwap charges `factory.mintFee()` tinycents, paid in HBAR, on every mint and increaseLiquidity.
    ///      The position manager converts it with the exchange-rate system contract (0x168) and adds 1 tinybar
    ///      of rounding slop; sending exactly that amount leaves the manager with no spare HBAR, so it pulls
    ///      WHBAR from the vault instead of wrapping the caller's HBAR.
    /// @dev maxSupply for a finite-supply HTS token, else type(int64).max. A failed lookup (for example a token
    ///      that is not an HTS token) falls back to type(int64).max.
    function _approvalCap(address token) private returns (uint256) {
        (int256 rc, IHederaTokenService.FungibleTokenInfo memory info) = getFungibleTokenInfo(token);
        if (rc != HederaResponseCodes.SUCCESS) return MAX_HTS_ALLOWANCE;
        IHederaTokenService.HederaToken memory t = info.tokenInfo.token;
        // tokenSupplyType: true = FINITE.
        if (t.tokenSupplyType && t.maxSupply > 0) return uint256(uint64(t.maxSupply));
        return MAX_HTS_ALLOWANCE;
    }

    function _grantStandingApprovals() private {
        _approve(token0, address(positionManager), approvalCap0);
        _approve(token1, address(positionManager), approvalCap1);
        _approve(token0, address(swapRouter), approvalCap0);
        _approve(token1, address(swapRouter), approvalCap1);
    }

    /// @dev A plain approve with its result checked: a rejected approval reverts once (no reset-and-retry).
    function _approve(address token, address spender, uint256 amount) private {
        if (!IERC20(token).approve(spender, amount)) revert ApproveFailed(token, spender);
    }

    function _mintFeeTinybars() private returns (uint256) {
        uint256 tinycents = ISaucerSwapV2Factory(factory).mintFee();
        if (tinycents == 0) return 0;
        return IExchangeRate(EXCHANGE_RATE_PRECOMPILE).tinycentsToTinybars(tinycents) + 1;
    }

    function _chargeMintFee() private returns (uint256 tinybars) {
        tinybars = _mintFeeTinybars();
        if (msg.value < tinybars) revert InsufficientFee(tinybars, msg.value);
    }

    function _mintShares(uint256 amount) private {
        (int64 rc, , ) = mintToken(shareToken, SafeCast.toInt64(amount.toInt256()), new bytes[](0));
        _checkHts(rc);
        totalShares += amount;
    }

    function _burnShares(uint256 amount) private {
        (int64 rc, ) = burnToken(shareToken, SafeCast.toInt64(amount.toInt256()), new int64[](0));
        _checkHts(rc);
        totalShares -= amount;
    }

    function _refund(uint256 amount) private {
        if (amount == 0) return;
        (bool ok, ) = payable(msg.sender).call{ value: amount }("");
        if (!ok) revert RefundFailed();
    }

    function _checkHts(int64 rc) private pure {
        if (rc != HederaResponseCodes.SUCCESS) revert HtsCallFailed(rc);
    }
}
