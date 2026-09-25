// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { FullMath } from "@uniswap/v4-core/src/libraries/FullMath.sol";
import { TickMath } from "@uniswap/v4-core/src/libraries/TickMath.sol";
import { SqrtPriceMath } from "@uniswap/v4-core/src/libraries/SqrtPriceMath.sol";
import { IHederaTokenService } from "@hiero-ledger/hiero-contracts/token-service/IHederaTokenService.sol";

import { ISaucerSwapV2NonfungiblePositionManager as INPM } from "../interfaces/ISaucerSwapV2.sol";
import { RangeMath } from "../libraries/RangeMath.sol";

/// Test-only doubles. None of these are deployed to a live network.

contract MockToken is ERC20 {
    uint8 private immutable _dec;
    address public minter;

    constructor(string memory n, string memory s, uint8 d) ERC20(n, s) {
        _dec = d;
        minter = msg.sender;
    }

    function decimals() public view override returns (uint8) {
        return _dec;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burnFrom(address from, uint256 amount) external {
        require(msg.sender == minter, "not minter");
        _burn(from, amount);
    }
}

/// Etched at 0x167 in unit tests. Implements the HTS calls TidepoolVault makes.
contract MockHts {
    int32 internal constant SUCCESS = 22;
    mapping(address => mapping(address => bool)) public associated;
    mapping(address => address) public treasuryOf;

    function associateTokens(address account, address[] memory tokens) external returns (int64) {
        require(msg.sender == account, "must self-associate");
        for (uint256 i; i < tokens.length; i++) associated[account][tokens[i]] = true;
        return SUCCESS;
    }

    function createFungibleToken(
        IHederaTokenService.HederaToken memory token,
        int64,
        int32 decimals
    ) external payable returns (int64, address) {
        require(msg.value > 0, "creation fee");
        MockToken t = new MockToken(token.name, token.symbol, uint8(uint32(decimals)));
        treasuryOf[address(t)] = token.treasury;
        return (SUCCESS, address(t));
    }

    function mintToken(address token, int64 amount, bytes[] memory) external returns (int64, int64, int64[] memory) {
        require(msg.sender == treasuryOf[token], "not supply key");
        MockToken(token).mint(msg.sender, uint256(uint64(amount)));
        return (SUCCESS, int64(uint64(MockToken(token).totalSupply())), new int64[](0));
    }

    function burnToken(address token, int64 amount, int64[] memory) external returns (int64, int64) {
        require(msg.sender == treasuryOf[token], "not supply key");
        MockToken(token).burnFrom(msg.sender, uint256(uint64(amount)));
        return (SUCCESS, int64(uint64(MockToken(token).totalSupply())));
    }
}

/// Etched at 0x168. 1 HBAR = 7.8 US cents, the testnet rate observed on 24 Sep 2026.
contract MockExchangeRate {
    function tinycentsToTinybars(uint256 tinycents) external pure returns (uint256) {
        return (tinycents * 100) / 780;
    }
}

contract MockFactory {
    uint256 public mintFee = 500_000_000; // 5 US cents, as on testnet
    mapping(bytes32 => address) internal pools;

    function setPool(address a, address b, uint24 f, address p) external {
        pools[keccak256(abi.encode(a, b, f))] = p;
        pools[keccak256(abi.encode(b, a, f))] = p;
    }

    function getPool(address a, address b, uint24 f) external view returns (address) {
        return pools[keccak256(abi.encode(a, b, f))];
    }
}

contract MockPool {
    address public token0;
    address public token1;
    uint24 public fee = 3000;
    int24 public tickSpacing = 60;
    uint160 public sqrtPriceX96;
    int24 public tick;
    int24 public twapTick;
    bool public observeReverts;

    constructor(address t0, address t1) {
        token0 = t0;
        token1 = t1;
    }

    function setPrice(int24 spot, int24 twap) external {
        tick = spot;
        sqrtPriceX96 = TickMath.getSqrtPriceAtTick(spot);
        twapTick = twap;
    }

    function setObserveReverts(bool v) external {
        observeReverts = v;
    }

    function slot0() external view returns (uint160, int24, uint16, uint16, uint16, uint8, bool) {
        return (sqrtPriceX96, tick, 0, 1000, 1000, 0, true);
    }

    function observe(uint32[] calldata secondsAgos) external view returns (int56[] memory tc, uint160[] memory s) {
        require(!observeReverts, "OLD");
        tc = new int56[](2);
        s = new uint160[](2);
        tc[0] = 0;
        tc[1] = int56(twapTick) * int56(uint56(secondsAgos[0]));
    }
}

/// Behaves like the SaucerSwap position manager closely enough for unit tests:
/// liquidity maths is real, the NFT is a plain owner mapping, and fees are injected by the test.
contract MockPositionManager {
    struct Pos {
        int24 lower;
        int24 upper;
        uint128 liquidity;
        uint128 owed0;
        uint128 owed1;
    }

    address public factory;
    address public nft = address(0xBEEF);
    MockPool public pool;
    uint256 public nextSerial = 1;
    uint256 public requiredFee;
    mapping(uint256 => Pos) public pos;
    mapping(uint256 => address) public ownerOf;

    constructor(address f, MockPool p, uint256 feeTinybars) {
        factory = f;
        pool = p;
        requiredFee = feeTinybars;
    }

    function positions(
        uint256 sn
    ) external view returns (address, address, uint24, int24, int24, uint128, uint256, uint256, uint128, uint128) {
        Pos memory q = pos[sn];
        return (pool.token0(), pool.token1(), pool.fee(), q.lower, q.upper, q.liquidity, 0, 0, q.owed0, q.owed1);
    }

    function mint(
        INPM.MintParams calldata p
    ) external payable returns (uint256 sn, uint128 liq, uint256 a0, uint256 a1) {
        require(msg.value >= requiredFee, "MF");
        sn = nextSerial++;
        ownerOf[sn] = p.recipient;
        pos[sn].lower = p.tickLower;
        pos[sn].upper = p.tickUpper;
        (liq, a0, a1) = _add(sn, p.amount0Desired, p.amount1Desired);
    }

    function increaseLiquidity(
        INPM.IncreaseLiquidityParams calldata p
    ) external payable returns (uint128 liq, uint256 a0, uint256 a1) {
        require(msg.value >= requiredFee, "MF");
        (liq, a0, a1) = _add(p.tokenSN, p.amount0Desired, p.amount1Desired);
    }

    function decreaseLiquidity(
        INPM.DecreaseLiquidityParams calldata p
    ) external payable returns (uint256 a0, uint256 a1) {
        require(ownerOf[p.tokenSN] == msg.sender, "not authorized");
        Pos storage q = pos[p.tokenSN];
        (a0, a1) = RangeMath.amountsForLiquidity(pool.sqrtPriceX96(), q.lower, q.upper, p.liquidity);
        q.liquidity -= p.liquidity;
        q.owed0 += uint128(a0);
        q.owed1 += uint128(a1);
    }

    function collect(INPM.CollectParams calldata p) external payable returns (uint256 a0, uint256 a1) {
        require(ownerOf[p.tokenSN] == msg.sender, "not authorized");
        Pos storage q = pos[p.tokenSN];
        (a0, a1) = (q.owed0, q.owed1);
        (q.owed0, q.owed1) = (0, 0);
        _pay(pool.token0(), p.recipient, a0);
        _pay(pool.token1(), p.recipient, a1);
    }

    /// A real pool's reserves change as traders swap; the mock mints any shortfall to stand in for them.
    function _pay(address token, address to, uint256 amount) internal {
        if (amount == 0) return;
        uint256 bal = IERC20(token).balanceOf(address(this));
        if (bal < amount) MockToken(token).mint(address(this), amount - bal);
        IERC20(token).transfer(to, amount);
    }

    /// Test hook: simulate swap fees earned by a position.
    function accrueFees(uint256 sn, uint128 f0, uint128 f1) external {
        MockToken(pool.token0()).mint(address(this), f0);
        MockToken(pool.token1()).mint(address(this), f1);
        pos[sn].owed0 += f0;
        pos[sn].owed1 += f1;
    }

    function _add(uint256 sn, uint256 d0, uint256 d1) internal returns (uint128 liq, uint256 a0, uint256 a1) {
        Pos storage q = pos[sn];
        uint160 sp = pool.sqrtPriceX96();
        uint160 sa = TickMath.getSqrtPriceAtTick(q.lower);
        uint160 sb = TickMath.getSqrtPriceAtTick(q.upper);
        liq = _liquidityForAmounts(sp, sa, sb, d0, d1);
        require(liq > 0, "zero liquidity");
        if (sp < sb) a0 = SqrtPriceMath.getAmount0Delta(sp > sa ? sp : sa, sb, liq, true);
        if (sp > sa) a1 = SqrtPriceMath.getAmount1Delta(sa, sp < sb ? sp : sb, liq, true);
        q.liquidity += liq;
        if (a0 > 0) IERC20(pool.token0()).transferFrom(msg.sender, address(this), a0);
        if (a1 > 0) IERC20(pool.token1()).transferFrom(msg.sender, address(this), a1);
    }

    function _liquidityForAmounts(
        uint160 sp,
        uint160 sa,
        uint160 sb,
        uint256 a0,
        uint256 a1
    ) internal pure returns (uint128) {
        uint256 q96 = 2 ** 96;
        if (sp <= sa) return uint128(FullMath.mulDiv(a0, FullMath.mulDiv(sa, sb, q96), sb - sa));
        if (sp >= sb) return uint128(FullMath.mulDiv(a1, q96, sb - sa));
        uint256 l0 = FullMath.mulDiv(a0, FullMath.mulDiv(sp, sb, q96), sb - sp);
        uint256 l1 = FullMath.mulDiv(a1, q96, sp - sa);
        return uint128(l0 < l1 ? l0 : l1);
    }
}

contract MockSwapRouter {
    address public factory;
    MockPool public pool;

    constructor(address f, MockPool p) {
        factory = f;
        pool = p;
    }

    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    /// Fills at the pool's spot price minus the fee tier. No price impact.
    function exactInputSingle(ExactInputSingleParams calldata p) external payable returns (uint256 out) {
        IERC20(p.tokenIn).transferFrom(msg.sender, address(this), p.amountIn);
        uint256 net = (p.amountIn * (1_000_000 - p.fee)) / 1_000_000;
        out = p.tokenIn == pool.token0()
            ? RangeMath.token0ToToken1(net, pool.sqrtPriceX96())
            : RangeMath.token1ToToken0(net, pool.sqrtPriceX96());
        require(out >= p.amountOutMinimum, "Too little received");
        MockToken(p.tokenOut).mint(p.recipient, out);
    }
}
