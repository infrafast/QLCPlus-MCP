import { type NativeWidget } from "./nativeInventory.js";
export declare const NET_AUTHENTICATION = 65282;
export declare const NET_AUTHENTICATION_REPLY = 65283;
export declare const NET_PROJECT_TRANSFER = 65286;
export declare const VC_BUTTON_SET_PRESSED = 61952;
export type NativeConnectionState = "disabled" | "connecting" | "waiting-for-authorization" | "downloading-project" | "ready" | "disconnected" | "stopped";
export interface NativeClientOptions {
    enabled: boolean;
    host: string;
    port: number;
    encryptionKey: string;
    reconnectMs: number;
    connectTimeoutMs: number;
    maximumProjectSize: number;
    clientName: string;
    dryRun: boolean;
}
export interface NativeRuntimeState {
    enabled: boolean;
    state: NativeConnectionState;
    ready: boolean;
    host: string;
    port: number;
    clientName: string;
    connectedAt: string | null;
    authorizedAt: string | null;
    inventoryLoadedAt: string | null;
    inventoryGeneration: number;
    widgetCount: number;
    buttonCount: number;
    sliderCount: number;
    reconnectCount: number;
    lastDisconnectedAt: string | null;
    lastErrorAt: string | null;
    lastError: string | null;
    sentCount: number;
    lastSentAt: string | null;
    lastSentWidgetId: number | null;
    lastSentCaption: string | null;
}
export declare class QlcNativeClient {
    private readonly options;
    private socket;
    private reconnectTimer;
    private connectTimer;
    private stopped;
    private decoder;
    private inventory;
    private projectChunks;
    private projectLength;
    private expectedProjectSize;
    private projectStarted;
    private state;
    private lastLoggedError;
    private stateLogTimes;
    constructor(options: NativeClientOptions);
    start(): void;
    stop(): void;
    getState(): NativeRuntimeState;
    listWidgets(): NativeWidget[];
    pressButton(caption: string): Promise<NativeWidget>;
    private writePacket;
    private connect;
    private onData;
    private handleFrame;
    private handleProjectFrame;
    private appendProjectChunk;
    private onClose;
    private invalidateInventory;
    private resetProjectTransfer;
    private setConnectionState;
    private recordError;
}
export declare function initNativeClient(options: NativeClientOptions): QlcNativeClient;
export declare function getNativeClient(): QlcNativeClient | null;
export declare function getNativeRuntimeState(): NativeRuntimeState | null;
//# sourceMappingURL=nativeClient.d.ts.map