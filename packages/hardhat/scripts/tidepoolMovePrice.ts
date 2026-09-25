/**
 * One-way swap on the vault's SaucerSwap V2 pool, used to move the SHARED WHBAR/SAUCE testnet pool price so the
 * narrow test vault's TWAP leaves its range. It trades against every LP in that pool (including the main vault,
 * which is only affected through the pool price; no call is made to it).
 *
 *   DIRECTION=down  sells token0 (WHBAR) for token1 (SAUCE): the tick goes DOWN
 *   DIRECTION=up    sells token1 (SAUCE) for token0 (WHBAR): the tick goes UP
 *   AMOUNT          amount of the input token, in whole tokens (required)
 *   TIDEPOOL_VAULT  deployment whose pool/router/range are used (default "TidepoolVault"; read-only)
 *   WRAP_HBAR_IF_NEEDED=true  allow wrapping the WHBAR shortfall through SaucerSwap's WhbarHelper (asks first)
 *
 * The swap is quoted with SaucerSwap's QuoterV2 before anything is sent, then needs an explicit "yes".
 * Run (PowerShell): $env:TIDEPOOL_VAULT="TidepoolVaultNarrow"; $env:DIRECTION="down"; $env:AMOUNT="122"
 *                   node .yarn/releases/yarn-3.2.3.cjs hardhat:move-price
 */
import hre from "hardhat";
import { TINYBAR_TO_WEIBAR, confirm, gasLimitFor, hashscan, requireEnv, tickAtSqrtPrice } from "./tidepoolScriptUtils";

const QUOTER_V2 = "0x00000000000000000000000000000000001535b2"; // SaucerSwap V2 QuoterV2, testnet 0.0.1390002
const WHBAR_TOKEN = "0x0000000000000000000000000000000000003aD2"; // testnet 0.0.15058
const WHBAR_HELPER = "0x000000000000000000000000000000000050a8a7"; // testnet 0.0.5286055 (never call the WHBAR contract)
const SLIPPAGE_BPS = 100n; // amountOutMinimum is 1% below the quote
const TOKEN_ABI = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
];
const ROUTER_ABI = [
  "function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96)) payable returns (uint256)",
];
const QUOTER_ABI = [
  "function quoteExactInputSingle((address tokenIn,address tokenOut,uint256 amountIn,uint24 fee,uint160 sqrtPriceLimitX96)) returns (uint256 amountOut,uint160 sqrtPriceX96After,uint32 initializedTicksCrossed,uint256 gasEstimate)",
];
const POOL_ABI = ["function slot0() view returns (uint160,int24,uint16,uint16,uint16,uint8,bool)"];

async function main() {
  if (hre.network.name !== "hederaTestnet") throw new Error("Run with --network hederaTestnet");
  const direction = requireEnv("DIRECTION").toLowerCase();
  if (direction !== "down" && direction !== "up")
    throw new Error('DIRECTION must be "down" or "up" (nothing was sent).');
  const amountInput = requireEnv("AMOUNT");
  const vaultName = process.env.TIDEPOOL_VAULT ?? "TidepoolVault";

  const { ethers, deployments } = hre;
  const [signer] = await ethers.getSigners();
  const vault = await ethers.getContractAt("TidepoolVault", (await deployments.get(vaultName)).address, signer);
  const [poolAddress, routerAddress, fee, token0, token1] = await Promise.all([
    vault.pool(),
    vault.swapRouter(),
    vault.fee(),
    vault.token0(),
    vault.token1(),
  ]);
  const [tokenIn, tokenOut] = direction === "down" ? [token0, token1] : [token1, token0];
  const tIn = new ethers.Contract(tokenIn, TOKEN_ABI, signer);
  const tOut = new ethers.Contract(tokenOut, TOKEN_ABI, signer);
  const [symbolIn, symbolOut, decimalsIn, decimalsOut] = await Promise.all([
    tIn.symbol(),
    tOut.symbol(),
    tIn.decimals(),
    tOut.decimals(),
  ]);
  const amountIn = ethers.parseUnits(amountInput, decimalsIn);
  const pool = new ethers.Contract(poolAddress, POOL_ABI, signer);
  const quoter = new ethers.Contract(QUOTER_V2, QUOTER_ABI, signer);

  const spotBefore = Number((await pool.slot0())[1]);
  const quote = await quoter.quoteExactInputSingle.staticCall({
    tokenIn,
    tokenOut,
    amountIn,
    fee,
    sqrtPriceLimitX96: 0,
  });
  const tickAfter = tickAtSqrtPrice(quote.sqrtPriceX96After);
  const minOut = (quote.amountOut * (10_000n - SLIPPAGE_BPS)) / 10_000n;
  const [lower, upper] = [Number(await vault.tickLower()), Number(await vault.tickUpper())];

  console.log(`reference vault: ${vaultName} at ${await vault.getAddress()} (read-only), range [${lower}, ${upper})`);
  console.log(`pool: ${poolAddress}   router: ${routerAddress}   fee tier: ${fee}`);
  console.log(`swap: ${amountInput} ${symbolIn} -> ~${ethers.formatUnits(quote.amountOut, decimalsOut)} ${symbolOut}`);
  console.log(
    `spot tick: ${spotBefore} -> ~${tickAfter} (${tickAfter - spotBefore} ticks), ${quote.initializedTicksCrossed} initialized ticks crossed`,
  );
  console.log(
    `after the swap the reference vault would be ${tickAfter >= lower && tickAfter < upper ? "IN" : "OUT OF"} range (spot)`,
  );
  console.log(`amountOutMinimum (1% below quote): ${ethers.formatUnits(minOut, decimalsOut)} ${symbolOut}`);
  console.log(
    "WARNING: this trades on the SHARED SaucerSwap WHBAR/SAUCE testnet pool. It moves the price for every LP and\n" +
      "trader in that pool, including the main Tidepool vault's position, until the price is moved back.",
  );

  const balance: bigint = await tIn.balanceOf(signer.address);
  if (balance < amountIn) {
    const shortfall = amountIn - balance;
    const isWhbar = tokenIn.toLowerCase() === WHBAR_TOKEN.toLowerCase();
    console.log(
      `Insufficient ${symbolIn}: have ${ethers.formatUnits(balance, decimalsIn)}, need ${amountInput}, ` +
        `short by ${ethers.formatUnits(shortfall, decimalsIn)} ${symbolIn}.`,
    );
    if (!isWhbar)
      throw new Error(`Acquire ${ethers.formatUnits(shortfall, decimalsIn)} more ${symbolIn} first. Nothing was sent.`);
    // WHBAR has 8 decimals, like HBAR: 1 WHBAR is wrapped from 1 HBAR.
    const wrapWeibar = shortfall * TINYBAR_TO_WEIBAR;
    console.log(
      `That requires wrapping ${ethers.formatEther(wrapWeibar)} HBAR into WHBAR via SaucerSwap's WhbarHelper.`,
    );
    if (process.env.WRAP_HBAR_IF_NEEDED !== "true") {
      throw new Error("Set WRAP_HBAR_IF_NEEDED=true to allow wrapping, or wrap first. Nothing was sent.");
    }
    if (!(await confirm(`Wrap ${ethers.formatEther(wrapWeibar)} HBAR into WHBAR now? Type 'yes' to continue: `))) {
      console.log("Aborted. Nothing was sent.");
      return;
    }
    const helper = new ethers.Contract(WHBAR_HELPER, ["function deposit() payable"], signer);
    const wrapGas = await gasLimitFor("wrap HBAR", helper.deposit.estimateGas({ value: wrapWeibar }));
    const wrapTx = await helper.deposit({ value: wrapWeibar, gasLimit: wrapGas });
    console.log(`wrap sent: ${hashscan(wrapTx.hash)}`);
    console.log(`wrap mined: status ${(await wrapTx.wait())!.status}`);
  }

  if (!(await confirm(`Send this ${direction} swap on the shared pool? Type 'yes' to continue: `))) {
    console.log("Aborted before the swap. Any wrap sent above stays in your wallet as WHBAR.");
    return;
  }

  if ((await tIn.allowance(signer.address, routerAddress)) < amountIn) {
    const gasLimit = await gasLimitFor(
      `approve ${symbolIn} to router`,
      tIn.approve.estimateGas(routerAddress, amountIn),
    );
    const tx = await tIn.approve(routerAddress, amountIn, { gasLimit });
    console.log(`approve sent: ${hashscan(tx.hash)}`);
    console.log(`approve mined: status ${(await tx.wait())!.status}`);
  }

  const router = new ethers.Contract(routerAddress, ROUTER_ABI, signer);
  const params = {
    tokenIn,
    tokenOut,
    fee,
    recipient: signer.address,
    deadline: Math.floor(Date.now() / 1000) + 300,
    amountIn,
    amountOutMinimum: minOut,
    sqrtPriceLimitX96: 0,
  };
  const gasLimit = await gasLimitFor("swap", router.exactInputSingle.estimateGas(params));
  const tx = await router.exactInputSingle(params, { gasLimit });
  console.log(`swap sent: ${hashscan(tx.hash)}`);
  const receipt = await tx.wait();
  console.log(`swap mined: status ${receipt!.status}, gas used ${receipt!.gasUsed}`);

  const [spot, twap, inRange] = await vault.getPriceState();
  console.log(`pool now: spot ${spot}, TWAP ${twap} (the TWAP follows over ${await vault.twapWindow()} s)`);
  console.log(`${vaultName}: range [${lower}, ${upper}), TWAP ${inRange ? "IN" : "OUT OF"} range`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
