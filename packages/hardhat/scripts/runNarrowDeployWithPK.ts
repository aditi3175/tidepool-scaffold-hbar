import { spawn } from "child_process";

/**
 * Entry point for `deploy:narrow`. Sets the TIDEPOOL_DEPLOY_NARROW opt-in inside Node (no shell-specific
 * `VAR=value` syntax, so it works under Yarn and npm on Windows, macOS and Linux) and then runs the normal
 * deploy wrapper for ONLY the narrow vault's tag. deploy/01_deploy_tidepool_vault_narrow.ts stays skipped for
 * every other deploy command, because nothing else sets the flag.
 */
const child = spawn(
  "ts-node",
  ["scripts/runHardhatDeployWithPK.ts", "--network", "hederaTestnet", "--tags", "TidepoolVaultNarrow"],
  {
    stdio: "inherit",
    env: { ...process.env, TIDEPOOL_DEPLOY_NARROW: "true" },
    shell: process.platform === "win32",
  },
);
child.on("exit", code => process.exit(code || 0));
