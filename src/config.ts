import fs from "node:fs";
import { z } from "zod";

export const ConfigSchema = z.object({
  // Transport
  transport: z.enum(["stdio", "http"]).default("stdio"),

  // HTTP Server
  httpHost: z.string().default("0.0.0.0"),
  httpPort: z.number().int().min(1).max(65535).default(8788),
  httpMcpPath: z.string().default("/mcp"),

  // Authentication
  authMode: z.enum(["none", "bearer"]).default("none"),
  authToken: z.string().optional(),

  // QLC+ Configuration
  qlcHost: z.string().default("127.0.0.1"),
  qlcOscInputPort: z.number().int().min(1).max(65535).default(7700),
  qlcOscOutputPort: z.number().int().min(1).max(65535).default(9000),
  qlcUniverse: z.number().int().min(1).default(1),

  // QLC+ 5 Native Server (localhost-only during migration)
  qlcNativeEnabled: z.boolean().default(false),
  qlcNativeHost: z.enum(["127.0.0.1", "localhost", "::1"]).default("127.0.0.1"),
  qlcNativePort: z.number().int().min(1).max(65535).default(9998),
  qlcNativeEncryptionKey: z.string().default(""),
  qlcNativeReconnectMs: z.number().int().min(100).max(60_000).default(2_000),
  qlcNativeConnectTimeoutMs: z
    .number()
    .int()
    .min(100)
    .max(60_000)
    .default(10_000),
  qlcNativeMaximumProjectSize: z
    .number()
    .int()
    .min(1024)
    .max(128 * 1024 * 1024)
    .default(16 * 1024 * 1024),
  qlcNativeClientName: z.string().min(1).max(100).default("QLCPlus-MCP"),

  // Widget Configuration
  qlcWidgetsFile: z.string().default("config/widgets.json"),
  qlcAllowRawOsc: z.boolean().default(false),

  // Dry Run Mode
  qlcDryRun: z.boolean().default(false),

  // Logging
  logLevel: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),
  nodeEnv: z.enum(["development", "production"]).default("development"),
});

export type Config = z.infer<typeof ConfigSchema>;

export function updateRuntimeConfig(
  config: Config,
  values: Partial<
    Pick<
      Config,
      | "qlcHost"
      | "qlcOscInputPort"
      | "qlcOscOutputPort"
      | "qlcUniverse"
      | "qlcDryRun"
    >
  >,
): Config {
  const next = ConfigSchema.parse({ ...config, ...values });
  Object.assign(config, {
    qlcHost: next.qlcHost,
    qlcOscInputPort: next.qlcOscInputPort,
    qlcOscOutputPort: next.qlcOscOutputPort,
    qlcUniverse: next.qlcUniverse,
    qlcDryRun: next.qlcDryRun,
  });
  return config;
}

function quoteEnvValue(value: string): string {
  if (/^[A-Za-z0-9_.:/-]+$/.test(value)) {
    return value;
  }
  return JSON.stringify(value);
}

export function persistRuntimeConfig(
  config: Config,
  envFile: string | undefined,
): void {
  if (!envFile) {
    throw new Error(
      "No runtime env file was loaded; cannot persist QLC+ config",
    );
  }

  const updates: Record<string, string> = {
    QLC_HOST: config.qlcHost,
    QLC_OSC_INPUT_PORT: String(config.qlcOscInputPort),
    QLC_OSC_OUTPUT_PORT: String(config.qlcOscOutputPort),
    QLC_UNIVERSE: String(config.qlcUniverse),
    QLC_DRY_RUN: String(config.qlcDryRun),
  };

  let text = fs.existsSync(envFile) ? fs.readFileSync(envFile, "utf8") : "";
  for (const [key, value] of Object.entries(updates)) {
    const line = `${key}=${quoteEnvValue(value)}`;
    const pattern = new RegExp(`^${key}=.*$`, "m");
    if (pattern.test(text)) {
      text = text.replace(pattern, line);
    } else {
      if (text && !text.endsWith("\n")) text += "\n";
      text += `${line}\n`;
    }
    process.env[key] = value;
  }

  fs.writeFileSync(envFile, text);
}

export function loadConfig(): Config {
  const env = {
    transport: process.env.MCP_TRANSPORT,
    httpHost: process.env.HTTP_HOST,
    httpPort: process.env.HTTP_PORT
      ? parseInt(process.env.HTTP_PORT, 10)
      : undefined,
    httpMcpPath: process.env.HTTP_MCP_PATH,
    authMode: process.env.MCP_AUTH_MODE,
    authToken: process.env.MCP_AUTH_TOKEN,
    qlcHost: process.env.QLC_HOST,
    qlcOscInputPort: process.env.QLC_OSC_INPUT_PORT
      ? parseInt(process.env.QLC_OSC_INPUT_PORT, 10)
      : undefined,
    qlcOscOutputPort: process.env.QLC_OSC_OUTPUT_PORT
      ? parseInt(process.env.QLC_OSC_OUTPUT_PORT, 10)
      : undefined,
    qlcUniverse: process.env.QLC_UNIVERSE
      ? parseInt(process.env.QLC_UNIVERSE, 10)
      : undefined,
    qlcNativeEnabled: process.env.QLC_NATIVE_ENABLED === "true",
    qlcNativeHost: process.env.QLC_NATIVE_HOST,
    qlcNativePort: process.env.QLC_NATIVE_PORT
      ? parseInt(process.env.QLC_NATIVE_PORT, 10)
      : undefined,
    qlcNativeEncryptionKey: process.env.QLC_NATIVE_ENCRYPTION_KEY,
    qlcNativeReconnectMs: process.env.QLC_NATIVE_RECONNECT_MS
      ? parseInt(process.env.QLC_NATIVE_RECONNECT_MS, 10)
      : undefined,
    qlcNativeConnectTimeoutMs: process.env.QLC_NATIVE_CONNECT_TIMEOUT_MS
      ? parseInt(process.env.QLC_NATIVE_CONNECT_TIMEOUT_MS, 10)
      : undefined,
    qlcNativeMaximumProjectSize: process.env.QLC_NATIVE_MAX_PROJECT_SIZE
      ? parseInt(process.env.QLC_NATIVE_MAX_PROJECT_SIZE, 10)
      : undefined,
    qlcNativeClientName: process.env.QLC_NATIVE_CLIENT_NAME,
    qlcWidgetsFile: process.env.QLC_WIDGETS_FILE,
    qlcAllowRawOsc: process.env.QLC_ALLOW_RAW_OSC === "true",
    qlcDryRun: process.env.QLC_DRY_RUN === "true",
    logLevel: process.env.LOG_LEVEL,
    nodeEnv: process.env.NODE_ENV,
  };

  // Remove undefined values
  const cleanEnv = Object.fromEntries(
    Object.entries(env).filter(([, v]) => v !== undefined),
  );

  return ConfigSchema.parse(cleanEnv);
}
