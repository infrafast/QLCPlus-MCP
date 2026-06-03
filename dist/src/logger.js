import { pino } from "pino";
let loggerInstance = null;
export function initLogger(config) {
    const pinoConfig = config.nodeEnv === "development"
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
    loggerInstance = pino({
        level: config.logLevel,
        ...pinoConfig,
    }, pino.destination());
    return loggerInstance;
}
export function getLogger() {
    if (!loggerInstance) {
        loggerInstance = pino({ level: "info" });
    }
    return loggerInstance;
}
//# sourceMappingURL=logger.js.map