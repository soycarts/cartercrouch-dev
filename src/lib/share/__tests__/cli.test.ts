import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const run = promisify(execFile);
const ROOT = resolve(__dirname, "../../../..");

/**
 * The publish CLI's argument gate, which decides — before any network call —
 * whether the command says one unambiguous thing about the draft. Every case
 * below exits before a token is even looked for.
 */
async function share(...args: string[]): Promise<{ code: number; err: string }> {
  try {
    await run("node_modules/.bin/tsx", ["scripts/share.ts", ...args], { cwd: ROOT });
    return { code: 0, err: "" };
  } catch (e) {
    const failure = e as { code?: number; stderr?: string };
    return { code: failure.code ?? 1, err: failure.stderr ?? "" };
  }
}

describe("share CLI arguments", () => {
  const id = "8z43LqvaXMNSG6daneeFrh";

  it("refuses an update that does not say which draft it writes", async () => {
    const { code, err } = await share("--update", id, "doc.md");
    expect(code).toBe(2);
    expect(err).toContain("--version <label> or --same-version");
  });

  it("refuses a command that contradicts itself", async () => {
    const both = await share("--update", id, "--version", "1.1", "--same-version", "doc.md");
    expect(both.code).toBe(2);
    expect(both.err).toContain("opposite things");
  });

  it("refuses --previous-version on a publish, where it means nothing", async () => {
    const { code, err } = await share("--previous-version", "1.0", "doc.md");
    expect(code).toBe(2);
    expect(err).toContain("only means something with --update");
  });

  it("refuses a flag that swallowed its own value", async () => {
    // "--version doc.md" used to publish doc.md under a draft called
    // "doc.md"; "--version --same-version" used to set the label to nothing.
    for (const args of [
      ["--version", "doc.md"],
      ["--update", id, "--version", "--same-version", "doc.md"],
    ]) {
      const { code, err } = await share(...args);
      expect(code).toBe(2);
      expect(err).toContain("usage:");
    }
  });
}, 30_000);
