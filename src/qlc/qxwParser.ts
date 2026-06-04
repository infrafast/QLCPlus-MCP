import fs from "fs/promises";
import { Readable } from "stream";
import xml2js from "xml2js";
import * as unzipper from "unzipper";
import { getLogger } from "../logger.js";
import { WidgetConfig, WidgetMapping } from "../types.js";
import path from "path";

const xmlParser = new xml2js.Parser();

interface QxwXml {
  Workspace?: {
    VirtualConsole?: any[];
  };
  QLC?: {
    VirtualConsole?: any[];
  };
}

const ZIP_SIGNATURE = "PK";

async function readQxwContent(qxwPath: string): Promise<{
  xmlContent: string;
  hasWorkspace: boolean;
}> {
  const logger = getLogger();

  try {
    const buffer = await fs.readFile(qxwPath);

    if (buffer.subarray(0, 2).toString("utf-8") !== ZIP_SIGNATURE) {
      return {
        xmlContent: buffer.toString("utf-8"),
        hasWorkspace: true,
      };
    }

    return new Promise((resolve, reject) => {
      const parser = unzipper.Parse();
      let xmlContent = "";
      let hasWorkspace = false;

      parser.on("entry", (entry: any) => {
        if (entry.path.toLowerCase() === "workspace.xml") {
          hasWorkspace = true;
          let data = "";
          entry.on("data", (chunk: Buffer) => {
            data += chunk.toString("utf-8");
          });
          entry.on("end", () => {
            xmlContent = data;
          });
        } else {
          entry.autodrain();
        }
      });

      parser.on("finish", () => {
        resolve({ xmlContent, hasWorkspace });
      });

      parser.on("error", reject);

      Readable.from(buffer).pipe(parser);
    });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to read QXW file: ${err}`);
    throw error;
  }
}

export async function parseQxwFile(
  qxwPath: string,
): Promise<{ widgets: WidgetMapping[]; errors: string[] }> {
  const logger = getLogger();
  const widgets: WidgetMapping[] = [];
  const errors: string[] = [];

  try {
    logger.info(`Parsing QXW file: ${qxwPath}`);

    const { xmlContent, hasWorkspace } = await readQxwContent(qxwPath);

    if (!hasWorkspace || !xmlContent) {
      logger.warn("workspace.xml not found in QXW file");
      return { widgets, errors: ["workspace.xml not found in QXW file"] };
    }

    const parsed = (await xmlParser.parseStringPromise(xmlContent)) as QxwXml;

    const vc =
      parsed.Workspace?.VirtualConsole?.[0] || parsed.QLC?.VirtualConsole?.[0];
    if (!vc) {
      logger.warn("No VirtualConsole found in workspace");
      return { widgets, errors: ["No VirtualConsole found in workspace"] };
    }

    // Parse buttons
    for (const button of collectElements(vc, "Button")) {
      const widget = parseButton(button);
      if (widget) widgets.push(widget);
    }

    // Parse sliders
    for (const slider of collectElements(vc, "Slider")) {
      const widget = parseSlider(slider);
      if (widget) widgets.push(widget);
    }

    // Parse speed dials
    for (const speedDial of collectElements(vc, "SpeedDial")) {
      const widget = parseSpeedDial(speedDial);
      if (widget) widgets.push(widget);
    }

    // Parse cue lists
    for (const cueList of collectElements(vc, "CueList")) {
      const widget = parseCueList(cueList);
      if (widget) widgets.push(widget);
    }

    logger.info(
      `Parsed QXW file: found ${widgets.length} widgets, ${errors.length} errors`,
    );

    return { widgets, errors };
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to parse QXW file: ${err}`);
    errors.push(err);
    return { widgets, errors };
  }
}

function collectElements(element: any, tagName: string): any[] {
  if (!element || typeof element !== "object") {
    return [];
  }

  const matches: any[] = [];

  if (Array.isArray(element[tagName])) {
    matches.push(...element[tagName]);
  }

  for (const [key, value] of Object.entries(element)) {
    if (key === "$" || key === "_" || key === tagName) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const child of value) {
        matches.push(...collectElements(child, tagName));
      }
    } else if (value && typeof value === "object") {
      matches.push(...collectElements(value, tagName));
    }
  }

  return matches;
}

function getWidgetName(element: any): string | null {
  const name = element.$?.Name || element.$?.Caption || "";
  const trimmed = name.trim();

  return trimmed || null;
}

function getWidgetPath(name: string): string {
  return `/${name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ /g, "_")}`;
}

function parseButton(button: any): WidgetMapping | null {
  try {
    const id = button.$?.ID || "";
    const name = getWidgetName(button);
    const inputMapping = extractInputMapping(button);

    if (!name || !inputMapping) {
      return null;
    }

    return {
      id,
      name,
      path: getWidgetPath(name),
      type: "button",
      description: `Button: ${name} (Input Universe ${inputMapping.universe}, Channel ${inputMapping.channel})`,
    };
  } catch {
    return null;
  }
}

function parseSlider(slider: any): WidgetMapping | null {
  try {
    const id = slider.$?.ID || "";
    const name = getWidgetName(slider);
    const inputMapping = extractInputMapping(slider);

    if (!name || !inputMapping) {
      return null;
    }

    const minValue = slider.MinValue?.[0]
      ? parseInt(slider.MinValue[0], 10)
      : slider.Level?.[0]?.$?.LowLimit
        ? parseInt(slider.Level[0].$.LowLimit, 10)
        : 0;
    const maxValue = slider.MaxValue?.[0]
      ? parseInt(slider.MaxValue[0], 10)
      : slider.Level?.[0]?.$?.HighLimit
        ? parseInt(slider.Level[0].$.HighLimit, 10)
        : 255;

    return {
      id,
      name,
      path: getWidgetPath(name),
      type: "slider",
      description: `Slider: ${name} (Input Universe ${inputMapping.universe}, Channel ${inputMapping.channel})`,
      minValue,
      maxValue,
    };
  } catch {
    return null;
  }
}

function parseSpeedDial(speedDial: any): WidgetMapping | null {
  try {
    const id = speedDial.$?.ID || "";
    const name = getWidgetName(speedDial);
    const inputMapping = extractInputMapping(speedDial);

    if (!name || !inputMapping) {
      return null;
    }

    return {
      id,
      name,
      path: getWidgetPath(name),
      type: "speed",
      description: `Speed Dial: ${name} (Input Universe ${inputMapping.universe}, Channel ${inputMapping.channel})`,
    };
  } catch {
    return null;
  }
}

function parseCueList(cueList: any): WidgetMapping | null {
  try {
    const id = cueList.$?.ID || "";
    const name = getWidgetName(cueList);
    const inputMapping = extractInputMapping(cueList);

    if (!name || !inputMapping) {
      return null;
    }

    return {
      id,
      name,
      path: getWidgetPath(name),
      type: "cuelist",
      description: `Cue List: ${name} (Input Universe ${inputMapping.universe}, Channel ${inputMapping.channel})`,
    };
  } catch {
    return null;
  }
}

function extractInputMapping(
  element: any,
): { universe: number; channel: number } | null {
  const input = element.Input?.[0]?.$;
  if (!input?.Universe || input.Channel === undefined) {
    return null;
  }

  const universe = parseInt(input.Universe, 10);
  const channel = parseInt(input.Channel, 10);
  if (
    !Number.isInteger(universe) ||
    !Number.isInteger(channel) ||
    universe !== 0 ||
    channel < 0
  ) {
    return null;
  }

  return {
    universe,
    channel,
  };
}

export async function generateWidgetsJson(
  qxwPath: string,
  outputPath: string,
): Promise<WidgetConfig> {
  const logger = getLogger();

  const { widgets, errors } = await parseQxwFile(qxwPath);

  const config: WidgetConfig = {
    widgets,
    generated: true,
    generatedAt: new Date().toISOString(),
  };

  if (errors.length > 0) {
    logger.warn(`Generation completed with ${errors.length} errors`);
  }

  // Save to file
  const dir = path.dirname(outputPath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(config, null, 2));

  logger.info(`Generated widgets.json with ${widgets.length} widgets`);

  return config;
}
