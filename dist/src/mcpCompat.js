export function text(value) {
    return {
        content: [
            {
                type: "text",
                text: value,
            },
        ],
    };
}
export function error(value) {
    return {
        isError: true,
        content: [
            {
                type: "text",
                text: value,
            },
        ],
    };
}
//# sourceMappingURL=mcpCompat.js.map