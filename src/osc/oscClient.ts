import OSC from "osc-js";
import { getLogger } from "../logger.js";
import { Config } from "../config.js";
import { OscMessage, OscSendOptions } from "../types.js";

let oscInstance: {
  open(options?: object): Promise<any> | any;
  close(): Promise<any> | any;
  send(packet: any, options?: object): Promise<any> | any;
} | null = null;

export interface OscSendResult {
  success: boolean;
  message: string;
  path: string;
  dryRun: boolean;
}

export async function initOsc(config: Config): Promise<void> {
  const logger = getLogger();

  const plugin = new (OSC as any).DatagramPlugin();
  oscInstance = new (OSC as any)({ plugin });

  await oscInstance!.open({
    host: config.qlcHost,
    port: config.qlcOscInputPort,
  });

  logger.info(
    `OSC initialized - Server: ${config.qlcHost}:${config.qlcOscInputPort}, Client: ${config.qlcHost}:${config.qlcOscOutputPort}`
  );
}

export function getOsc() {
  if (!oscInstance) {
    throw new Error("OSC not initialized. Call initOsc() first.");
  }
  return oscInstance;
}

export async function closeOsc(): Promise<void> {
  if (oscInstance) {
    await oscInstance.close();
    oscInstance = null;
  }
}

export async function sendOsc(
  message: OscMessage,
  options?: OscSendOptions,
  config?: Config
): Promise<OscSendResult> {
  const logger = getLogger();
  const dryRun = options?.dryRun ?? config?.qlcDryRun ?? false;

  logger.debug(
    `[OSC${dryRun ? " DRY_RUN" : ""}] ${message.path} <- ${JSON.stringify(message.args)}`
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
    const osc = getOsc();
    const MessageClass = (OSC as any).Message;
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
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
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
