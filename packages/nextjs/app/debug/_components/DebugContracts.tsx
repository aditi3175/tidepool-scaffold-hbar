"use client";

import { useEffect, useMemo } from "react";
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

  useEffect(() => {
    if (!contractNames.includes(selectedContract)) {
      setSelectedContract(contractNames[0]);
    }
  }, [contractNames, selectedContract, setSelectedContract]);

  return (
    <div className="flex flex-col items-center justify-center gap-y-6 py-8 lg:gap-y-8 lg:py-10">
      {contractNames.length === 0 ? (
        <p className="mt-14 text-lg text-base-content/60">No contracts found!</p>
      ) : (
        <>
          {contractNames.length > 1 && (
            <div className="w-full max-w-6xl px-4 sm:px-6 lg:px-8">
              <div
                role="tablist"
                aria-label="Contract"
                className="inline-flex w-full max-w-full gap-1 overflow-x-auto rounded-full border border-white/[0.07] bg-white/[0.025] p-1 sm:w-fit"
              >
                {contractNames.map(contractName => (
                  <button
                    role="tab"
                    type="button"
                    aria-selected={contractName === selectedContract}
                    className={`tp-num flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm transition-all duration-200 sm:flex-none ${
                      contractName === selectedContract
                        ? "bg-white/[0.09] text-base-content shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]"
                        : "text-base-content/50 hover:text-base-content/80"
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
                <ContractUI key={String(contractName)} contractName={contractName} />
              ),
          )}
        </>
      )}
    </div>
  );
}
