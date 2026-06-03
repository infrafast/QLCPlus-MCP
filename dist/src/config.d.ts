import { z } from "zod";
export declare const ConfigSchema: z.ZodObject<{
    transport: z.ZodDefault<z.ZodEnum<{
        stdio: "stdio";
        http: "http";
    }>>;
    httpHost: z.ZodDefault<z.ZodString>;
    httpPort: z.ZodDefault<z.ZodNumber>;
    httpMcpPath: z.ZodDefault<z.ZodString>;
    authMode: z.ZodDefault<z.ZodEnum<{
        none: "none";
        bearer: "bearer";
    }>>;
    authToken: z.ZodOptional<z.ZodString>;
    qlcHost: z.ZodDefault<z.ZodString>;
    qlcOscInputPort: z.ZodDefault<z.ZodNumber>;
    qlcOscOutputPort: z.ZodDefault<z.ZodNumber>;
    qlcUniverse: z.ZodDefault<z.ZodNumber>;
    qlcWidgetsFile: z.ZodDefault<z.ZodString>;
    qlcAllowRawOsc: z.ZodDefault<z.ZodBoolean>;
    qlcDryRun: z.ZodDefault<z.ZodBoolean>;
    logLevel: z.ZodDefault<z.ZodEnum<{
        error: "error";
        trace: "trace";
        debug: "debug";
        info: "info";
        warn: "warn";
        fatal: "fatal";
    }>>;
    nodeEnv: z.ZodDefault<z.ZodEnum<{
        development: "development";
        production: "production";
    }>>;
}, z.core.$strip>;
export type Config = z.infer<typeof ConfigSchema>;
export declare function loadConfig(): Config;
//# sourceMappingURL=config.d.ts.map