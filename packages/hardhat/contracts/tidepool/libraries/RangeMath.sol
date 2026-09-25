// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { FullMath } from "@uniswap/v4-core/src/libraries/FullMath.sol";
import { SqrtPriceMath } from "@uniswap/v4-core/src/libraries/SqrtPriceMath.sol";
import { TickMath } from "@uniswap/v4-core/src/libraries/TickMath.sol";

import { ISaucerSwapV2Pool } from "../interfaces/ISaucerSwapV2.sol";

/// @title RangeMath
/// @notice Concentrated-liquidity helpers for Tidepool. Uses only the MIT-licensed
///         libraries from Uniswap v4-core. Nothing here is copied from GPL code.
library RangeMath {
    uint256 internal constant Q96 = 2 ** 96;

    error TwapUnavailable();

    /// @notice Arithmetic-mean tick over the last `window` seconds, read from the pool's own oracle.
    /// @dev Rounds towards negative infinity, the same convention Uniswap v3 uses for mean ticks.
    ///      Reverts with TwapUnavailable when the pool cannot answer (for example, when its
    ///      observation cardinality is too small, so observe() reverts with OLD()).
    function consultTwapTick(address pool, uint32 window) internal view returns (int24 meanTick) {
        uint32[] memory secondsAgos = new uint32[](2);
        secondsAgos[0] = window;
        secondsAgos[1] = 0;

        int56[] memory tickCumulatives;
        try ISaucerSwapV2Pool(pool).observe(secondsAgos) returns (int56[] memory tc, uint160[] memory) {
            tickCumulatives = tc;
        } catch {
            revert TwapUnavailable();
        }

        int56 delta = tickCumulatives[1] - tickCumulatives[0];
        int56 w = int56(uint56(window));
        meanTick = int24(delta / w);
        if (delta < 0 && (delta % w != 0)) meanTick--;
    }

    /// @notice Largest multiple of `spacing` that is <= tick.
    function floorToSpacing(int24 tick, int24 spacing) internal pure returns (int24) {
        int24 compressed = tick / spacing;
        if (tick < 0 && tick % spacing != 0) compressed--;
        return compressed * spacing;
    }

    /// @notice A range of +/- halfWidth ticks around `centerTick`, snapped to spacing and clamped to usable ticks.
    function rangeAround(
        int24 centerTick,
        int24 spacing,
        int24 halfWidth
    ) internal pure returns (int24 lower, int24 upper) {
        int24 center = floorToSpacing(centerTick, spacing);
        int24 minTick = TickMath.minUsableTick(spacing);
        int24 maxTick = TickMath.maxUsableTick(spacing);
        lower = center - halfWidth < minTick ? minTick : center - halfWidth;
        upper = center + halfWidth > maxTick ? maxTick : center + halfWidth;
    }

    /// @notice Token amounts held by `liquidity` in [tickLower, tickUpper) at price sqrtPriceX96 (rounded down).
    function amountsForLiquidity(
        uint160 sqrtPriceX96,
        int24 tickLower,
        int24 tickUpper,
        uint128 liquidity
    ) internal pure returns (uint256 amount0, uint256 amount1) {
        uint160 sqrtA = TickMath.getSqrtPriceAtTick(tickLower);
        uint160 sqrtB = TickMath.getSqrtPriceAtTick(tickUpper);
        if (sqrtPriceX96 <= sqrtA) {
            amount0 = SqrtPriceMath.getAmount0Delta(sqrtA, sqrtB, liquidity, false);
        } else if (sqrtPriceX96 < sqrtB) {
            amount0 = SqrtPriceMath.getAmount0Delta(sqrtPriceX96, sqrtB, liquidity, false);
            amount1 = SqrtPriceMath.getAmount1Delta(sqrtA, sqrtPriceX96, liquidity, false);
        } else {
            amount1 = SqrtPriceMath.getAmount1Delta(sqrtA, sqrtB, liquidity, false);
        }
    }

    /// @notice Value of `amount0` expressed in token1 units at sqrtPriceX96 (price = sqrtP^2 / 2^192).
    function token0ToToken1(uint256 amount0, uint160 sqrtPriceX96) internal pure returns (uint256) {
        return FullMath.mulDiv(FullMath.mulDiv(amount0, sqrtPriceX96, Q96), sqrtPriceX96, Q96);
    }

    /// @notice Value of `amount1` expressed in token0 units at sqrtPriceX96.
    function token1ToToken0(uint256 amount1, uint160 sqrtPriceX96) internal pure returns (uint256) {
        return FullMath.mulDiv(FullMath.mulDiv(amount1, Q96, sqrtPriceX96), Q96, sqrtPriceX96);
    }

    /// @notice How much to swap so that (balance0, balance1) matches the token ratio a position in
    ///         [tickLower, tickUpper) needs at sqrtPriceX96. Ignores the pool fee and price impact;
    ///         whatever is left over after the mint stays idle in the vault and is picked up by the next compound.
    /// @return zeroForOne True to sell token0 for token1, false to sell token1 for token0.
    /// @return amountIn Amount of the input token to sell (0 means no swap needed).
    function swapToRatio(
        uint256 balance0,
        uint256 balance1,
        uint160 sqrtPriceX96,
        int24 tickLower,
        int24 tickUpper
    ) internal pure returns (bool zeroForOne, uint256 amountIn) {
        // Token amounts for a reference 1e18 of liquidity give the ratio the range needs.
        (uint256 unit0, uint256 unit1) = amountsForLiquidity(sqrtPriceX96, tickLower, tickUpper, 1e18);
        uint256 unit0In1 = token0ToToken1(unit0, sqrtPriceX96);
        uint256 unitTotal = unit0In1 + unit1;
        if (unitTotal == 0) return (false, 0);

        uint256 totalIn1 = token0ToToken1(balance0, sqrtPriceX96) + balance1;
        uint256 target1 = FullMath.mulDiv(totalIn1, unit1, unitTotal);

        if (balance1 > target1) {
            return (false, balance1 - target1);
        }
        uint256 missing1 = target1 - balance1;
        return (true, token1ToToken0(missing1, sqrtPriceX96));
    }
}
