import { GenericContractsDeclaration } from "~~/utils/scaffold-hbar/contract";

/**
 * This file contains external contract definitions (contracts not deployed by this project).
 * Add entries here to interact with pre-deployed contracts on any supported chain.
 * Both Tidepool vaults (TidepoolVault and TidepoolVaultNarrow) come from the generated deployedContracts.ts.
 */
const externalContracts = {} as const;

export default externalContracts satisfies GenericContractsDeclaration;
