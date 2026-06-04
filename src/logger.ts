import { pino, type Logger } from "pino";
import { Config } from "./config.js";

let loggerInstance: Logger | null = null;

export function initLogger(config: Config): Logger {
  const usePrettyLogs = config.nodeEnv === "development" && config.transport !== "stdio";
  const pinoConfig =
    usePrettyLogs
      ? {
          transport: {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "HH:MM:ss Z",
              ignore: "pid,hostname",
              singleLine: false,
            },
          },
        }
      : {};

  const destination = config.transport === "stdio" ? pino.destination(2) : pino.destination();

  loggerInstance = pino(
    {
      level: config.logLevel,
      ...pinoConfig,
    },
    destination
  );

  return loggerInstance;
}

export function getLogger(): Logger {
  if (!loggerInstance) {
    loggerInstance = pino({ level: "info" });
  }
  return loggerInstance;
}
