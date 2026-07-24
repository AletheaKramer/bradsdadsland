import { Buffer } from "node:buffer";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const COST = 32_768;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 1;
const MINIMUM_PASSWORD_LENGTH = 16;

export const generateDashboardPasswordHash = async (password) => {
  if (typeof password !== "string" || password.length < MINIMUM_PASSWORD_LENGTH) {
    throw new Error(
      `Use a password or passphrase at least ${MINIMUM_PASSWORD_LENGTH} characters long.`,
    );
  }
  if (password.length > 1024) throw new Error("The password is too long.");

  const salt = randomBytes(24);
  const hash = await scrypt(password, salt, 32, {
    N: COST,
    r: BLOCK_SIZE,
    p: PARALLELIZATION,
    maxmem: 64 * 1024 * 1024,
  });
  return [
    "scrypt",
    COST,
    BLOCK_SIZE,
    PARALLELIZATION,
    salt.toString("base64url"),
    Buffer.from(hash).toString("base64url"),
  ].join("$");
};

const readHiddenLine = (prompt) =>
  new Promise((resolve, reject) => {
    if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
      let input = "";
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (chunk) => {
        input += chunk;
      });
      process.stdin.once("end", () => resolve(input.replace(/[\r\n]+$/, "")));
      process.stdin.once("error", reject);
      return;
    }

    process.stderr.write(prompt);
    process.stdin.setEncoding("utf8");
    process.stdin.setRawMode(true);
    process.stdin.resume();
    let input = "";

    const restore = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener("data", onData);
    };
    const onData = (chunk) => {
      for (const key of chunk) {
        if (key === "\u0003") {
          restore();
          process.stderr.write("\n");
          reject(new Error("Cancelled."));
          return;
        }
        if (key === "\r" || key === "\n") {
          restore();
          process.stderr.write("\n");
          resolve(input);
          return;
        }
        if (key === "\u007f" || key === "\b") {
          input = input.slice(0, -1);
        } else if (key >= " " && key !== "\u007f") {
          input += key;
        }
      }
    };
    process.stdin.on("data", onData);
  });

const run = async () => {
  const interactive = Boolean(process.stdin.isTTY);
  const password = await readHiddenLine("Dashboard password (hidden): ");
  if (interactive) {
    const confirmation = await readHiddenLine("Repeat password (hidden): ");
    if (password !== confirmation) throw new Error("The passwords did not match.");
  }
  process.stdout.write(`${await generateDashboardPasswordHash(password)}\n`);
};

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  run().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
