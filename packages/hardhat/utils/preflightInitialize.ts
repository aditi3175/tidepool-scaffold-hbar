import type { Interface } from "ethers";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

type Overrides = { value: string; gasLimit: number; gasPrice: string };

/**
 * Runs initialize(name, symbol) as an eth_call (staticCall) with the same sender, value and gas as the real
 * transaction. If the call reverts, prints the decoded reason and throws, so the deploy stops before sending.
 */
export async function preflightInitialize(
  hre: HardhatRuntimeEnvironment,
  deploymentName: string,
  from: string,
  name: string,
  symbol: string,
  overrides: Overrides,
): Promise<void> {
  const { address, abi } = await hre.deployments.get(deploymentName);
  const signer = await hre.ethers.getSigner(from);
  const vault = new hre.ethers.Contract(address, abi, signer);

  try {
    await vault.initialize.staticCall(name, symbol, overrides);
    console.log(`${deploymentName}: initialize() preflight (eth_call) passed.`);
  } catch (error) {
    const reason = describeRevert(error, vault.interface);
    console.error(`${deploymentName}: initialize() preflight (eth_call) reverted: ${reason}`);
    console.error("Not sending initialize(). Nothing was sent; the deployed contract is left uninitialized.");
    throw new Error(`initialize() preflight failed: ${reason}`);
  }
}

function describeRevert(error: unknown, iface: Interface): string {
  const e = error as {
    revert?: { name: string; args: unknown[] };
    reason?: string;
    data?: string;
    shortMessage?: string;
    message?: string;
  };
  if (e.revert) return `${e.revert.name}(${e.revert.args.map(String).join(", ")})`;
  if (typeof e.data === "string" && e.data.length >= 10) {
    try {
      const parsed = iface.parseError(e.data);
      if (parsed) return `${parsed.name}(${parsed.args.map(String).join(", ")})`;
    } catch {
      // Not ABI-encoded revert data; report it raw below.
    }
    return `unrecognised revert data ${e.data}`;
  }
  return e.reason ?? e.shortMessage ?? e.message ?? String(error);
}
