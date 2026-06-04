import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { parseQxwFile } from "../src/qlc/qxwParser";

const tempDirs: string[] = [];

async function writeTempQxw(content: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "qlc-qxw-"));
  tempDirs.push(dir);

  const filePath = path.join(dir, "show.qxw");
  await fs.writeFile(filePath, content, "utf-8");

  return filePath;
}

afterEach(async () => {
  await Promise.all(
    tempDirs
      .splice(0)
      .map((dir) => fs.rm(dir, { recursive: true, force: true })),
  );
});

describe("QXW Parser", () => {
  it("parses plain XML QXW files with nested Virtual Console widgets", async () => {
    const qxwPath = await writeTempQxw(`<?xml version="1.0" encoding="UTF-8"?>
<Workspace xmlns="http://www.qlcplus.org/Workspace">
  <VirtualConsole>
    <Frame Caption="">
      <SoloFrame Caption="AUTOMATIC SETLIST" ID="0">
        <Button Caption="Rainbow" ID="28" Icon="">
          <Action>Toggle</Action>
        </Button>
        <Slider Caption="MOVE" ID="3" WidgetStyle="Slider">
          <Level LowLimit="0" HighLimit="255" Value="204"/>
        </Slider>
      </SoloFrame>
    </Frame>
  </VirtualConsole>
</Workspace>`);

    const result = await parseQxwFile(qxwPath);

    expect(result.errors).toEqual([]);
    expect(result.widgets).toEqual([
      {
        id: "28",
        name: "Rainbow",
        path: "/vc/button/28",
        type: "button",
        description: "Button: Rainbow",
      },
      {
        id: "3",
        name: "MOVE",
        path: "/vc/slider/3",
        type: "slider",
        description: "Slider: MOVE",
        minValue: 0,
        maxValue: 255,
      },
    ]);
  });
});
