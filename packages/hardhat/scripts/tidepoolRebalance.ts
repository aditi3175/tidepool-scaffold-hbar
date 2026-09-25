/**
 * Sends rebalance() to an explicitly named Tidepool vault after read-only preflight checks, then verifies the
 * result. Meant for the narrow test vault ("TidepoolVaultNarrow").
 *
 *   TIDEPOOL_VAULT                   deployment name (required; there is no default)
 *   ALLOW_MAIN_VAULT_REBALANCE=true  required to target the main "TidepoolVault" deployment
 *
 * Preflight (no transaction): initialized, a position exists, cooldown elapsed, TWAP outside the range,
 * |spot - TWAP| <= maxTwapDeviation. If any check fails, nothing is sent.
 *
 * Gas: fixed 8,000,000. rebalance() mints a new SaucerSwap LP NFT, and Hedera's eth_call/eth_estimateGas
 * simulation returns INVALID_NFT_ID for that mint even when it succeeds on-chain, so it cannot be estimated.
 * Observed first-position compound (the same mint path) used 5,128,563 gas.
 *
 * Run (PowerShell): $env:TIDEPOOL_VAULT="TidepoolVaultNarrow"; node .yarn/releases/yarn-3.2.3.cjs hardhat:rebalance
 */
import hre from "hardhat";
import { TINYBAR_TO_WEIBAR, confirm, hashscan, hederaIdOf, rangeAround, requireEnv } from "./tidepoolScriptUtils";

const MAIN_VAULT = "TidepoolVault";
const REBALANCE_GAS_LIMIT = 8_000_000n;
const FEE_HEADROOM_TINYBARS = 100_000_000n; // 1 HBAR on top of the position fee; the vault refunds the surplus
const POSITION_MANAGER_ABI = [
  "function positions(uint256) view returns (address,address,uint24,int24 tickLower,int24 tickUpper,uint128 liquidity,uint256,uint256,uint128,uint128)",
];

async function main() {
  if (hre.network.name !== "hederaTestnet") throw new Error("Run with --network hederaTestnet");
  const vaultName = requireEnv("TIDEPOOL_VAULT");
  const { ethers, deployments } = hre;

  const vaultAddress = (await deployments.get(vaultName)).address;
  const mainAddress = (await deployments.getOrNull(MAIN_VAULT))?.address;
  const isMain = vaultName === MAIN_VAULT || vaultAddress.toLowerCase() === mainAddress?.toLowerCase();
  if (isMain && process.env.ALLOW_MAIN_VAULT_REBALANCE !== "true") {
    throw new Error(
      `${vaultName} is the main vault. Refusing to rebalance it without ALLOW_MAIN_VAULT_REBALANCE=true. Nothing was sent.`,
    );
  }

  const [signer] = await ethers.getSigners();
  const vault = await ethers.getContractAt("TidepoolVault", vaultAddress, signer);
  const manager = new ethers.Contract(await vault.positionManager(), POSITION_MANAGER_ABI, signer);
  const nft = new ethers.Contract(
    await vault.positionNft(),
    ["function ownerOf(uint256) view returns (address)"],
    signer,
  );
  const vaultId = await hederaIdOf(vaultAddress);

  // ---- read-only preflight -------------------------------------------------------------------------------
  const failures: string[] = [];
  if ((await vault.shareToken()) === ethers.ZeroAddress) failures.push("vault is not initialized");
  const oldSerial: bigint = await vault.positionSerial();
  if (oldSerial === 0n) failures.push("vault has no position yet (run compound first)");
  const [lower, upper, spacing, halfWidth, maxDeviation, cooldown, lastRebalance] = await Promise.all([
    vault.tickLower(),
    vault.tickUpper(),
    vault.tickSpacing(),
    vault.halfWidth(),
    vault.maxTwapDeviation(),
    vault.rebalanceCooldown(),
    vault.lastRebalance(),
  ]).then(values => values.map(Number));
  const now = (await ethers.provider.getBlock("latest"))!.timestamp;
  const readyAt = lastRebalance + cooldown;
  if (now < readyAt) failures.push(`cooldown active for another ${readyAt - now} s`);

  let spot = NaN;
  let twap = NaN;
  try {
    const state = await vault.getPriceState();
    spot = Number(state[0]);
    twap = Number(state[1]);
  } catch (error) {
    failures.push(`pool TWAP unavailable: ${(error as Error).message}`);
  }
  if (!Number.isNaN(twap)) {
    if (twap >= lower && twap < upper) failures.push(`TWAP ${twap} is still inside [${lower}, ${upper})`);
    if (Math.abs(spot - twap) > maxDeviation) {
      failures.push(`|spot - TWAP| = ${Math.abs(spot - twap)} exceeds maxTwapDeviation ${maxDeviation}`);
    }
  }

  const [newLower, newUpper] = Number.isNaN(twap) ? [NaN, NaN] : rangeAround(twap, spacing, halfWidth);
  const feeTinybars: bigint = await vault.quoteMintFee.staticCall();
  const value = (feeTinybars + FEE_HEADROOM_TINYBARS) * TINYBAR_TO_WEIBAR;

  console.log(`vault: ${vaultName} at ${vaultAddress} (${vaultId})`);
  console.log(`current NFT serial: ${oldSerial}, range [${lower}, ${upper})`);
  console.log(`spot tick: ${spot}, TWAP tick: ${twap}, max deviation: ${maxDeviation}`);
  console.log(
    `cooldown: ${cooldown} s, last rebalance ${lastRebalance}, ${now >= readyAt ? "elapsed" : `ready at ${readyAt}`}`,
  );
  console.log(`expected new range: [${newLower}, ${newUpper})`);
  console.log(
    `quoteMintFee(): ${ethers.formatUnits(feeTinybars, 8)} HBAR; msg.value: ${ethers.formatEther(value)} HBAR (surplus refunded)`,
  );
  console.log(`gas limit: ${REBALANCE_GAS_LIMIT} (fixed; see the note at the top of this file)`);

  if (failures.length > 0) {
    console.log("\nPreflight FAILED - nothing was sent:");
    for (const f of failures) console.log(`  - ${f}`);
    process.exitCode = 1;
    return;
  }
  console.log("\nPreflight passed.");
  if (!(await confirm("Send rebalance()? Type 'yes' to continue: "))) {
    console.log("Aborted. Nothing was sent.");
    return;
  }

  // ---- send ------------------------------------------------------------------------------------------------
  const tx = await vault.rebalance({ value, gasLimit: REBALANCE_GAS_LIMIT });
  console.log(`rebalance sent: ${hashscan(tx.hash)}`);
  const receipt = await tx.wait();
  console.log(`rebalance mined: status ${receipt!.status}, gas used ${receipt!.gasUsed}`);

  // ---- verify ----------------------------------------------------------------------------------------------
  const newSerial: bigint = await vault.positionSerial();
  const [gotLower, gotUpper] = [Number(await vault.tickLower()), Number(await vault.tickUpper())];
  const newLiquidity: bigint = (await manager.positions(newSerial)).liquidity;
  const oldLiquidity: bigint = (await manager.positions(oldSerial)).liquidity;
  const oldOwner = await hederaIdOf(await nft.ownerOf(oldSerial));
  const newOwner = await hederaIdOf(await nft.ownerOf(newSerial));

  console.log(`new position serial: ${newSerial}, range [${gotLower}, ${gotUpper}), liquidity ${newLiquidity}`);
  console.log(`old NFT ${oldSerial}: liquidity ${oldLiquidity}, owner ${oldOwner}`);
  console.log(`new NFT ${newSerial}: owner ${newOwner}`);

  // The vault centres on the TWAP at execution time, which can differ slightly from the preflight read.
  const event = receipt!.logs
    .map(log => {
      try {
        return vault.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find(parsed => parsed?.name === "Rebalance");
  const broken: string[] = [];
  if (!event) broken.push("no Rebalance event in the receipt");
  const executedTwap = event ? Number(event.args.twapTick) : NaN;
  const [eventLower, eventUpper] = rangeAround(executedTwap, spacing, halfWidth);
  console.log(`executed at TWAP tick ${executedTwap} -> range [${eventLower}, ${eventUpper})`);
  if (eventLower !== newLower || eventUpper !== newUpper) {
    console.log(`note: preflight expected [${newLower}, ${newUpper}); the TWAP moved between preflight and execution`);
  }
  if (newSerial === oldSerial) broken.push("positionSerial did not change");
  if (event && BigInt(event.args.newPositionSerial) !== newSerial)
    broken.push("event serial differs from positionSerial");
  if (gotLower !== eventLower || gotUpper !== eventUpper) {
    broken.push(`stored range [${gotLower}, ${gotUpper}) differs from rangeAround(TWAP ${executedTwap})`);
  }
  if (newLiquidity === 0n) broken.push("new position has zero liquidity");
  if (oldLiquidity !== 0n) broken.push(`old NFT ${oldSerial} still has liquidity ${oldLiquidity}`);
  if (oldOwner !== vaultId) broken.push(`old NFT owner ${oldOwner} is not the vault ${vaultId}`);
  if (newOwner !== vaultId) broken.push(`new NFT owner ${newOwner} is not the vault ${vaultId}`);
  if (broken.length > 0) {
    throw new Error(`Post-rebalance checks FAILED:\n  - ${broken.join("\n  - ")}`);
  }
  console.log("Post-rebalance checks passed.");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
