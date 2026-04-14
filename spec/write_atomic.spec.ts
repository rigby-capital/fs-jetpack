import fse from "fs-extra";
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import assertPath from "./assert_path.js";
import helper from "./helper.js";
import jetpack from "../src/index.js";

describe("atomic write", () => {
  const filePath = "file.txt";
  const tempPath = `${filePath}.__new__`;

  beforeEach(helper.setCleanTestCwd);
  afterEach(helper.switchBackToCorrectCwd);

  describe("fresh write (file doesn't exist yet)", () => {
    const expectations = () => {
      assertPath(filePath).shouldBeFileWithContent("abc");
      assertPath(tempPath).shouldNotExist();
    };

    it("sync", () => {
      jetpack.write(filePath, "abc", { atomic: true });
      expectations();
    });

    it("async", async () => {
      await jetpack.writeAsync(filePath, "abc", { atomic: true });
      expectations();
    });
  });

  describe("overwrite existing file", () => {
    const preparations = () => {
      fse.outputFileSync(filePath, "xyz");
    };

    const expectations = () => {
      assertPath(filePath).shouldBeFileWithContent("abc");
      assertPath(tempPath).shouldNotExist();
    };

    it("sync", () => {
      preparations();
      jetpack.write(filePath, "abc", { atomic: true });
      expectations();
    });

    it("async", async () => {
      preparations();
      await jetpack.writeAsync(filePath, "abc", { atomic: true });
      expectations();
    });
  });

  describe("if previous operation failed", () => {
    const preparations = () => {
      fse.outputFileSync(filePath, "xyz");
      // Simulating remained file from interrupted previous write attempt.
      fse.outputFileSync(tempPath, "123");
    };

    const expectations = () => {
      assertPath(filePath).shouldBeFileWithContent("abc");
      assertPath(tempPath).shouldNotExist();
    };

    it("sync", () => {
      preparations();
      jetpack.write(filePath, "abc", { atomic: true });
      expectations();
    });

    it("async", async () => {
      preparations();
      await jetpack.writeAsync(filePath, "abc", { atomic: true });
      expectations();
    });
  });
});
