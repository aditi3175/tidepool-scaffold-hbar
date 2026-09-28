import { TIDEPOOL_VAULTS, type TidepoolVaultConfig, type TidepoolVaultId } from "~~/utils/tidepool/vaults";

/** Switches the whole dashboard between the configured vaults. The narrow vault is labelled as a demo. */
export const VaultSelector = ({
  selected,
  onSelect,
}: {
  selected: TidepoolVaultConfig;
  onSelect: (id: TidepoolVaultId) => void;
}) => (
  <div role="tablist" aria-label="Vault" className="inline-flex gap-1 rounded-xl border border-white/10 bg-surface p-1">
    {TIDEPOOL_VAULTS.map(vault => {
      const active = vault.id === selected.id;
      return (
        <button
          key={vault.id}
          role="tab"
          type="button"
          aria-selected={active}
          className={`flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors ${
            active ? "bg-neon/10 text-neon shadow-[inset_0_0_0_1px_rgba(0,245,160,0.35)]" : "text-muted hover:text-fg"
          }`}
          onClick={() => onSelect(vault.id)}
        >
          {vault.label.replace(/ (Demo )?Vault$/, "")}
          {vault.demo && <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-amber">Demo</span>}
        </button>
      );
    })}
  </div>
);
