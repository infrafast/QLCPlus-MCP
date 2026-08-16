import { parseStringPromise } from "xml2js";
export function normalizeNativeCaption(value) {
    return value
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[\s_-]+/g, "");
}
function localName(value) {
    return value.split(":").at(-1)?.toLowerCase() ?? value.toLowerCase();
}
function optionalUint(value) {
    if (typeof value !== "string" || !/^\d+$/.test(value))
        return undefined;
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= 0xffffffff
        ? parsed
        : undefined;
}
function textValue(value) {
    if (typeof value === "string")
        return value.trim() || undefined;
    if (value &&
        typeof value === "object" &&
        "_" in value &&
        typeof value._ === "string") {
        return value._.trim() || undefined;
    }
    return undefined;
}
export async function parseNativeProjectInventory(xml, maximumSize = 16 * 1024 * 1024) {
    if (xml.length > maximumSize)
        throw new Error("QLC+ project exceeds native inventory limit");
    const source = xml.toString("utf8");
    if (/<!ENTITY/i.test(source))
        throw new Error("QLC+ project XML entities are not allowed");
    const doctypes = source.match(/<!DOCTYPE\b[^>]*>/gi) ?? [];
    if ((/<!DOCTYPE/i.test(source) && doctypes.length === 0) ||
        doctypes.some((value) => !/^<!DOCTYPE\s+Workspace\s*>$/i.test(value))) {
        throw new Error("QLC+ project external or extended DTD is not allowed");
    }
    const parsed = await parseStringPromise(source, {
        explicitArray: true,
        explicitRoot: true,
    });
    const buttons = new Map();
    const sliders = new Map();
    const widgets = [];
    const visit = (value, insideVirtualConsole, parentFrame, framePath = []) => {
        if (!value || typeof value !== "object")
            return;
        for (const [rawTag, rawChildren] of Object.entries(value)) {
            if (rawTag === "$" || rawTag === "_")
                continue;
            const tag = localName(rawTag);
            const children = Array.isArray(rawChildren) ? rawChildren : [rawChildren];
            for (const child of children) {
                if (!child || typeof child !== "object")
                    continue;
                const attrs = (child.$ ?? {});
                const inVc = insideVirtualConsole || tag === "virtualconsole";
                if (!inVc) {
                    visit(child, false, undefined, []);
                    continue;
                }
                if (tag === "frame" || tag === "soloframe") {
                    const caption = attrs.Caption?.trim() || attrs.Name?.trim();
                    visit(child, true, { kind: tag, id: optionalUint(attrs.ID) }, caption ? [...framePath, caption] : framePath);
                    continue;
                }
                if (tag === "button" || tag === "slider") {
                    const id = optionalUint(attrs.ID);
                    const caption = attrs.Caption?.trim() || attrs.Name?.trim();
                    if (id === undefined || !caption)
                        continue;
                    const normalizedCaption = normalizeNativeCaption(caption);
                    const map = tag === "button" ? buttons : sliders;
                    if (buttons.has(normalizedCaption) ||
                        sliders.has(normalizedCaption)) {
                        throw new Error(`Duplicate normalized QLC+ widget caption: ${caption}`);
                    }
                    const widget = {
                        id,
                        caption,
                        normalizedCaption,
                        kind: tag,
                        framePath: [...framePath],
                    };
                    if (parentFrame) {
                        widget.parentFrameKind = parentFrame.kind;
                        widget.parentFrameId = parentFrame.id;
                    }
                    for (const [rawChildTag, nestedValues] of Object.entries(child)) {
                        const childTag = localName(rawChildTag);
                        for (const nested of Array.isArray(nestedValues)
                            ? nestedValues
                            : [nestedValues]) {
                            const nestedAttrs = (nested && typeof nested === "object"
                                ? nested.$
                                : {}) ?? {};
                            if (tag === "button" && childTag === "action")
                                widget.actionType = textValue(nested)?.toLowerCase();
                            if (tag === "button" && childTag === "function")
                                widget.functionId = optionalUint(nestedAttrs.ID);
                            if (tag === "slider" && childTag === "slidermode")
                                widget.sliderMode = textValue(nested)?.toLowerCase();
                            if (tag === "slider" && childTag === "adjust")
                                widget.functionId = optionalUint(nestedAttrs.Function);
                            if (tag === "slider" &&
                                (childTag === "level" || childTag === "value")) {
                                const low = Number(nestedAttrs.LowLimit ?? nestedAttrs.Low);
                                const high = Number(nestedAttrs.HighLimit ?? nestedAttrs.High);
                                if (Number.isFinite(low) && Number.isFinite(high)) {
                                    if (low >= high)
                                        throw new Error(`Invalid QLC+ slider range: ${caption}`);
                                    widget.low = low;
                                    widget.high = high;
                                }
                            }
                        }
                    }
                    if (tag === "button" && !widget.actionType)
                        widget.actionType = "toggle";
                    if (tag === "slider") {
                        widget.low ??= 0;
                        widget.high ??= 255;
                        widget.widgetStyle = attrs.WidgetStyle;
                    }
                    map.set(normalizedCaption, widget);
                    widgets.push(widget);
                    continue;
                }
                visit(child, true, parentFrame, framePath);
            }
        }
    };
    visit(parsed, false);
    return { buttons, sliders, widgets };
}
//# sourceMappingURL=nativeInventory.js.map