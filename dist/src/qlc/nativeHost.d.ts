import os from "node:os";
type NetworkInterfaces = ReturnType<typeof os.networkInterfaces>;
/** Resolve a stable RFC1918 address and avoid loopback, Tailscale and containers. */
export declare function resolveAutomaticNativeHost(interfaces?: NetworkInterfaces): string;
export declare function resolveNativeHost(host: string): string;
export {};
//# sourceMappingURL=nativeHost.d.ts.map