export declare const NATIVE_PROTOCOL_ID: Buffer<ArrayBuffer>;
export declare const NATIVE_HEADER_LENGTH = 7;
export declare const NATIVE_DEFAULT_KEY = 5850566428577723467n;
export declare const MAX_NATIVE_ENCRYPTED_PAYLOAD = 65535;
export declare const MAX_NATIVE_DECRYPTED_PAYLOAD: number;
export declare const NativeSectionType: {
    readonly Boolean: 0;
    readonly Integer: 1;
    readonly Float: 2;
    readonly String: 3;
    readonly ByteArray: 4;
};
export type NativeSection = boolean | number | string | Buffer;
export interface NativeFrame {
    opcode: number;
    sectionCount: number;
    payload: Buffer;
}
export declare function nativeSessionKey(customKey: string): bigint;
export declare function encryptNativePayload(clearPayload: Buffer, key: bigint): Buffer;
export declare function decryptNativePayload(ciphertext: Buffer, key: bigint, maximumSize?: number): Buffer;
export declare function nativeInt(value: number): Buffer;
export declare function nativeBoolean(value: boolean): Buffer;
export declare function nativeString(value: string): Buffer;
export declare function nativeByteArray(value: Buffer): Buffer;
export declare function makeNativePacket(opcode: number, key: bigint, sections: Buffer[]): Buffer;
export declare function parseNativeSections(payload: Buffer, count: number, requiredPrefixOnly?: boolean): NativeSection[];
export declare class NativeFrameDecoder {
    private readonly key;
    private buffer;
    constructor(key: bigint);
    push(chunk: Buffer): NativeFrame[];
    reset(): void;
}
//# sourceMappingURL=nativeCodec.d.ts.map