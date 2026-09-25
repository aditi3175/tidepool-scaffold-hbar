/**
 * Withdraws a slice of the deployer's vault shares from the live testnet vault (default 10%).
 *
 * Flow: show the plan (preview from getTotalAmounts) -> ask for confirmation -> approve the vault to pull the
 * shares (only if the allowance is short) -> exact preview with a static withdraw() call -> send withdraw()
 * with minimum amounts 1% under that preview. Both transactions get eth_estimateGas x 1.3; if estimation
 * fails the script stops instead of guessing a gas limit. Unlike a position mint, withdraw() simulates fine
 * on Hedera once the share allowance exists.
 *
 * Run: npm run hardhat:withdraw   (wraps: ts-node scripts/runScriptWithPK.ts scripts/tidepoolWithdraw.ts --network hederaTestnet)
 *      WITHDRAW_BPS=1000 by default (10% of your shares, in basis points)
 */
import hre from "hardhat";
import { createInterface } from "readline/promises";

const SHARE_DECIMALS = 8;
const SLIPPAGE_BPS = 100n; // min amounts are 1% below the exact preview
const HEDERA_MAX_GAS = 15_000_000n; // per-transaction gas limit on Hedera
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
];
const POSITION_MANAGER_ABI = [
  "function positions(uint256) view returns (address,address,uint24,int24,int24,uint128 liquidity,uint256,uint256,uint128 tokensOwed0,uint128 tokensOwed1)",
];

const hashscan = (hash: string) => `https://hashscan.io/testnet/transaction/${hash}`;

async function confirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(question);
  rl.close();
  return answer.trim().toLowerCase() === "yes";
}

async function gasLimitFor(label: string, estimate: Promise<bigint>): Promise<bigint> {
  let estimated: bigint;
  try {
    estimated = await estimate;
  } catch (error) {
    throw new Error(`${label}: eth_estimateGas failed, so nothing was sent. Cause: ${(error as Error).message}`);
  }
  const limit = (estimated * 130n) / 100n;
  const capped = limit > HEDERA_MAX_GAS ? HEDERA_MAX_GAS : limit;
  console.log(`${label}: estimated ${estimated} gas, sending with limit ${capped}`);
  return capped;
}

async function main() {
  if (hre.network.name !== "hederaTestnet") throw new Error("Run with --network hederaTestnet");
  const { ethers, deployments } = hre;
  const [signer] = await ethers.getSigners();
  const vault = await ethers.getContractAt("TidepoolVault", (await deployments.get("TidepoolVault")).address, signer);
  const vaultAddress = await vault.getAddress();

  const [token0, token1, shareTokenAddress, managerAddress] = await Promise.all([
    vault.token0(),
    vault.token1(),
    vault.shareToken(),
    vault.positionManager(),
  ]);
  const t0 = new ethers.Contract(token0, ERC20_ABI, signer);
  const t1 = new ethers.Contract(token1, ERC20_ABI, signer);
  const shareToken = new ethers.Contract(shareTokenAddress, ERC20_ABI, signer);
  const manager = new ethers.Contract(managerAddress, POSITION_MANAGER_ABI, signer);
  const [symbol0, symbol1, decimals0, decimals1] = await Promise.all([
    new ethers.Contract(token0, ["function symbol() view returns (string)"], signer).symbol(),
    new ethers.Contract(token1, ["function symbol() view returns (string)"], signer).symbol(),
    new ethers.Contract(token0, ["function decimals() view returns (uint8)"], signer).decimals(),
    new ethers.Contract(token1, ["function decimals() view returns (uint8)"], signer).decimals(),
  ]);

  const printState = async (label: string) => {
    const serial = await vault.positionSerial();
    const liquidity = serial === 0n ? 0n : (await manager.positions(serial)).liquidity;
    console.log(`--- ${label}`);
    console.log(`  your shares: ${ethers.formatUnits(await shareToken.balanceOf(signer.address), SHARE_DECIMALS)}`);
    console.log(`  total shares: ${ethers.formatUnits(await vault.totalShares(), SHARE_DECIMALS)}`);
    console.log(`  position: serial ${serial}, liquidity ${liquidity}`);
    console.log(
      `  vault idle: ${ethers.formatUnits(await t0.balanceOf(vaultAddress), decimals0)} ${symbol0}, ` +
        `${ethers.formatUnits(await t1.balanceOf(vaultAddress), decimals1)} ${symbol1}`,
    );
    console.log(
      `  your wallet: ${ethers.formatUnits(await t0.balanceOf(signer.address), decimals0)} ${symbol0}, ` +
        `${ethers.formatUnits(await t1.balanceOf(signer.address), decimals1)} ${symbol1}`,
    );
  };

  const bps = BigInt(process.env.WITHDRAW_BPS ?? "1000");
  if (bps <= 0n || bps > 10_000n) throw new Error("WITHDRAW_BPS must be between 1 and 10000");
  const userShares: bigint = await shareToken.balanceOf(signer.address);
  const shares = (userShares * bps) / 10_000n;
  if (shares === 0n) throw new Error("You have no vault shares to withdraw");

  await printState("before");
  const supply = await vault.totalShares();
  const [total0, total1] = await vault.getTotalAmounts();
  console.log(`\nPlan: withdraw ${ethers.formatUnits(shares, SHARE_DECIMALS)} shares (${Number(bps) / 100}% of yours)`);
  console.log(
    `  rough preview (getTotalAmounts, excludes uncollected fees): ` +
      `${ethers.formatUnits((total0 * shares) / supply, decimals0)} ${symbol0} + ` +
      `${ethers.formatUnits((total1 * shares) / supply, decimals1)} ${symbol1}`,
  );
  console.log(`  receiver: ${signer.address}`);

  if (!(await confirm("Send the approval (if needed) and the withdrawal? Type 'yes' to continue: "))) {
    console.log("Aborted. Nothing was sent.");
    return;
  }

  const allowance: bigint = await shareToken.allowance(signer.address, vaultAddress);
  if (allowance < shares) {
    const gasLimit = await gasLimitFor("approve shares", shareToken.approve.estimateGas(vaultAddress, shares));
    const approveTx = await shareToken.approve(vaultAddress, shares, { gasLimit });
    console.log(`approve sent: ${hashscan(approveTx.hash)}`);
    const approveReceipt = await approveTx.wait();
    console.log(`approve mined: status ${approveReceipt!.status}, gas used ${approveReceipt!.gasUsed}`);
  } else {
    console.log(
      `share allowance already covers ${ethers.formatUnits(shares, SHARE_DECIMALS)} shares; no approval sent`,
    );
  }

  // Exact preview: simulate the real call (collect, remove liquidity, collect) against current state.
  const [preview0, preview1] = await vault.withdraw.staticCall(shares, 0, 0, signer.address);
  const min0 = (preview0 * (10_000n - SLIPPAGE_BPS)) / 10_000n;
  const min1 = (preview1 * (10_000n - SLIPPAGE_BPS)) / 10_000n;
  console.log(
    `exact preview: ${ethers.formatUnits(preview0, decimals0)} ${symbol0} + ${ethers.formatUnits(preview1, decimals1)} ${symbol1}`,
  );
  console.log(
    `minimums (1% below): ${ethers.formatUnits(min0, decimals0)} ${symbol0}, ${ethers.formatUnits(min1, decimals1)} ${symbol1}`,
  );

  if (!(await confirm("Proceed with the withdrawal? Type 'yes' to continue: "))) {
    console.log("Aborted before withdraw(). Any share approval sent above stays in place for this exact amount.");
    return;
  }

  const withdrawGas = await gasLimitFor("withdraw", vault.withdraw.estimateGas(shares, min0, min1, signer.address));
  const tx = await vault.withdraw(shares, min0, min1, signer.address, { gasLimit: withdrawGas });
  console.log(`withdraw sent: ${hashscan(tx.hash)}`);
  const receipt = await tx.wait();
  console.log(`withdraw mined: status ${receipt!.status}, gas used ${receipt!.gasUsed}`);

  await printState("after");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
