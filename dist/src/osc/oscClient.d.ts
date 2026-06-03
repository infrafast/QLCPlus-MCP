import { Config } from "../config.js";
import { OscMessage, OscSendOptions } from "../types.js";
export interface OscSendResult {
    success: boolean;
    message: string;
    path: string;
    dryRun: boolean;
}
export declare function initOsc(config: Config): Promise<void>;
export declare function getOsc(): {
    open(options?: object): Promise<any> | any;
    close(): Promise<any> | any;
    send(packet: any, options?: object): Promise<any> | any;
};
export declare function closeOsc(): Promise<void>;
export declare function sendOsc(message: OscMessage, options?: OscSendOptions, config?: Config): Promise<OscSendResult>;
export declare function sendOscBatch(messages: OscMessage[], options?: OscSendOptions, config?: Config): Promise<OscSendResult[]>;
export declare function validateOscPath(path: string): boolean;
export declare function validateDmxPath(universe: number, channel: number): {
    valid: boolean;
    path: string;
};
export declare function normalizeDmxValue(value: number): number;
//# sourceMappingURL=oscClient.d.ts.map