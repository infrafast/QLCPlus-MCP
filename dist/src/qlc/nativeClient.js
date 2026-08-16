import net from "node:net";
import { getLogger } from "../logger.js";
import { NativeFrameDecoder, makeNativePacket, nativeByteArray, nativeSessionKey, nativeString, parseNativeSections, } from "./nativeCodec.js";
import { parseNativeProjectInventory, } from "./nativeInventory.js";
export const NET_AUTHENTICATION = 0xff02;
export const NET_AUTHENTICATION_REPLY = 0xff03;
export const NET_PROJECT_TRANSFER = 0xff06;
const EMPTY_INVENTORY = {
    buttons: new Map(),
    sliders: new Map(),
    widgets: [],
};
const isoNow = () => new Date().toISOString();
const RECONNECT_LOG_REPEAT_MS = 30_000;
export class QlcNativeClient {
    options;
    socket = null;
    reconnectTimer = null;
    connectTimer = null;
    stopped = false;
    decoder;
    inventory = EMPTY_INVENTORY;
    projectChunks = [];
    projectLength = 0;
    expectedProjectSize = null;
    projectStarted = false;
    state;
    lastLoggedError = null;
    stateLogTimes = new Map();
    constructor(options) {
        this.options = options;
        this.decoder = new NativeFrameDecoder(nativeSessionKey(options.encryptionKey));
        this.state = {
            enabled: options.enabled,
            state: options.enabled ? "disconnected" : "disabled",
            ready: false,
            host: options.host,
            port: options.port,
            clientName: options.clientName,
            connectedAt: null,
            authorizedAt: null,
            inventoryLoadedAt: null,
            inventoryGeneration: 0,
            widgetCount: 0,
            buttonCount: 0,
            sliderCount: 0,
            reconnectCount: 0,
            lastDisconnectedAt: null,
            lastErrorAt: null,
            lastError: null,
        };
    }
    start() {
        if (!this.options.enabled || this.options.dryRun || this.stopped)
            return;
        this.connect();
    }
    stop() {
        this.stopped = true;
        if (this.reconnectTimer)
            clearTimeout(this.reconnectTimer);
        if (this.connectTimer)
            clearTimeout(this.connectTimer);
        this.reconnectTimer = null;
        this.connectTimer = null;
        this.socket?.destroy();
        this.socket = null;
        this.invalidateInventory();
        this.setConnectionState("stopped");
    }
    getState() {
        return { ...this.state };
    }
    listWidgets() {
        return this.inventory.widgets.map((widget) => ({
            ...widget,
            framePath: [...widget.framePath],
        }));
    }
    connect() {
        if (this.stopped || this.socket)
            return;
        const logger = getLogger();
        this.setConnectionState("connecting");
        this.decoder.reset();
        this.resetProjectTransfer();
        const socket = net.createConnection({
            host: this.options.host,
            port: this.options.port,
        });
        this.socket = socket;
        socket.setNoDelay(true);
        socket.setKeepAlive(true, 5_000);
        this.connectTimer = setTimeout(() => {
            socket.destroy(new Error("QLC+ native connection timed out"));
        }, this.options.connectTimeoutMs);
        socket.once("connect", () => {
            if (this.connectTimer)
                clearTimeout(this.connectTimer);
            this.connectTimer = null;
            this.state.connectedAt = isoNow();
            this.setConnectionState("waiting-for-authorization");
            const key = nativeSessionKey(this.options.encryptionKey);
            socket.write(makeNativePacket(NET_AUTHENTICATION, key, [
                nativeByteArray(Buffer.from(key.toString(16), "ascii")),
                nativeString(this.options.clientName),
            ]));
            logger.warn(`Authorize '${this.options.clientName}' in QLC+ if prompted`);
        });
        socket.on("data", (chunk) => this.onData(chunk));
        socket.once("error", (error) => this.recordError(error));
        socket.once("close", () => this.onClose(socket));
    }
    onData(chunk) {
        try {
            for (const frame of this.decoder.push(chunk))
                this.handleFrame(frame);
        }
        catch (error) {
            this.recordError(error);
            this.socket?.destroy();
        }
    }
    handleFrame(frame) {
        if (frame.opcode === NET_AUTHENTICATION_REPLY) {
            const fields = parseNativeSections(frame.payload, Math.min(frame.sectionCount, 2), true);
            if (fields[0] !== "Success")
                throw new Error("QLC+ native authorization was refused");
            this.state.authorizedAt = isoNow();
            this.setConnectionState("downloading-project");
            return;
        }
        if (frame.opcode === NET_PROJECT_TRANSFER) {
            void this.handleProjectFrame(frame).catch((error) => {
                this.recordError(error);
                this.socket?.destroy();
            });
            return;
        }
        getLogger().debug({ opcode: frame.opcode }, "Ignoring unsupported QLC+ native opcode");
    }
    async handleProjectFrame(frame) {
        const fields = parseNativeSections(frame.payload, Math.min(frame.sectionCount, 3), true);
        const sequence = fields[0];
        if (typeof sequence !== "number")
            throw new Error("Invalid QLC+ project sequence");
        if (sequence === 0) {
            if (this.projectStarted || typeof fields[1] !== "number") {
                throw new Error("Invalid QLC+ project transfer start");
            }
            this.projectStarted = true;
            this.expectedProjectSize = fields[1];
            if (this.expectedProjectSize > this.options.maximumProjectSize) {
                throw new Error("QLC+ native project exceeds configured limit");
            }
            if (Buffer.isBuffer(fields[2]))
                this.appendProjectChunk(fields[2]);
        }
        else if (sequence === 1 || sequence === 2) {
            if (!this.projectStarted || !Buffer.isBuffer(fields[1])) {
                throw new Error("Invalid QLC+ project transfer chunk");
            }
            this.appendProjectChunk(fields[1]);
        }
        else {
            throw new Error(`Invalid QLC+ project sequence ${sequence}`);
        }
        if (sequence === 2 || this.projectLength === this.expectedProjectSize) {
            if (this.projectLength !== this.expectedProjectSize) {
                throw new Error("QLC+ project ended before its declared size");
            }
            const nextInventory = await parseNativeProjectInventory(Buffer.concat(this.projectChunks, this.projectLength), this.options.maximumProjectSize);
            if (!this.socket || this.socket.destroyed)
                return;
            this.inventory = nextInventory;
            this.state.inventoryGeneration += 1;
            this.state.inventoryLoadedAt = isoNow();
            this.state.widgetCount = nextInventory.widgets.length;
            this.state.buttonCount = nextInventory.buttons.size;
            this.state.sliderCount = nextInventory.sliders.size;
            this.state.lastError = null;
            this.lastLoggedError = null;
            this.stateLogTimes.delete("connecting");
            this.stateLogTimes.delete("disconnected");
            this.setConnectionState("ready");
            this.resetProjectTransfer();
        }
    }
    appendProjectChunk(chunk) {
        this.projectLength += chunk.length;
        if (this.projectLength > this.options.maximumProjectSize ||
            (this.expectedProjectSize !== null &&
                this.projectLength > this.expectedProjectSize)) {
            throw new Error("QLC+ project exceeds its declared or configured size");
        }
        this.projectChunks.push(Buffer.from(chunk));
    }
    onClose(socket) {
        if (this.socket !== socket)
            return;
        if (this.connectTimer)
            clearTimeout(this.connectTimer);
        this.connectTimer = null;
        this.socket = null;
        this.decoder.reset();
        this.resetProjectTransfer();
        this.invalidateInventory();
        this.state.lastDisconnectedAt = isoNow();
        if (this.stopped)
            return;
        this.setConnectionState("disconnected");
        this.state.reconnectCount += 1;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, this.options.reconnectMs);
    }
    invalidateInventory() {
        this.inventory = EMPTY_INVENTORY;
        this.state.ready = false;
        this.state.widgetCount = 0;
        this.state.buttonCount = 0;
        this.state.sliderCount = 0;
    }
    resetProjectTransfer() {
        this.projectChunks = [];
        this.projectLength = 0;
        this.expectedProjectSize = null;
        this.projectStarted = false;
    }
    setConnectionState(state) {
        if (this.state.state === state)
            return;
        this.state.state = state;
        this.state.ready = state === "ready";
        const now = Date.now();
        const lastLoggedAt = this.stateLogTimes.get(state);
        if ((state === "connecting" || state === "disconnected") &&
            lastLoggedAt !== undefined &&
            now - lastLoggedAt < RECONNECT_LOG_REPEAT_MS) {
            return;
        }
        this.stateLogTimes.set(state, now);
        getLogger().info(`QLC+ native state: ${state}`);
    }
    recordError(error) {
        const message = error instanceof Error ? error.message : String(error);
        this.state.lastError = message;
        this.state.lastErrorAt = isoNow();
        if (message !== this.lastLoggedError) {
            getLogger().error(`QLC+ native connection unavailable: ${message}`);
            this.lastLoggedError = message;
        }
    }
}
let nativeClient = null;
export function initNativeClient(options) {
    nativeClient?.stop();
    nativeClient = new QlcNativeClient(options);
    nativeClient.start();
    return nativeClient;
}
export function getNativeClient() {
    return nativeClient;
}
export function getNativeRuntimeState() {
    return nativeClient?.getState() ?? null;
}
//# sourceMappingURL=nativeClient.js.map