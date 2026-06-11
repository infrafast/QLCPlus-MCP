import { Config } from "../config.js";
import { OscMessage, OscSendOptions } from "../types.js";
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
export declare function initOsc(config: Config): Promise<void>;
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
//# sourceMappingURL=oscClient.d.ts.map