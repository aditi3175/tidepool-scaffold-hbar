import { useAccount } from "wagmi";
import { useTargetNetwork } from "~~/hooks/scaffold-hbar";

/** Whether the connected wallet can send transactions to the dashboard's network, and why not. */
export function useWalletGate() {
  const { address, chainId } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const connected = Boolean(address);
  const wrongNetwork = connected && chainId !== targetNetwork.id;
  return {
    address,
    connected,
    wrongNetwork,
    canTransact: connected && !wrongNetwork,
    reason: !connected
      ? "Connect a wallet to continue."
      : wrongNetwork
        ? `Switch your wallet to ${targetNetwork.name}.`
        : undefined,
  };
}
