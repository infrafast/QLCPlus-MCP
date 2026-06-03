import fs from "fs/promises";
import { promisify } from "util";
import { unzip } from "unzipper";
import xml2js from "xml2js";
import { getLogger } from "./logger.js";
import { WidgetConfig, WidgetMapping } from "./types.js";
import path from "path";

const xmlParser = new xml2js.Parser();

interface QxwXml {
  QLC?: {
    VirtualConsole?: Array<{
      Button?: any[];
      Slider?: any[];
      SpeedDial?: any[];
      CueList?: any[];
      Chaser?: any[];
      Frame?: any[];
      Label?: any[];
    }>;
  };
}

async function extractQxwZip(
  qxwPath: string
): Promise<{
  xmlContent: string;
  hasWorkspace: boolean;
}> {
  const logger = getLogger();

  try {
    const buffer = await fs.readFile(qxwPath);

    return new Promise((resolve, reject) => {
      const parser = unzip.Parse();
      let xmlContent = "";
      let hasWorkspace = false;

      parser.on("entry", (entry) => {
        if (entry.path === "workspace.xml") {
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

      const readable = buffer as any;
      readable.pipe(parser);
    });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to extract QXW file: ${err}`);
    throw error;
  }
}

export async function parseQxwFile(
  qxwPath: string
): Promise<{ widgets: WidgetMapping[]; errors: string[] }> {
  const logger = getLogger();
  const widgets: WidgetMapping[] = [];
  const errors: string[] = [];

  try {
    logger.info(`Parsing QXW file: ${qxwPath}`);

    const { xmlContent, hasWorkspace } = await extractQxwZip(qxwPath);

    if (!hasWorkspace || !xmlContent) {
      logger.warn("workspace.xml not found in QXW file");
      return { widgets, errors: ["workspace.xml not found in QXW file"] };
    }

    const parsed = (await xmlParser.parseStringPromise(xmlContent)) as QxwXml;

    const vc = parsed.QLC?.VirtualConsole?.[0];
    if (!vc) {
      logger.warn("No VirtualConsole found in workspace");
      return { widgets, errors: ["No VirtualConsole found in workspace"] };
    }

    // Parse buttons
    if (vc.Button) {
      for (const button of vc.Button) {
        const widget = parseButton(button);
        if (widget) widgets.push(widget);
      }
    }

    // Parse sliders
    if (vc.Slider) {
      for (const slider of vc.Slider) {
        const widget = parseSlider(slider);
        if (widget) widgets.push(widget);
      }
    }

    // Parse speed dials
    if (vc.SpeedDial) {
      for (const speedDial of vc.SpeedDial) {
        const widget = parseSpeedDial(speedDial);
        if (widget) widgets.push(widget);
      }
    }

    // Parse cue lists
    if (vc.CueList) {
      for (const cueList of vc.CueList) {
        const widget = parseCueList(cueList);
        if (widget) widgets.push(widget);
      }
    }

    logger.info(
      `Parsed QXW file: found ${widgets.length} widgets, ${errors.length} errors`
    );

    return { widgets, errors };
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to parse QXW file: ${err}`);
    errors.push(err);
    return { widgets, errors };
  }
}

function parseButton(button: any): WidgetMapping | null {
  try {
    const name = button.$.Name || "button";
    const id = button.$.ID || "";

    // Try to extract OSC path from button properties
    const feedbackLowLimit = button.FeedbackLowLimit?.[0];
    const oscPath = extractOscPath(button) || `/vc/button/${id}`;

    return {
      id,
      name,
      path: oscPath,
      type: "button",
      description: `Button: ${name}`,
    };
  } catch {
    return null;
  }
}

function parseSlider(slider: any): WidgetMapping | null {
  try {
    const name = slider.$.Name || "slider";
    const id = slider.$.ID || "";
    const oscPath = extractOscPath(slider) || `/vc/slider/${id}`;

    const minValue = slider.MinValue?.[0] ? parseInt(slider.MinValue[0], 10) : 0;
    const maxValue = slider.MaxValue?.[0] ? parseInt(slider.MaxValue[0], 10) : 255;

    return {
      id,
      name,
      path: oscPath,
      type: "slider",
      description: `Slider: ${name}`,
      minValue,
      maxValue,
    };
  } catch {
    return null;
  }
}

function parseSpeedDial(speedDial: any): WidgetMapping | null {
  try {
    const name = speedDial.$.Name || "speed";
    const id = speedDial.$.ID || "";
    const oscPath = extractOscPath(speedDial) || `/vc/speed/${id}`;

    return {
      id,
      name,
      path: oscPath,
      type: "speed",
      description: `Speed Dial: ${name}`,
    };
  } catch {
    return null;
  }
}

function parseCueList(cueList: any): WidgetMapping | null {
  try {
    const name = cueList.$.Name || "cuelist";
    const id = cueList.$.ID || "";
    const oscPath = extractOscPath(cueList) || `/vc/cuelist/${id}`;

    return {
      id,
      name,
      path: oscPath,
      type: "cuelist",
      description: `Cue List: ${name}`,
    };
  } catch {
    return null;
  }
}

function extractOscPath(element: any): string | null {
  // Try to find OSC feedback or monitoring configuration
  // This is a simplified extraction - QLC+ stores OSC paths in various ways

  if (element.FeedbackAddress?.[0]) {
    return element.FeedbackAddress[0];
  }

  if (element.ControlAddress?.[0]) {
    return element.ControlAddress[0];
  }

  if (element.MonitorAddress?.[0]) {
    return element.MonitorAddress[0];
  }

  return null;
}

export async function generateWidgetsJson(
  qxwPath: string,
  outputPath: string
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
