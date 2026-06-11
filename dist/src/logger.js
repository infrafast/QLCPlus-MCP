import pino from "pino";
import pretty from "pino-pretty";
import { Writable } from "node:stream";
let loggerInstance = null;
const LOG_BUFFER_LIMIT = 500;
const recentLogLines = [];
const logSubscribers = new Set();
function appendLogLine(line) {
    const trimmed = line.trimEnd();
    if (!trimmed)
        return;
    recentLogLines.push(trimmed);
    while (recentLogLines.length > LOG_BUFFER_LIMIT) {
        recentLogLines.shift();
    }
    for (const subscriber of logSubscribers) {
        subscriber(trimmed);
    }
}
function formatLogLine(raw) {
    try {
        const entry = JSON.parse(raw);
        const time = entry.time ? new Date(entry.time).toISOString() : new Date().toISOString();
        const level = entry.level === 10
            ? "trace"
            : entry.level === 20
                ? "debug"
                : entry.level === 30
                    ? "info"
                    : entry.level === 40
                        ? "warn"
                        : entry.level === 50
                            ? "error"
                            : entry.level === 60
                                ? "fatal"
                                : String(entry.level ?? "log");
        const metadata = Object.fromEntries(Object.entries(entry).filter(([key]) => !["level", "time", "pid", "hostname", "msg", "err"].includes(key)));
        const details = Object.keys(metadata).length
            ? ` ${JSON.stringify(metadata)}`
            : "";
        const suffix = entry.err?.message ? ` (${entry.err.message})` : "";
        return `${time} ${level.toUpperCase()} ${entry.msg ?? raw}${details}${suffix}`;
    }
    catch {
        return raw;
    }
}
class LogCaptureStream extends Writable {
    _write(chunk, _encoding, callback) {
        const lines = chunk.toString("utf8").split(/\r?\n/);
        for (const line of lines) {
            if (line.trim())
                appendLogLine(formatLogLine(line));
        }
        callback();
    }
}
export function initLogger(config) {
    const usePrettyLogs = config.nodeEnv === "development" && config.transport !== "stdio";
    const destination = config.transport === "stdio" ? pino.destination(2) : pino.destination();
    const outputStream = usePrettyLogs
        ? pretty({
            colorize: true,
            translateTime: "HH:MM:ss Z",
            ignore: "pid,hostname",
            singleLine: false,
        })
        : destination;
    const stream = pino.multistream([
        { level: config.logLevel, stream: outputStream },
        { level: config.logLevel, stream: new LogCaptureStream() },
    ]);
    loggerInstance = pino({
        level: config.logLevel,
    }, stream);
    return loggerInstance;
}
export function getLogger() {
    if (!loggerInstance) {
        loggerInstance = pino({ level: "info" });
    }
    return loggerInstance;
}
export function getRecentLogLines() {
    return [...recentLogLines];
}
export function subscribeLogLines(callback) {
    logSubscribers.add(callback);
    return () => {
        logSubscribers.delete(callback);
    };
}
//# sourceMappingURL=logger.js.map