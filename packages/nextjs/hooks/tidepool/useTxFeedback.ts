import { useCallback, useState } from "react";
import type { Abi, Hash, Hex } from "viem";
import { MIRROR_NODE_URL } from "~~/utils/tidepool/constants";
import { customErrorMessage, decodeRevert, friendlyError } from "~~/utils/tidepool/errors";

export type TxFeedbackState =
  | { status: "idle" }
  | { status: "running"; step: string }
  | { status: "success"; label: string; hash?: Hash }
  | { status: "cancelled" }
  | { status: "failed"; message: string; hash?: Hash };

/**
 * Looks up why a mined transaction reverted. Transactions sent without simulation (compound, rebalance) only
 * reveal their revert reason after mining; the mirror node exposes it as `error_message` a few seconds later.
 */
async function mirrorRevertReason(hash: Hash, abi: Abi): Promise<string | undefined> {
  for (let attempt = 0; attempt < 4; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 2500));
    try {
      const res = await fetch(`${MIRROR_NODE_URL}/api/v1/contracts/results/${hash}`);
      if (res.status === 404) continue; // not indexed yet
      if (!res.ok) return undefined;
      const { error_message: errorMessage, result } = (await res.json()) as { error_message?: string; result?: string };
      if (errorMessage && /^0x[0-9a-fA-F]{8}/.test(errorMessage)) {
        const decoded = decodeRevert(errorMessage as Hex, abi);
        if (decoded) return customErrorMessage(decoded.errorName, decoded.args) ?? decoded.errorName;
      }
      return errorMessage || result;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export type TxFlowContext = {
  /** Describe the step in progress ("Approving SAUCE…"). */
  step: (text: string) => void;
  /** Record a hash as soon as the wallet returns it (pass as the mutation's onSuccess). */
  sent: (hash: Hash) => void;
};

/**
 * Inline status for a card's transaction flow (the useTransactor toasts carry the same information briefly).
 * `run` executes the flow, which returns the final hash, or undefined if nothing was sent (for example when the
 * scaffold write hook refused because of the wrong network). If a sent transaction reverts on chain, the
 * status keeps its HashScan link and the reason is looked up on the mirror node.
 */
export function useTxFeedback(abi: Abi) {
  const [state, setState] = useState<TxFeedbackState>({ status: "idle" });

  const run = useCallback(
    async (label: string, flow: (ctx: TxFlowContext) => Promise<Hash | undefined>): Promise<boolean> => {
      let lastSent: Hash | undefined;
      setState({ status: "running", step: label });
      try {
        const hash = await flow({
          step: text => setState({ status: "running", step: text }),
          sent: sentHash => {
            lastSent = sentHash;
          },
        });
        if (!hash) {
          setState({ status: "idle" });
          return false;
        }
        setState({ status: "success", label, hash });
        return true;
      } catch (error) {
        const friendly = friendlyError(error, abi);
        if (friendly.cancelled) {
          setState({ status: "cancelled" });
          return false;
        }
        if (lastSent && friendly.message === "Transaction reverted") {
          setState({ status: "failed", message: "Reverted on chain. Looking up the reason…", hash: lastSent });
          const reason = await mirrorRevertReason(lastSent, abi);
          setState({
            status: "failed",
            message: reason ? `Reverted: ${reason}` : "Reverted on chain.",
            hash: lastSent,
          });
        } else {
          setState({ status: "failed", message: friendly.message, hash: lastSent });
        }
        return false;
      }
    },
    [abi],
  );

  return { state, run, busy: state.status === "running", reset: () => setState({ status: "idle" }) };
}
