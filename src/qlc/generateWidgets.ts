#!/usr/bin/env tsx
import { generateWidgetsJson } from "./qlc/qxwParser.js";
import { initLogger } from "./logger.js";
import { loadConfig } from "./config.js";
import path from "path";

async function main() {
  const config = loadConfig();
  const logger = initLogger(config);

  const args = process.argv.slice(2);

  if (args.length === 0) {
    logger.info("Usage: generate:widgets <path-to-project.qxw> [output-path]");
    logger.info("Example: npm run generate:widgets ./show.qxw config/widgets.generated.json");
    process.exit(1);
  }

  const qxwPath = args[0];
  const outputPath = args[1] || config.qlcWidgetsFile;

  try {
    logger.info(`Generating widgets from: ${qxwPath}`);
    logger.info(`Output: ${outputPath}`);

    const result = await generateWidgetsJson(qxwPath, outputPath);

    logger.info(`✓ Generated ${result.widgets.length} widget mappings`);
    logger.info(`✓ Saved to ${outputPath}`);
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to generate widgets: ${err}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
