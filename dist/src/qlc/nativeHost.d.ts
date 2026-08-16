export interface NativeEndpoint {
    host: string;
    localAddress?: string;
}
/** Give every STDIO process a distinct QLC+ key without exposing TCP 9998. */
export declare function loopbackAddressForProcess(pid: number): string;
export declare function resolveNativeEndpoint(host: string, pid?: number, platform?: NodeJS.Platform): NativeEndpoint;
//# sourceMappingURL=nativeHost.d.ts.map