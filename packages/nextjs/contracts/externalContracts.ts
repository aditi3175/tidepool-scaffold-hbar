/**
 * This file contains external contract definitions (contracts not deployed by this project).
 * Add entries here to interact with pre-deployed contracts on any supported chain.
 */
import deployedContracts from "./deployedContracts";
import { GenericContractsDeclaration } from "~~/utils/scaffold-hbar/contract";

const externalContracts = {
  296: {
    /**
     * Tidepool's narrow demo vault on Hedera testnet (0.0.10716411): the TidepoolVault contract with a
     * +/-60-tick range and a 600 s cooldown, deployed by `hardhat:deploy:narrow` to demonstrate rebalance.
     * It lives here rather than in the generated deployedContracts.ts, which keeps the main vault only.
     * Same contract, so it reuses the generated TidepoolVault ABI.
     */
    TidepoolVaultNarrow: {
      address: "0x91EdDBE42CFF874FdAFC2c1463Ca734A10C6E905",
      abi: deployedContracts[296].TidepoolVault.abi,
    },
  },
} as const;

export default externalContracts satisfies GenericContractsDeclaration;
