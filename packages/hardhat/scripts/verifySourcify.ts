/**
 * Verifies a deployed contract on Sourcify with the APIv2 endpoint (HashScan reads Sourcify).
 * hardhat-verify 2.1.x still calls Sourcify's retired v1 routes, which now return 404.
 *
 * Usage: npx hardhat run scripts/verifySourcify.ts --network hederaTestnet
 *        (CONTRACT=TidepoolVault by default; reads the address from hardhat-deploy)
 */
import hre from "hardhat";

const SOURCIFY = "https://sourcify.dev/server";

async function main() {
  const contractName = process.env.CONTRACT ?? "TidepoolVault";
  const deployment = await hre.deployments.get(contractName);
  const chainId = (await hre.ethers.provider.getNetwork()).chainId.toString();

  const artifact = await hre.artifacts.readArtifact(contractName);
  const fqn = `${artifact.sourceName}:${artifact.contractName}`;
  const buildInfo = await hre.artifacts.getBuildInfo(fqn);
  if (!buildInfo) throw new Error(`No build info for ${fqn}. Run npm run hardhat:compile first.`);

  const body = {
    stdJsonInput: buildInfo.input,
    compilerVersion: buildInfo.solcLongVersion,
    contractIdentifier: fqn,
    creationTransactionHash: deployment.transactionHash,
  };
  const submit = await fetch(`${SOURCIFY}/v2/verify/${chainId}/${deployment.address}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const submitted = await submit.json();
  if (submit.status === 409) {
    console.log(`Already verified: ${deployment.address}`);
    return;
  }
  if (submit.status !== 202)
    throw new Error(`Sourcify rejected the request (${submit.status}): ${JSON.stringify(submitted)}`);

  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise(r => setTimeout(r, 2000));
    const job = await (await fetch(`${SOURCIFY}/v2/verify/${submitted.verificationId}`)).json();
    if (!job.isJobCompleted) continue;
    if (job.error) throw new Error(`Verification failed: ${job.error.message}`);
    const network = chainId === "295" ? "mainnet" : "testnet";
    console.log(`Verified (${job.contract?.match}): https://hashscan.io/${network}/contract/${deployment.address}`);
    return;
  }
  throw new Error(`Timed out waiting for Sourcify job ${submitted.verificationId}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
