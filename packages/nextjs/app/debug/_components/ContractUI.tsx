"use client";

// @refresh reset
import { Contract } from "@scaffold-hbar-ui/debug-contracts";
import { useDeployedContractInfo } from "~~/hooks/scaffold-hbar";
import { useTargetNetwork } from "~~/hooks/scaffold-hbar/useTargetNetwork";
import { ContractName } from "~~/utils/scaffold-hbar/contract";

type ContractUIProps = {
  contractName: ContractName;
  className?: string;
};

/**
 * UI component to interface with deployed contracts.
 **/
export const ContractUI = ({ contractName }: ContractUIProps) => {
  const { targetNetwork } = useTargetNetwork();
  const { data: deployedContractData, isLoading: deployedContractLoading } = useDeployedContractInfo({ contractName });

  if (deployedContractLoading) {
    return (
      <p className="mt-14 flex items-center gap-2 text-sm text-muted">
        <span className="loading loading-spinner loading-sm text-teal" /> Loading the contract…
      </p>
    );
  }

  if (!deployedContractData) {
    return (
      <p className="mt-14 text-sm text-muted">
        No {String(contractName)} deployment was found on {targetNetwork.name}.
      </p>
    );
  }

  return <Contract contractName={contractName as string} contract={deployedContractData} chainId={targetNetwork.id} />;
};
