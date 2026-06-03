import * as OSC from "osc-js";
import { getLogger } from "../logger.js";
let oscInstance = null;
export async function initOsc(config) {
    const logger = getLogger();
    const plugin = new OSC.DatagramPlugin();
    oscInstance = new OSC({ plugin });
    await oscInstance.open({
        host: config.qlcHost,
        port: config.qlcOscInputPort,
    });
    logger.info(`OSC initialized - Server: ${config.qlcHost}:${config.qlcOscInputPort}, Client: ${config.qlcHost}:${config.qlcOscOutputPort}`);
}
export function getOsc() {
    if (!oscInstance) {
        throw new Error("OSC not initialized. Call initOsc() first.");
    }
    return oscInstance;
}
export async function closeOsc() {
    if (oscInstance) {
        await oscInstance.close();
        oscInstance = null;
    }
}
export async function sendOsc(message, options, config) {
    const logger = getLogger();
    const dryRun = options?.dryRun ?? config?.qlcDryRun ?? false;
    logger.debug(`[OSC${dryRun ? " DRY_RUN" : ""}] ${message.path} <- ${JSON.stringify(message.args)}`);
    if (dryRun) {
        return {
            success: true,
            message: "Dry run mode - not sent",
            path: message.path,
            dryRun: true,
        };
    }
    try {
        const osc = getOsc();
        const MessageClass = OSC.Message;
        const oscMsg = new MessageClass(message.path, ...message.args);
        await osc.send(oscMsg, {
            host: config?.qlcHost,
            port: config?.qlcOscOutputPort,
        });
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