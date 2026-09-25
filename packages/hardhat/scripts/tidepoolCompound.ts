/**
 * Sends only compound() to the live testnet vault (opens the first position when none exists).
 *
 * The gas limit is fixed because compound() cannot be pre-checked with eth_estimateGas / eth_call on Hedera:
 * SaucerSwap's position manager mints the LP NFT through HTS and then transfers that serial, and the
 * network's simulation returns INVALID_NFT_ID for that sequence even for mints that succeed on-chain.
 *
 * Run: npm run hardhat:compound   (wraps: ts-node scripts/runScriptWithPK.ts scripts/tidepoolCompound.ts --network hederaTestnet)
 *      TIDEPOOL_VAULT selects the hardhat-deploy deployment name (default "TidepoolVault", the main vault).
 */
import hre from "hardhat";
import { TINYBAR_TO_WEIBAR, hashscan } from "./tidepoolScriptUtils";

const COMPOUND_GAS_LIMIT = 8_000_000n;
const FEE_HEADROOM_TINYBARS = 100_000_000n; // 1 HBAR on top of the position fee; the vault refunds the surplus

async function main() {
  if (hre.network.name !== "hederaTestnet") throw new Error("Run with --network hederaTestnet");
  const { ethers, deployments } = hre;
  const [signer] = await ethers.getSigners();
  const vaultName = process.env.TIDEPOOL_VAULT ?? "TidepoolVault";
  const vault = await ethers.getContractAt("TidepoolVault", (await deployments.get(vaultName)).address, signer);
  console.log(`vault: ${vaultName} at ${await vault.getAddress()}`);

  const feeTinybars = await vault.quoteMintFee.staticCall();
  const value = (feeTinybars + FEE_HEADROOM_TINYBARS) * TINYBAR_TO_WEIBAR;
  console.log(`position serial before: ${await vault.positionSerial()}`);
  console.log(`position fee: ${ethers.formatUnits(feeTinybars, 8)} HBAR, sending ${ethers.formatEther(value)} HBAR`);
  console.log(`gas limit: ${COMPOUND_GAS_LIMIT} (fixed; see the note at the top of this file)`);

  const tx = await vault.compound({ value, gasLimit: COMPOUND_GAS_LIMIT });
  console.log(`compound sent: ${hashscan(tx.hash)}`);
  const receipt = await tx.wait();
  console.log(`compound mined: status ${receipt!.status}, gas used ${receipt!.gasUsed}`);
  console.log(
    `position serial: ${await vault.positionSerial()}, range [${await vault.tickLower()}, ${await vault.tickUpper()})`,
  );
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
