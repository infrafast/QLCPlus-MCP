function isLoopbackHost(host) {
    return host === "127.0.0.1" || host === "localhost";
}
/** Give every STDIO process a distinct QLC+ key without exposing TCP 9998. */
export function loopbackAddressForProcess(pid) {
    if (!Number.isSafeInteger(pid) || pid <= 0 || pid > 0xffffff) {
        throw new Error("Cannot derive a QLC+ loopback identity from this process ID");
    }
    return `127.${(pid >>> 16) & 0xff}.${(pid >>> 8) & 0xff}.${pid & 0xff}`;
}
export function resolveNativeEndpoint(host, pid = process.pid, platform = process.platform) {
    if (host === "auto")
        host = "127.0.0.1";
    return {
        host,
        localAddress: platform === "linux" && isLoopbackHost(host)
            ? loopbackAddressForProcess(pid)
            : undefined,
    };
}
//# sourceMappingURL=nativeHost.js.map