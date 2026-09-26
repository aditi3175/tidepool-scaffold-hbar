import { useLocalStorage } from "usehooks-ts";
import { TIDEPOOL_VAULTS, type TidepoolVaultId } from "~~/utils/tidepool/vaults";

/**
 * The vault the dashboard shows. The choice is a per-browser convenience kept in localStorage
 * (usehooks-ts tolerates storage being unavailable); it starts on the Main Vault.
 */
export function useSelectedVault() {
  const [id, setId] = useLocalStorage<TidepoolVaultId>("tidepool.vault", "main", { initializeWithValue: false });
  const vault = TIDEPOOL_VAULTS.find(entry => entry.id === id) ?? TIDEPOOL_VAULTS[0];
  return { vault, select: setId };
}
