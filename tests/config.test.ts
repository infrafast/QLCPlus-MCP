import { afterEach, describe, expect, it, vi } from "vitest";
import { loadConfig } from "../src/config.js";

const ENV_KEYS = [
  "MCP_TRANSPORT",
  "HTTP_HOST",
  "HTTP_PORT",
  "HTTP_MCP_PATH",
  "MCP_AUTH_MODE",
  "MCP_AUTH_TOKEN",
  "QLC_NATIVE_ENABLED",
  "QLC_NATIVE_HOST",
  "QLC_NATIVE_PORT",
  "QLC_NATIVE_ENCRYPTION_KEY",
  "QLC_NATIVE_RECONNECT_MS",
  "QLC_NATIVE_CONNECT_TIMEOUT_MS",
  "QLC_NATIVE_MAX_PROJECT_SIZE",
  "QLC_NATIVE_CLIENT_NAME",
  "QLC_DRY_RUN",
  "LOG_LEVEL",
  "NODE_ENV",
];

afterEach(() => {
  vi.unstubAllEnvs();
});

function clearKnownEnv(): void {
  for (const key of ENV_KEYS) vi.stubEnv(key, "");
}

describe("native-only configuration", () => {
  it("enables the native client by default", () => {
    clearKnownEnv();
    expect(loadConfig()).toMatchObject({
      qlcNativeEnabled: true,
      qlcNativeHost: "127.0.0.1",
      qlcNativePort: 9998,
      httpHost: "127.0.0.1",
    });
  });

  it("honors an explicit native disable", () => {
    clearKnownEnv();
    vi.stubEnv("QLC_NATIVE_ENABLED", "false");
    expect(loadConfig().qlcNativeEnabled).toBe(false);
  });

  it("requires a bearer token when bearer auth is selected", () => {
    clearKnownEnv();
    vi.stubEnv("MCP_TRANSPORT", "http");
    vi.stubEnv("MCP_AUTH_MODE", "bearer");
    expect(() => loadConfig()).toThrow(/MCP_AUTH_TOKEN/);
  });
});
