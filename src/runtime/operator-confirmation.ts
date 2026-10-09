import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
export async function confirmLive(label: string, explicitFlag: boolean) {
  if (!explicitFlag || !stdin.isTTY || !stdout.isTTY || process.env.CI || process.env.NODE_ENV === "test") throw new Error("Live inference requires --live, an interactive terminal and fresh confirmation; forbidden in CI");
  const terminal = createInterface({ input: stdin, output: stdout });
  try {
    const phrase = `EXECUTE ${label}`;
    const answer = await terminal.question(`Provider costs may exceed application estimates. Type ${phrase} to authorize this exact execution: `);
    if (answer.trim() !== phrase) throw new Error("Live execution not confirmed");
  } finally { terminal.close(); }
}
