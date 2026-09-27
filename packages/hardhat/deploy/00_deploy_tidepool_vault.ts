import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { DeployFunction } from "hardhat-deploy/types";

import { TIDEPOOL } from "../tidepool.config";
import { getDeployGasPrice } from "../utils/getDeployGasPrice";

/**
 * Deploys TidepoolVault against live SaucerSwap V2 contracts, then calls initialize(),
 * which associates the vault with both pool tokens and the LP NFT and creates the HTS share token.
 */
const deployTidepoolVault: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const params = TIDEPOOL[hre.network.name];
  if (!params) {
    console.log(`No SaucerSwap config for network "${hre.network.name}" - skipping TidepoolVault.`);
    return;
  }

  const { deployer } = await hre.getNamedAccounts();
  const { deploy, read, execute } = hre.deployments;
  const gasPrice = await getDeployGasPrice(hre);

  await deploy("TidepoolVault", {
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

  const shareToken: string = await read("TidepoolVault", "shareToken");
  if (shareToken !== hre.ethers.ZeroAddress) {
    console.log(`TidepoolVault already initialized, share token ${shareToken}`);
    return;
  }

  // JSON-RPC value is in weibar (18 decimals); the relay converts it to tinybar for the EVM.
  // Gas: each HTS association or allowance approval made through the system contract is charged as gas.
  // Testnet, before standing approvals: initialize used 2,313,512 (three associations + token creation; 2M ran out).
  // The four standing approvals add ~4 x 705,424 (the per-approval cost measured on testnet), so ~5.14M in total.
  // Not re-measured yet; 8M leaves headroom, and Hedera charges gas used, not the limit.
  await execute(
    "TidepoolVault",
    { from: deployer, value: hre.ethers.parseEther(params.initializeHbar).toString(), gasLimit: 8_000_000, gasPrice },
    "initialize",
    params.shareName,
    params.shareSymbol,
  );
  console.log(`Share token: ${await read("TidepoolVault", "shareToken")}`);
};

deployTidepoolVault.tags = ["TidepoolVault"];
export default deployTidepoolVault;
