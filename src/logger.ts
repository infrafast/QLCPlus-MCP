import pino, { Logger } from "pino";
import { Config } from "./config.js";

let loggerInstance: Logger | null = null;

export function initLogger(config: Config): Logger {
  const pinoConfig =
    config.nodeEnv === "development"
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

  loggerInstance = pino(
    {
      level: config.logLevel,
      ...pinoConfig,
    },
    pino.destination()
  );

  return loggerInstance;
}

export function getLogger(): Logger {
  if (!loggerInstance) {
    loggerInstance = pino({ level: "info" });
  }
  return loggerInstance;
}
