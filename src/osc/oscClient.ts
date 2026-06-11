import { createSocket } from "node:dgram";
import OSC from "osc-js";
import { getLogger } from "../logger.js";
import { Config } from "../config.js";
import { OscMessage, OscSendOptions } from "../types.js";

type OscInstance = {
  open(options?: object): Promise<any> | any;
  close(): Promise<any> | any;
  send(packet: any, options?: object): Promise<any> | any;
  on?(eventName: string, cb: (...args: any[]) => void): void;
};

let oscInstance: OscInstance | null = null;
let feedbackOscInstance: OscInstance | null = null;

const RECENT_FEEDBACK_LIMIT = 25;

export interface OscSendResult {
  success: boolean;
  message: string;
  path: string;
  dryRun: boolean;
}

export interface OscFeedbackEvent {
  at: string;
  path: string | null;
  args: unknown[] | null;
  source: string | null;
}

export interface OscRuntimeState {
  initialized: boolean;
  qlcHost: string | null;
  qlcOscInputPort: number | null;
  qlcOscOutputPort: number | null;
  qlcUniverse: number | null;
  dryRun: boolean;
  commandSendHost: string | null;
  commandSendPort: number | null;
  sendCount: number;
  lastSentAt: string | null;
  lastSentPath: string | null;
  lastSendErrorAt: string | null;
  lastSendError: string | null;
  feedbackListening: boolean;
  feedbackListenHost: string | null;
  feedbackListenPort: number | null;
  feedbackCount: number;
  lastFeedbackAt: string | null;
  lastFeedbackPath: string | null;
  lastFeedbackArgs: unknown[] | null;
  lastFeedbackSource: string | null;
  lastFeedbackErrorAt: string | null;
  lastFeedbackError: string | null;
  recentFeedback: OscFeedbackEvent[];
  feedbackSeenRecently: boolean;
  feedbackFreshnessSeconds: number;
}

const runtimeState: OscRuntimeState = {
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

function nowIso(): string {
  return new Date().toISOString();
}

function formatFeedbackSource(info: any): string | null {
  const address = info?.address ?? info?.host ?? info?.remoteAddress;
  const port = info?.port ?? info?.remotePort;
  if (!address && !port) {
    return null;
  }
  return `${address ?? "unknown"}:${port ?? "unknown"}`;
}

function recordFeedback(message: any, info?: any): void {
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

  logger.debug(
    `[READ_OSC] ${source ?? "unknown"} ${path ?? "unknown"} args=${JSON.stringify(args ?? [])}`
  );
}

async function initFeedbackListener(config: Config): Promise<void> {
  const logger = getLogger();
  runtimeState.feedbackListening = false;
  runtimeState.feedbackListenHost = "0.0.0.0";
  runtimeState.feedbackListenPort = config.qlcOscOutputPort;
  runtimeState.lastFeedbackError = null;
  runtimeState.lastFeedbackErrorAt = null;

  try {
    const plugin = new (OSC as any).DatagramPlugin();
    const listener: OscInstance = new (OSC as any)({ plugin });
    feedbackOscInstance = listener;

    if (listener.on) {
      listener.on("*", recordFeedback);
      listener.on("error", (err: unknown) => {
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
    logger.info(
      `QLC+ OSC feedback listener open on ${runtimeState.feedbackListenHost}:${runtimeState.feedbackListenPort}`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    runtimeState.lastFeedbackError = message;
    runtimeState.lastFeedbackErrorAt = nowIso();
    feedbackOscInstance = null;
    logger.warn(`QLC+ OSC feedback listener unavailable: ${message}`);
  }
}

export async function initOsc(config: Config): Promise<void> {
  const logger = getLogger();

  runtimeState.initialized = false;
  runtimeState.qlcHost = config.qlcHost;
  runtimeState.qlcOscInputPort = config.qlcOscInputPort;
  runtimeState.qlcOscOutputPort = config.qlcOscOutputPort;
  runtimeState.qlcUniverse = config.qlcUniverse;
  runtimeState.dryRun = config.qlcDryRun;
  runtimeState.commandSendHost = config.qlcHost;
  runtimeState.commandSendPort = config.qlcOscInputPort;

  const plugin = new (OSC as any).DatagramPlugin();
  oscInstance = new (OSC as any)({ plugin });

  await oscInstance!.open({
    host: config.qlcHost,
    port: config.qlcOscInputPort,
  });

  runtimeState.initialized = true;
  await initFeedbackListener(config);

  logger.info(
    `OSC initialized - Command target: ${config.qlcHost}:${config.qlcOscInputPort}, Feedback listener: ${runtimeState.feedbackListenHost}:${config.qlcOscOutputPort}`
  );
}

export function getOsc() {
  if (!oscInstance) {
    throw new Error("OSC not initialized. Call initOsc() first.");
  }
  return oscInstance;
}

export async function closeOsc(): Promise<void> {
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

export function getOscRuntimeState(freshnessSeconds = 10): OscRuntimeState {
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

export async function sendOsc(
  message: OscMessage,
  options?: OscSendOptions,
  config?: Config
): Promise<OscSendResult> {
  const logger = getLogger();
  const dryRun = options?.dryRun ?? config?.qlcDryRun ?? false;

  const targetHost = config?.qlcHost ?? runtimeState.commandSendHost ?? "unknown";
  const targetPort = config?.qlcOscInputPort ?? runtimeState.commandSendPort ?? "unknown";
  const serializedArgs = JSON.stringify(message.args);

  logger.debug(
    `[${dryRun ? "WRITE_OSC_DRY_RUN" : "WRITE_OSC"}] ${targetHost}:${targetPort} ${message.path} args=${serializedArgs}`
  );

  if (dryRun) {
    return {
      success: true,
      message: "Dry run mode - not sent",
      path: message.path,
      dryRun: true,
    };
  }

  try {
    const MessageClass = (OSC as any).Message;
    const oscMsg = new MessageClass(message.path, ...message.args);
    const packet = Buffer.from(oscMsg.pack());

    if (typeof targetPort !== "number") {
      throw new Error("OSC target port is unknown");
    }
    if (!targetHost || targetHost === "unknown") {
      throw new Error("OSC target host is unknown");
    }

    await new Promise<void>((resolve, reject) => {
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
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    runtimeState.lastSendError = err;
    runtimeState.lastSendErrorAt = nowIso();
    logger.error(`Failed to send OSC message: ${err}`);
    throw new Error(`OSC send failed: ${err}`);
  }
}

export async function sendOscBatch(
  messages: OscMessage[],
  options?: OscSendOptions,
  config?: Config
): Promise<OscSendResult[]> {
  const logger = getLogger();

  logger.debug(`Sending batch of ${messages.length} OSC messages`);

  return Promise.all(messages.map((msg) => sendOsc(msg, options, config)));
}

export function validateOscPath(path: string): boolean {
  if (!path.startsWith("/")) {
    return false;
  }

  const validPattern = /^\/[\w\-\.\/]*$/;
  return validPattern.test(path);
}

export function validateDmxPath(
  universe: number,
  channel: number
): {
  valid: boolean;
  path: string;
} {
  if (universe < 1 || channel < 1) {
    return { valid: false, path: "" };
  }

  const universeZeroBased = universe - 1;
  const channelZeroBased = channel - 1;
  const path = `/${universeZeroBased}/dmx/${channelZeroBased}`;

  return { valid: true, path };
}

export function normalizeDmxValue(value: number): number {
  if (value > 0 && value <= 1) {
    return Math.round(value * 255);
  }

  if (value < 0 || value > 255) {
    throw new Error(
      `Invalid DMX value: ${value}. Expected 0-255 or 0-1 normalized.`
    );
  }

  return Math.round(value);
}
