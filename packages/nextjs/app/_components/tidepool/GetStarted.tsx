"use client";

import type { ReactNode } from "react";
import { CheckIcon } from "@heroicons/react/20/solid";
import { AssociateButton } from "~~/app/_components/tidepool/AssociateButton";
import { openDepositPanel } from "~~/app/_components/tidepool/UserActions";
import { Card, ExternalLink } from "~~/app/_components/tidepool/ui";
import { useHtsAccount } from "~~/hooks/tidepool/useHtsAccount";
import type { UserPosition } from "~~/hooks/tidepool/useUserPosition";
import type { VaultState } from "~~/hooks/tidepool/useVault";
import { useWalletGate } from "~~/hooks/tidepool/useWalletGate";
import { SAUCERSWAP_TESTNET_URL } from "~~/utils/tidepool/constants";

type Step = { title: string; done: boolean; action?: ReactNode };

/**
 * The steps to a first deposit, each read from real state: wallet, token associations, WHBAR and the other token's
 * balances, and shares. The first step not done is the current one and carries its action. Rendered only for
 * connected accounts without shares.
 */
export const GetStarted = ({ vault, user }: { vault: VaultState; user: UserPosition }) => {
  const gate = useWalletGate();
  // Same reads as the deposit panel (react-query shares them).
  const acc0 = useHtsAccount(vault.token0, vault.address);
  const acc1 = useHtsAccount(vault.token1, vault.address);
  const whbarIs0 = vault.symbol0 === "WHBAR";
  const whbar = whbarIs0 ? acc0 : acc1;
  const other = whbarIs0 ? acc1 : acc0;
  const otherSymbol = (whbarIs0 ? vault.symbol1 : vault.symbol0) ?? "the other token";

  const missing = [
    { token: vault.token0, symbol: vault.symbol0 ?? "token0", account: acc0 },
    { token: vault.token1, symbol: vault.symbol1 ?? "token1", account: acc1 },
    { token: vault.shareToken, symbol: vault.shareSymbol ?? "vault shares", account: user.shareAccount },
  ].filter(entry => entry.token && entry.account.isAssociated === false);
  const associated = missing.length === 0 && acc0.isAssociated && acc1.isAssociated && user.isAssociated;

  const steps: Step[] = [
    {
      title: gate.wrongNetwork ? "Switch to Hedera Testnet" : "Connect wallet",
      done: gate.canTransact,
    },
    {
      title: "Associate tokens",
      done: Boolean(associated),
      action: (
        <div className="flex flex-wrap gap-2">
          {missing.map(entry => (
            <AssociateButton
              key={entry.token}
              token={entry.token!}
              symbol={entry.symbol}
              onDone={() => void entry.account.refetch()}
            />
          ))}
        </div>
      ),
    },
    {
      title: "Get WHBAR",
      done: (whbar.balance ?? 0n) > 0n,
      action: (
        <button type="button" className="btn btn-primary btn-sm rounded-lg" onClick={() => openDepositPanel("wrap")}>
          Wrap HBAR
        </button>
      ),
    },
    {
      title: `Get ${otherSymbol}`,
      done: (other.balance ?? 0n) > 0n,
      action: (
        <ExternalLink href={SAUCERSWAP_TESTNET_URL} className="text-sm text-teal">
          Swap on SaucerSwap testnet
        </ExternalLink>
      ),
    },
    {
      title: "Deposit",
      done: (user.shares ?? 0n) > 0n,
      action: (
        <button type="button" className="btn btn-primary btn-sm rounded-lg" onClick={() => openDepositPanel("deposit")}>
          Enter amounts
        </button>
      ),
    },
  ];
  const current = steps.findIndex(step => !step.done);

  return (
    <Card title="Get started">
      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        {steps.map((step, i) => {
          const state = step.done ? "done" : i === current ? "current" : "todo";
          return (
            <li key={step.title} className="flex gap-3" aria-current={state === "current" ? "step" : undefined}>
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${
                  state === "done"
                    ? "border-teal bg-teal text-bg"
                    : state === "current"
                      ? "border-teal text-teal"
                      : "border-line text-muted"
                }`}
                aria-hidden
              >
                {state === "done" ? <CheckIcon className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <span className="flex items-baseline justify-between gap-2 text-sm">
                  <span className={state === "todo" ? "text-muted" : "text-fg"}>{step.title}</span>
                  <span className="text-xs text-muted">
                    {state === "done" ? "Done" : state === "current" ? "Next" : "To do"}
                  </span>
                </span>
                {state === "current" && step.action}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
};
