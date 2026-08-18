import { z } from "zod";

export const ConfigSchema = z.object({
  transport: z.enum(["stdio", "http"]).default("stdio"),

  httpHost: z.string().default("127.0.0.1"),
  httpPort: z.number().int().min(1).max(65535).default(8788),
  httpMcpPath: z.string().default("/mcp"),

  authMode: z.enum(["none", "bearer"]).default("none"),
  authToken: z.string().optional(),

  qlcNativeEnabled: z.boolean().default(true),
  qlcNativeHost: z.string().min(1).default("127.0.0.1"),
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

  qlcDryRun: z.boolean().default(false),

  logLevel: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),
  nodeEnv: z.enum(["development", "production"]).default("development"),
}).superRefine((config, ctx) => {
  if (config.transport === "http" && config.authMode === "bearer" && !config.authToken) {
    ctx.addIssue({
      code: "custom",
      path: ["authToken"],
      message: "MCP_AUTH_TOKEN is required when MCP_AUTH_MODE=bearer",
    });
  }
});

export type Config = z.infer<typeof ConfigSchema>;

function optionalBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined || value === "") return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`Invalid boolean environment value '${value}'`);
}

function optionalInteger(value: string | undefined): number | undefined {
  if (value === undefined || value === "") return undefined;
  if (!/^\d+$/.test(value)) {
    throw new Error(`Invalid integer environment value '${value}'`);
  }
  return Number(value);
}

export function loadConfig(): Config {
  const env = {
    transport: process.env.MCP_TRANSPORT,
    httpHost: process.env.HTTP_HOST,
    httpPort: optionalInteger(process.env.HTTP_PORT),
    httpMcpPath: process.env.HTTP_MCP_PATH,
    authMode: process.env.MCP_AUTH_MODE,
    authToken: process.env.MCP_AUTH_TOKEN || undefined,
    qlcNativeEnabled: optionalBoolean(process.env.QLC_NATIVE_ENABLED),
    qlcNativeHost: process.env.QLC_NATIVE_HOST,
    qlcNativePort: optionalInteger(process.env.QLC_NATIVE_PORT),
    qlcNativeEncryptionKey: process.env.QLC_NATIVE_ENCRYPTION_KEY,
    qlcNativeReconnectMs: optionalInteger(process.env.QLC_NATIVE_RECONNECT_MS),
    qlcNativeConnectTimeoutMs: optionalInteger(
      process.env.QLC_NATIVE_CONNECT_TIMEOUT_MS,
    ),
    qlcNativeMaximumProjectSize: optionalInteger(
      process.env.QLC_NATIVE_MAX_PROJECT_SIZE,
    ),
    qlcNativeClientName: process.env.QLC_NATIVE_CLIENT_NAME,
    qlcDryRun: optionalBoolean(process.env.QLC_DRY_RUN),
    logLevel: process.env.LOG_LEVEL,
    nodeEnv: process.env.NODE_ENV,
  };

  const cleanEnv = Object.fromEntries(
    Object.entries(env).filter(([, value]) => value !== undefined),
  );

  return ConfigSchema.parse(cleanEnv);
}
