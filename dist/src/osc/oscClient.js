import { createSocket } from "node:dgram";
import OSC from "osc-js";
import { getLogger } from "../logger.js";
let oscInstance = null;
let feedbackOscInstance = null;
const RECENT_FEEDBACK_LIMIT = 25;
const runtimeState = {
    initialized: false,
    qlcHost: null,
    qlcOscInputPort: null,
    qlcOscOutputPort: null,
    qlcUniverse: null,
    dryRun: false,
    commandSendHost: null,
    commandSendPort: null,
    sendCount: 0,
    lastSentAt: null,
    lastSentPath: null,
    lastSendErrorAt: null,
    lastSendError: null,
    feedbackListening: false,
    feedbackListenHost: null,
    feedbackListenPort: null,
    feedbackCount: 0,
    lastFeedbackAt: null,
    lastFeedbackPath: null,
    lastFeedbackArgs: null,
    lastFeedbackSource: null,
    lastFeedbackErrorAt: null,
    lastFeedbackError: null,
    recentFeedback: [],
    feedbackSeenRecently: false,
    feedbackFreshnessSeconds: 10,
};
function nowIso() {
    return new Date().toISOString();
}
function formatFeedbackSource(info) {
    const address = info?.address ?? info?.host ?? info?.remoteAddress;
    const port = info?.port ?? info?.remotePort;
    if (!address && !port) {
        return null;
    }
    return `${address ?? "unknown"}:${port ?? "unknown"}`;
}
function recordFeedback(message, info) {
    const logger = getLogger();
    const at = nowIso();
    const path = message?.address ?? message?.path ?? null;
    const args = Array.isArray(message?.args) ? message.args : null;
    const source = formatFeedbackSource(info);
    runtimeState.feedbackCount += 1;
    runtimeState.lastFeedbackAt = at;
    runtimeState.lastFeedbackPath = path;
    runtimeState.lastFeedbackArgs = args;
    runtimeState.lastFeedbackSource = source;
    runtimeState.recentFeedback.push({ at, path, args, source });
    if (runtimeState.recentFeedback.length > RECENT_FEEDBACK_LIMIT) {
        runtimeState.recentFeedback.shift();
    }
    logger.debug(`[READ_OSC] ${source ?? "unknown"} ${path ?? "unknown"} args=${JSON.stringify(args ?? [])}`);
}
async function initFeedbackListener(config) {
    const logger = getLogger();
    runtimeState.feedbackListening = false;
    runtimeState.feedbackListenHost = "0.0.0.0";
    runtimeState.feedbackListenPort = config.qlcOscOutputPort;
    runtimeState.lastFeedbackError = null;
    runtimeState.lastFeedbackErrorAt = null;
    try {
        const plugin = new OSC.DatagramPlugin();
        const listener = new OSC({ plugin });
        feedbackOscInstance = listener;
        if (listener.on) {
            listener.on("*", recordFeedback);
            listener.on("error", (err) => {
                const message = err instanceof Error ? err.message : String(err);
                runtimeState.lastFeedbackError = message;
                runtimeState.lastFeedbackErrorAt = nowIso();
                logger.warn(`QLC+ OSC feedback listener error: ${message}`);
            });
        }
        await listener.open({
            host: runtimeState.feedbackListenHost,
            port: runtimeState.feedbackListenPort,
        });
        runtimeState.feedbackListening = true;
        logger.info(`QLC+ OSC feedback listener open on ${runtimeState.feedbackListenHost}:${runtimeState.feedbackListenPort}`);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        runtimeState.lastFeedbackError = message;
        runtimeState.lastFeedbackErrorAt = nowIso();
        feedbackOscInstance = null;
        logger.warn(`QLC+ OSC feedback listener unavailable: ${message}`);
    }
}
export async function initOsc(config) {
    const logger = getLogger();
    runtimeState.initialized = false;
    runtimeState.qlcHost = config.qlcHost;
    runtimeState.qlcOscInputPort = config.qlcOscInputPort;
    runtimeState.qlcOscOutputPort = config.qlcOscOutputPort;
    runtimeState.qlcUniverse = config.qlcUniverse;
    runtimeState.dryRun = config.qlcDryRun;
    runtimeState.commandSendHost = config.qlcHost;
    runtimeState.commandSendPort = config.qlcOscInputPort;
    const plugin = new OSC.DatagramPlugin();
    oscInstance = new OSC({ plugin });
    await oscInstance.open({
        host: config.qlcHost,
        port: config.qlcOscInputPort,
    });
    runtimeState.initialized = true;
    await initFeedbackListener(config);
    logger.info(`OSC initialized - Command target: ${config.qlcHost}:${config.qlcOscInputPort}, Feedback listener: ${runtimeState.feedbackListenHost}:${config.qlcOscOutputPort}`);
}
export function getOsc() {
    if (!oscInstance) {
        throw new Error("OSC not initialized. Call initOsc() first.");
    }
    return oscInstance;
}
export async function closeOsc() {
    if (feedbackOscInstance) {
        await feedbackOscInstance.close();
        feedbackOscInstance = null;
    }
    runtimeState.feedbackListening = false;
    if (oscInstance) {
        await oscInstance.close();
        oscInstance = null;
    }
    runtimeState.initialized = false;
}
export function getOscRuntimeState(freshnessSeconds = 10) {
    const lastFeedbackTime = runtimeState.lastFeedbackAt
        ? Date.parse(runtimeState.lastFeedbackAt)
        : Number.NaN;
    const feedbackSeenRecently = Number.isFinite(lastFeedbackTime)
        ? Date.now() - lastFeedbackTime <= freshnessSeconds * 1000
        : false;
    return {
        ...runtimeState,
        feedbackSeenRecently,
        feedbackFreshnessSeconds: freshnessSeconds,
        lastFeedbackArgs: runtimeState.lastFeedbackArgs
            ? [...runtimeState.lastFeedbackArgs]
            : null,
        recentFeedback: runtimeState.recentFeedback.map((event) => ({
            ...event,
            args: event.args ? [...event.args] : null,
        })),
    };
}
export async function sendOsc(message, options, config) {
    const logger = getLogger();
    const dryRun = options?.dryRun ?? config?.qlcDryRun ?? false;
    const targetHost = config?.qlcHost ?? runtimeState.commandSendHost ?? "unknown";
    const targetPort = config?.qlcOscInputPort ?? runtimeState.commandSendPort ?? "unknown";
    const serializedArgs = JSON.stringify(message.args);
    logger.debug(`[${dryRun ? "WRITE_OSC_DRY_RUN" : "WRITE_OSC"}] ${targetHost}:${targetPort} ${message.path} args=${serializedArgs}`);
    if (dryRun) {
        return {
            success: true,
            message: "Dry run mode - not sent",
            path: message.path,
            dryRun: true,
        };
    }
    try {
        const MessageClass = OSC.Message;
        const oscMsg = new MessageClass(message.path, ...message.args);
        const packet = Buffer.from(oscMsg.pack());
        if (typeof targetPort !== "number") {
            throw new Error("OSC target port is unknown");
        }
        if (!targetHost || targetHost === "unknown") {
            throw new Error("OSC target host is unknown");
        }
        await new Promise((resolve, reject) => {
            const socket = createSocket("udp4");
            socket.once("error", (error) => {
                socket.close();
                reject(error);
            });
            socket.send(packet, targetPort, targetHost, (error) => {
                socket.close();
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
        runtimeState.sendCount += 1;
        runtimeState.lastSentAt = nowIso();
        runtimeState.lastSentPath = message.path;
        runtimeState.lastSendError = null;
        runtimeState.lastSendErrorAt = null;
        runtimeState.commandSendHost = targetHost;
        runtimeState.commandSendPort = typeof targetPort === "number" ? targetPort : runtimeState.commandSendPort;
        logger.info(`OSC sent: ${message.path}`);
        return {
            success: true,
            message: "OSC message sent",
            path: message.path,
            dryRun: false,
        };
    }
    catch (error) {
        const err = error instanceof Error ? error.message : String(error);
        runtimeState.lastSendError = err;
        runtimeState.lastSendErrorAt = nowIso();
        logger.error(`Failed to send OSC message: ${err}`);
        throw new Error(`OSC send failed: ${err}`);
    }
}
export async function sendOscBatch(messages, options, config) {
    const logger = getLogger();
    logger.debug(`Sending batch of ${messages.length} OSC messages`);
    return Promise.all(messages.map((msg) => sendOsc(msg, options, config)));
}
export function validateOscPath(path) {
    if (!path.startsWith("/")) {
        return false;
    }
    const validPattern = /^\/[\w\-\.\/]*$/;
    return validPattern.test(path);
}
export function validateDmxPath(universe, channel) {
    if (universe < 1 || channel < 1) {
        return { valid: false, path: "" };
    }
    const universeZeroBased = universe - 1;
    const channelZeroBased = channel - 1;
    const path = `/${universeZeroBased}/dmx/${channelZeroBased}`;
    return { valid: true, path };
}
export function normalizeDmxValue(value) {
    if (value > 0 && value <= 1) {
        return Math.round(value * 255);
    }
    if (value < 0 || value > 255) {
        throw new Error(`Invalid DMX value: ${value}. Expected 0-255 or 0-1 normalized.`);
    }
    return Math.round(value);
}
//# sourceMappingURL=oscClient.js.map