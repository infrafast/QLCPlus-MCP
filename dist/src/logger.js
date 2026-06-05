import pino from "pino";
let loggerInstance = null;
export function initLogger(config) {
    const usePrettyLogs = config.nodeEnv === "development" && config.transport !== "stdio";
    const pinoConfig = usePrettyLogs
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
    loggerInstance = pino({
        level: config.logLevel,
        ...pinoConfig,
    }, destination);
    return loggerInstance;
}
export function getLogger() {
    if (!loggerInstance) {
        loggerInstance = pino({ level: "info" });
    }
    return loggerInstance;
}
//# sourceMappingURL=logger.js.map