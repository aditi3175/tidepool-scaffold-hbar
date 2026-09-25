import { useWriteContract } from "wagmi";
import { useTransactor } from "~~/hooks/scaffold-hbar";
import { HTS_TOKEN_ABI } from "~~/utils/tidepool/constants";

/** HIP-719: an EVM wallet associates itself with an HTS token by calling associate() on the token address. */
export const AssociateButton = ({
  token,
  symbol,
  onDone,
}: {
  token: `0x${string}`;
  symbol: string;
  onDone: () => void;
}) => {
  const { writeContractAsync, isPending } = useWriteContract();
  const writeTx = useTransactor();

  const associate = async () => {
    await writeTx(() =>
      writeContractAsync({ address: token, abi: HTS_TOKEN_ABI, functionName: "associate", gas: 1_000_000n }),
    );
    onDone();
  };

  return (
    <button className="btn btn-sm btn-outline" disabled={isPending} onClick={associate}>
      Associate {symbol}
    </button>
  );
};
