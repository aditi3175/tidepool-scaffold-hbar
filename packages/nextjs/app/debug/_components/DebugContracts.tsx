"use client";

import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { ContractUI } from "./ContractUI";
import { useSessionStorage } from "usehooks-ts";
import { BarsArrowUpIcon } from "@heroicons/react/20/solid";
import { ContractName, GenericContract } from "~~/utils/scaffold-hbar/contract";
import { useAllContracts } from "~~/utils/scaffold-hbar/contractsData";

const selectedContractStorageKey = "scaffoldEth2.selectedContract";

export function DebugContracts() {
  const contractsData = useAllContracts();
  const contractNames = useMemo(
    () =>
      Object.keys(contractsData).sort((a, b) => {
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
      }) as ContractName[],
    [contractsData],
  );

  const [selectedContract, setSelectedContract] = useSessionStorage<ContractName>(
    selectedContractStorageKey,
    contractNames[0],
    { initializeWithValue: false },
  );

  // The package always renders a "Read" panel; the vault has no read functions that take arguments (its views are
  // listed on the left), so it only ever says "No read methods". Hide that empty panel.
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const hideEmpty = () => {
      el.querySelectorAll<HTMLElement>(".p-5").forEach(panel => {
        const card = panel.closest<HTMLElement>(".z-10");
        if (card) card.style.display = panel.textContent?.trim() === "No read methods" ? "none" : "";
      });
    };
    hideEmpty();
    const observer = new MutationObserver(hideEmpty);
    observer.observe(el, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  // The first contract waits for the page header to settle; later tab switches fade in at once.
  const [firstLoad, setFirstLoad] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setFirstLoad(false), 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!contractNames.includes(selectedContract)) {
      setSelectedContract(contractNames[0]);
    }
  }, [contractNames, selectedContract, setSelectedContract]);

  return (
    <div ref={root} className="flex flex-col items-center justify-center gap-y-6 py-8 lg:gap-y-8 lg:py-10">
      {contractNames.length === 0 ? (
        <p className="mt-14 text-sm text-muted">No contracts are deployed on the selected network.</p>
      ) : (
        <>
          {contractNames.length > 1 && (
            <div className="tp-in w-full max-w-[1480px] px-5 sm:px-8 lg:px-12" style={{ "--d": 640 } as CSSProperties}>
              <div
                role="tablist"
                aria-label="Contract"
                className="inline-flex w-full max-w-full gap-1 overflow-x-auto rounded-xl border border-white/10 bg-surface p-1 sm:w-fit"
              >
                {contractNames.map(contractName => (
                  <button
                    role="tab"
                    type="button"
                    aria-selected={contractName === selectedContract}
                    className={`flex flex-1 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 font-mono text-sm transition-colors sm:flex-none ${
                      contractName === selectedContract
                        ? "bg-neon/10 text-neon shadow-[inset_0_0_0_1px_rgba(46,230,200,0.35)]"
                        : "text-muted hover:text-fg"
                    }`}
                    key={String(contractName)}
                    onClick={() => setSelectedContract(contractName)}
                  >
                    {String(contractName)}
                    {(contractsData[String(contractName)] as GenericContract)?.external && (
                      <span className="tooltip tooltip-top" data-tip="External contract (externalContracts.ts)">
                        <BarsArrowUpIcon className="h-4 w-4 cursor-pointer opacity-60" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
          {contractNames.map(
            contractName =>
              contractName === selectedContract && (
                // Keyed by contract, so switching tabs fades the new contract in.
                <div
                  key={String(contractName)}
                  className="tp-in w-full"
                  style={{ "--d": firstLoad ? 720 : 0 } as CSSProperties}
                >
                  <ContractUI contractName={contractName} />
                </div>
              ),
          )}
        </>
      )}
    </div>
  );
}
