/**
 * Deposits EXACT token amounts into a chosen Tidepool vault. Unlike tidepoolSmoke.ts it never wraps HBAR,
 * never buys tokens and never deposits your whole balance.
 *
 * Flow: show the plan -> "yes" -> associate the vault's share token (only if needed) -> approve each token
 * for its exact amount (only if the allowance is short) -> exact share preview via a static deposit() call ->
 * second "yes" -> deposit(). Every transaction uses eth_estimateGas x 1.3 and stops if estimation fails.
 *
 * Run (PowerShell):
 *   $env:TIDEPOOL_VAULT="TidepoolVaultNarrow"; $env:DEPOSIT0="2"; $env:DEPOSIT1="93"
 *   node .yarn/releases/yarn-3.2.3.cjs hardhat:deposit
 * DEPOSIT0 / DEPOSIT1 are in whole tokens of the vault's token0 / token1 (for WHBAR/SAUCE: WHBAR, SAUCE).
 * For a vault that already holds assets, the vault takes at most these amounts, in its current ratio.
 */
import hre from "hardhat";
import { confirm, gasLimitFor, hashscan, requireEnv } from "./tidepoolScriptUtils";

const SHARE_DECIMALS = 8;
const SLIPPAGE_BPS = 100n; // minShares is 1% below the exact preview
const TOKEN_ABI = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
  "function isAssociated() view returns (bool)",
  "function associate() returns (uint256)",
];

async function main() {
  if (hre.network.name !== "hederaTestnet") throw new Error("Run with --network hederaTestnet");
  const vaultName = requireEnv("TIDEPOOL_VAULT");
  const deposit0Input = requireEnv("DEPOSIT0");
  const deposit1Input = requireEnv("DEPOSIT1");

  const { ethers, deployments } = hre;
  const [signer] = await ethers.getSigners();
  const vault = await ethers.getContractAt("TidepoolVault", (await deployments.get(vaultName)).address, signer);
  const vaultAddress = await vault.getAddress();
  const shareTokenAddress = await vault.shareToken();
  if (shareTokenAddress === ethers.ZeroAddress) throw new Error(`${vaultName} is not initialized (nothing was sent).`);

  const t0 = new ethers.Contract(await vault.token0(), TOKEN_ABI, signer);
  const t1 = new ethers.Contract(await vault.token1(), TOKEN_ABI, signer);
  const shareToken = new ethers.Contract(shareTokenAddress, TOKEN_ABI, signer);
  const [symbol0, symbol1, decimals0, decimals1] = await Promise.all([
    t0.symbol(),
    t1.symbol(),
    t0.decimals(),
    t1.decimals(),
  ]);
  const amount0 = ethers.parseUnits(deposit0Input, decimals0);
  const amount1 = ethers.parseUnits(deposit1Input, decimals1);

  const printState = async (label: string) => {
    const [total0, total1] = await vault.getTotalAmounts();
    console.log(`--- ${label}`);
    console.log(
      `  vault: shares ${ethers.formatUnits(await vault.totalShares(), SHARE_DECIMALS)}, position serial ${await vault.positionSerial()}, ` +
        `holds ${ethers.formatUnits(total0, decimals0)} ${symbol0} + ${ethers.formatUnits(total1, decimals1)} ${symbol1}`,
    );
    console.log(
      `  your wallet: ${ethers.formatUnits(await t0.balanceOf(signer.address), decimals0)} ${symbol0}, ` +
        `${ethers.formatUnits(await t1.balanceOf(signer.address), decimals1)} ${symbol1}, ` +
        `${ethers.formatUnits(await shareToken.balanceOf(signer.address), SHARE_DECIMALS)} shares`,
    );
  };

  console.log(`vault: ${vaultName} at ${vaultAddress}`);
  await printState("before");
  const [have0, have1] = await Promise.all([t0.balanceOf(signer.address), t1.balanceOf(signer.address)]);
  if (have0 < amount0 || have1 < amount1) {
    throw new Error(
      `Insufficient balance: need ${deposit0Input} ${symbol0} and ${deposit1Input} ${symbol1}, ` +
        `have ${ethers.formatUnits(have0, decimals0)} ${symbol0} and ${ethers.formatUnits(have1, decimals1)} ${symbol1}. Nothing was sent.`,
    );
  }
  console.log(`\nPlan: deposit up to ${deposit0Input} ${symbol0} + ${deposit1Input} ${symbol1} into ${vaultName}`);
  if (!(await confirm("Send the association/approvals needed for this deposit? Type 'yes' to continue: "))) {
    console.log("Aborted. Nothing was sent.");
    return;
  }

  if (!(await shareToken.isAssociated())) {
    const gasLimit = await gasLimitFor("associate share token", shareToken.associate.estimateGas());
    const tx = await shareToken.associate({ gasLimit });
    console.log(`associate sent: ${hashscan(tx.hash)}`);
    console.log(`associate mined: status ${(await tx.wait())!.status}`);
  }
  for (const [token, amount, symbol] of [
    [t0, amount0, symbol0],
    [t1, amount1, symbol1],
  ] as const) {
    if (amount === 0n || (await token.allowance(signer.address, vaultAddress)) >= amount) continue;
    const gasLimit = await gasLimitFor(`approve ${symbol}`, token.approve.estimateGas(vaultAddress, amount));
    const tx = await token.approve(vaultAddress, amount, { gasLimit });
    console.log(`approve ${symbol} sent: ${hashscan(tx.hash)}`);
    console.log(`approve ${symbol} mined: status ${(await tx.wait())!.status}`);
  }

  const [previewShares, used0, used1] = await vault.deposit.staticCall(amount0, amount1, 0, signer.address);
  const minShares = (previewShares * (10_000n - SLIPPAGE_BPS)) / 10_000n;
  console.log(
    `exact preview: ${ethers.formatUnits(previewShares, SHARE_DECIMALS)} shares for ` +
      `${ethers.formatUnits(used0, decimals0)} ${symbol0} + ${ethers.formatUnits(used1, decimals1)} ${symbol1}; ` +
      `minShares ${ethers.formatUnits(minShares, SHARE_DECIMALS)}`,
  );
  if (!(await confirm("Proceed with the deposit? Type 'yes' to continue: "))) {
    console.log("Aborted before deposit(). Any association/approval sent above stays in place.");
    return;
  }

  const gasLimit = await gasLimitFor("deposit", vault.deposit.estimateGas(amount0, amount1, minShares, signer.address));
  const tx = await vault.deposit(amount0, amount1, minShares, signer.address, { gasLimit });
  console.log(`deposit sent: ${hashscan(tx.hash)}`);
  const receipt = await tx.wait();
  console.log(`deposit mined: status ${receipt!.status}, gas used ${receipt!.gasUsed}`);
  await printState("after");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
