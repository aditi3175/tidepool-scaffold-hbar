/**
 * Verifies a deployed contract on Sourcify with the APIv2 endpoint (HashScan reads Sourcify).
 * hardhat-verify 2.1.x still calls Sourcify's retired v1 routes, which now return 404.
 *
 * Usage: npx hardhat run scripts/verifySourcify.ts --network hederaTestnet
 *        CONTRACT is the hardhat-deploy deployment name (default TidepoolVault). The artifact comes from the
 *        deployment's own metadata, because one artifact can back several deployments: TidepoolVaultNarrow is a
 *        deployment of the TidepoolVault artifact. ARTIFACT overrides it.
 */
import hre from "hardhat";

const SOURCIFY = "https://sourcify.dev/server";

/** The contract a deployment was compiled from, e.g. "TidepoolVault" for the TidepoolVaultNarrow deployment. */
function artifactName(metadata: string | undefined, deploymentName: string): string {
  if (process.env.ARTIFACT) return process.env.ARTIFACT;
  try {
    const target = JSON.parse(metadata ?? "{}")?.settings?.compilationTarget as Record<string, string> | undefined;
    const name = target && Object.values(target)[0];
    if (name) return name;
  } catch {
    // No readable metadata: fall back to the deployment name.
  }
  return deploymentName;
}

async function main() {
  const deploymentName = process.env.CONTRACT ?? "TidepoolVault";
  const deployment = await hre.deployments.get(deploymentName);
  const chainId = (await hre.ethers.provider.getNetwork()).chainId.toString();

  const contractName = artifactName(deployment.metadata, deploymentName);
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
