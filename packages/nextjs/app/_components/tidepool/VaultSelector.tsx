import { ExclamationTriangleIcon } from "@heroicons/react/20/solid";
import { TIDEPOOL_VAULTS, type TidepoolVaultConfig, type TidepoolVaultId } from "~~/utils/tidepool/vaults";

/**
 * Switches the whole dashboard between the configured vaults: a two-position control whose indicator slides to the
 * active vault. The narrow vault keeps its DEMO label and its warning note.
 */
export const VaultSelector = ({
  selected,
  onSelect,
}: {
  selected: TidepoolVaultConfig;
  onSelect: (id: TidepoolVaultId) => void;
}) => {
  const index = Math.max(
    0,
    TIDEPOOL_VAULTS.findIndex(vault => vault.id === selected.id),
  );
  const columns = TIDEPOOL_VAULTS.length;

  return (
    <div className="flex flex-col sm:items-end">
      <div
        role="tablist"
        aria-label="Vault"
        className="relative mb-3 grid w-full rounded-full border border-white/[0.08] bg-black/40 p-1 backdrop-blur-sm sm:w-[25rem]"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        <span
          aria-hidden
          className={`tp-stream-edge absolute inset-y-1 left-1 rounded-full transition-transform duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none ${
            selected.demo ? "bg-warning/[0.09]" : "bg-white/[0.07]"
          }`}
          style={{
            width: `calc((100% - 0.5rem) / ${columns})`,
            transform: `translateX(${index * 100}%)`,
          }}
        />
        {TIDEPOOL_VAULTS.map(vault => {
          const active = vault.id === selected.id;
          return (
            <button
              key={vault.id}
              role="tab"
              type="button"
              aria-selected={active}
              className={`relative z-[1] flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-sm transition-colors duration-300 ${
                active ? "font-medium text-base-content" : "text-base-content/50 hover:text-base-content/85"
              }`}
              onClick={() => onSelect(vault.id)}
            >
              <span className="hidden sm:inline">{vault.label}</span>
              <span className="sm:hidden">{vault.label.replace(/ Vault$/, "")}</span>
              {vault.demo && (
                <span className="rounded-full border border-warning/35 px-1.5 py-px text-[10px] font-medium uppercase tracking-wider text-warning/90">
                  Demo
                </span>
              )}
            </button>
          );
        })}
      </div>
      {/* Always mounted: the note expands/collapses (height + opacity) as the demo vault is selected or left. */}
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none ${
          selected.demo ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
        aria-hidden={!selected.demo}
      >
        <div className="overflow-hidden">
          <div
            role="note"
            className="flex gap-3 rounded-xl border border-warning/15 bg-warning/[0.045] px-4 py-3 text-sm leading-relaxed"
          >
            <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-warning/80" aria-hidden />
            <p className="text-base-content/70">
              <span className="font-medium text-warning/90">Demo / test vault.</span> Deployed to demonstrate
              rebalancing on testnet; it is not a production vault. Use the Main Vault for anything else.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
