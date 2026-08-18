import fs from "node:fs";
import { describe, expect, it } from "vitest";


describe("stdio lifecycle hardening", () => {
  it("stops the QLC native client when stdio closes", () => {
    const source = fs.readFileSync("src/transports/stdio.ts", "utf8");
    expect(source).toContain("stopNativeClient();");
    expect(source).toContain("shutdown(0);");
    expect(source).toContain("shutdown(1);");
  });

  it("handles SIGINT and SIGTERM through the same cleanup", () => {
    const source = fs.readFileSync("src/index.ts", "utf8");
    expect(source).toContain('process.once("SIGINT", () => shutdown(0))');
    expect(source).toContain('process.once("SIGTERM", () => shutdown(0))');
  });
});
