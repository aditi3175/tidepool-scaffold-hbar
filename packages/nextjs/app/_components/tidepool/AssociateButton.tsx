import { useState } from "react";
import { useWriteContract } from "wagmi";
import { useTransactor } from "~~/hooks/scaffold-hbar";
import { GAS, HTS_TOKEN_ABI } from "~~/utils/tidepool/constants";

/**
 * HIP-719: an EVM wallet associates itself with an HTS token by calling associate() on the token address.
 * Errors and cancellations are reported by useTransactor's notifications.
 */
export const AssociateButton = ({
  token,
  symbol,
  disabled,
  onDone,
}: {
  token: `0x${string}`;
  symbol: string;
  disabled?: boolean;
  onDone: () => void;
}) => {
  const { writeContractAsync } = useWriteContract();
  const writeTx = useTransactor();
  const [pending, setPending] = useState(false);

  const associate = async () => {
    setPending(true);
    try {
      await writeTx(() =>
        writeContractAsync({ address: token, abi: HTS_TOKEN_ABI, functionName: "associate", gas: GAS.associate }),
      );
      onDone();
    } catch {
      // already shown by useTransactor
    } finally {
      setPending(false);
    }
  };

  return (
    <button type="button" className="btn btn-sm btn-outline" disabled={disabled || pending} onClick={associate}>
      {pending && <span className="loading loading-spinner loading-xs" />}
      Associate {symbol}
    </button>
  );
};
