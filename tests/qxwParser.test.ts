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
        <Button Caption="Ambient blue-yellow" ID="28" Icon="">
          <Action>Toggle</Action>
          <Input Universe="0" Channel="17393"/>
        </Button>
        <Button Caption="Été chaud" ID="31" Icon="">
          <Action>Toggle</Action>
          <Input Universe="0" Channel="17394"/>
        </Button>
        <Button Caption="Ignored" ID="29" Icon="">
          <Action>Toggle</Action>
        </Button>
        <Button Caption="Other universe" ID="30" Icon="">
          <Action>Toggle</Action>
          <Input Universe="1" Channel="126"/>
        </Button>
        <Button Caption="" ID="32" Icon="">
          <Action>Toggle</Action>
          <Input Universe="0" Channel="127"/>
        </Button>
        <Slider Caption="MOVE" ID="3" WidgetStyle="Slider">
          <Level LowLimit="0" HighLimit="255" Value="204"/>
          <Input Universe="0" Channel="1"/>
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
        name: "Ambient blue-yellow",
        path: "/ambient_blue-yellow",
        type: "button",
        description: "Button: Ambient blue-yellow (Input Universe 0, Channel 17393)",
      },
      {
        id: "31",
        name: "Été chaud",
        path: "/ete_chaud",
        type: "button",
        description: "Button: Été chaud (Input Universe 0, Channel 17394)",
      },
      {
        id: "3",
        name: "MOVE",
        path: "/move",
        type: "slider",
        description: "Slider: MOVE (Input Universe 0, Channel 1)",
        minValue: 0,
        maxValue: 255,
      },
    ]);
  });
});
