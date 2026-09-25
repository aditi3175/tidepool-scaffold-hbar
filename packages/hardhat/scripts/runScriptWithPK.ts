import * as dotenv from "dotenv";
dotenv.config();
import { Wallet } from "ethers";
import password from "@inquirer/password";
import { spawn } from "child_process";

/**
 * Decrypts the deployer key (created by `account:generate` / `account:import`) and runs
 * `hardhat run <script> --network <network>` with it, the same way runHardhatDeployWithPK.ts runs deploys.
 * Usage: ts-node scripts/runScriptWithPK.ts scripts/tidepoolSmoke.ts --network hederaTestnet
 */
async function main() {
  const [script, ...rest] = process.argv.slice(2);
  if (!script) throw new Error("Pass the script path, e.g. scripts/tidepoolSmoke.ts");

  const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;
  if (!encryptedKey) {
    console.log(
      "🚫️ No deployer account. Run `npm run hardhat:account:generate` or `npm run hardhat:account:import` first.",
    );
    process.exit(1);
  }
  const pass = await password({ message: "Enter password to decrypt private key:" });
  const wallet = await Wallet.fromEncryptedJson(encryptedKey, pass);
  process.env.__RUNTIME_DEPLOYER_PRIVATE_KEY = wallet.privateKey;

  const child = spawn("hardhat", ["run", script, ...rest], {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });
  child.on("exit", code => process.exit(code || 0));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
