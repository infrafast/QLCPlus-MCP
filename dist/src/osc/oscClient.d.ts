import { Config } from "../config.js";
import { OscMessage, OscSendOptions } from "../types.js";
type OscInstance = {
    open(options?: object): Promise<any> | any;
    close(): Promise<any> | any;
    send(packet: any, options?: object): Promise<any> | any;
    on?(eventName: string, cb: (...args: any[]) => void): void;
};
export interface OscSendResult {
    success: boolean;
    message: string;
    path: string;
    dryRun: boolean;
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
    feedbackSeenRecently: boolean;
    feedbackFreshnessSeconds: number;
}
export declare function initOsc(config: Config): Promise<void>;
export declare function getOsc(): OscInstance;
export declare function closeOsc(): Promise<void>;
export declare function getOscRuntimeState(freshnessSeconds?: number): OscRuntimeState;
export declare function sendOsc(message: OscMessage, options?: OscSendOptions, config?: Config): Promise<OscSendResult>;
export declare function sendOscBatch(messages: OscMessage[], options?: OscSendOptions, config?: Config): Promise<OscSendResult[]>;
export declare function validateOscPath(path: string): boolean;
export declare function validateDmxPath(universe: number, channel: number): {
    valid: boolean;
    path: string;
};
export declare function normalizeDmxValue(value: number): number;
export {};
//# sourceMappingURL=oscClient.d.ts.map