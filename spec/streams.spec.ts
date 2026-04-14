import fse from "fs-extra";
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import assertPath from "./assert_path.js";
import helper from "./helper.js";
import jetpack from "../source/index.js";

describe("streams", () => {
  beforeEach(helper.setCleanTestCwd);
  afterEach(helper.switchBackToCorrectCwd);

  it("exposes vanilla stream methods", async () => {
    fse.outputFileSync("a.txt", "abc");

    await new Promise<void>((resolve) => {
      const input = jetpack.createReadStream("a.txt");
      const output = jetpack.createWriteStream("b.txt");
      output.on("finish", () => {
        assertPath("b.txt").shouldBeFileWithContent("abc");
        resolve();
      });
      input.pipe(output);
    });
  });

  it("stream methods respect jetpack internal CWD", async () => {
    const dir = jetpack.cwd("dir");

    fse.outputFileSync("dir/a.txt", "abc");

    await new Promise<void>((resolve) => {
      const input = dir.createReadStream("a.txt");
      const output = dir.createWriteStream("b.txt");
      output.on("finish", () => {
        assertPath("dir/b.txt").shouldBeFileWithContent("abc");
        resolve();
      });
      input.pipe(output);
    });
  });
});
