import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { DeployFunction } from "hardhat-deploy/types";

import { TIDEPOOL_NARROW } from "../tidepool.config";
import { getDeployGasPrice } from "../utils/getDeployGasPrice";

const DEPLOYMENT_NAME = "TidepoolVaultNarrow";

/**
 * Deploys a SECOND TidepoolVault, recorded as "TidepoolVaultNarrow", with the narrow test parameters, then
 * initializes it. It never touches the main "TidepoolVault" deployment record.
 *
 * Opt-in only: skipped unless TIDEPOOL_DEPLOY_NARROW=true, so a plain `hardhat:deploy:testnet` cannot deploy it.
 * Intended entry point: `hardhat:deploy:narrow` (sets the flag and runs only this script's tag).
 */
const deployTidepoolVaultNarrow: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const params = TIDEPOOL_NARROW[hre.network.name];
  if (!params) {
    console.log(`No narrow-vault config for network "${hre.network.name}" - skipping ${DEPLOYMENT_NAME}.`);
    return;
  }

  const { deployer } = await hre.getNamedAccounts();
  const { deploy, read, execute } = hre.deployments;
  const gasPrice = await getDeployGasPrice(hre);

  await deploy(DEPLOYMENT_NAME, {
    contract: "TidepoolVault",
    from: deployer,
    args: [
      {
        pool: params.pool,
        positionManager: params.positionManager,
        swapRouter: params.swapRouter,
        halfWidth: params.halfWidth,
        twapWindow: params.twapWindow,
        maxTwapDeviation: params.maxTwapDeviation,
        rebalanceCooldown: params.rebalanceCooldown,
        swapSlippageBps: params.swapSlippageBps,
      },
    ],
    log: true,
    autoMine: true,
    gasLimit: 6_000_000,
    gasPrice,
  });

  const shareToken: string = await read(DEPLOYMENT_NAME, "shareToken");
  if (shareToken !== hre.ethers.ZeroAddress) {
    console.log(`${DEPLOYMENT_NAME} already initialized, share token ${shareToken}`);
    return;
  }

  // Same initialize() as the main vault: three HTS associations (~2M gas) plus share-token creation.
  await execute(
    DEPLOYMENT_NAME,
    { from: deployer, value: hre.ethers.parseEther(params.initializeHbar).toString(), gasLimit: 5_000_000, gasPrice },
    "initialize",
    params.shareName,
    params.shareSymbol,
  );
  console.log(`${DEPLOYMENT_NAME} share token: ${await read(DEPLOYMENT_NAME, "shareToken")}`);
};

deployTidepoolVaultNarrow.tags = ["TidepoolVaultNarrow"];
deployTidepoolVaultNarrow.skip = async () => process.env.TIDEPOOL_DEPLOY_NARROW !== "true";
export default deployTidepoolVaultNarrow;
