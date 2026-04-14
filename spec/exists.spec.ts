import fse from "fs-extra";
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import assertPath from "./assert_path.js";
import helper from "./helper.js";
import jetpack from "../src/index.js";
import { ExistsResult } from "../types";

describe("exists", () => {
  beforeEach(helper.setCleanTestCwd);
  afterEach(helper.switchBackToCorrectCwd);

  describe("returns false if file doesn't exist", () => {
    const expectations = (exists: ExistsResult) => {
      assert.strictEqual(exists, false);
    };

    it("sync", () => {
      expectations(jetpack.exists("file.txt"));
    });

    it("async", async () => {
      const exists = await jetpack.existsAsync("file.txt");
      expectations(exists);
    });
  });

  describe("returns 'dir' if directory exists on given path", () => {
    const preparations = () => {
      fse.mkdirsSync("a");
    };

    const expectations = (exists: ExistsResult) => {
      assert.strictEqual(exists, "dir");
    };

    it("sync", () => {
      preparations();
      expectations(jetpack.exists("a"));
    });

    it("async", async () => {
      preparations();
      const exists = await jetpack.existsAsync("a");
      expectations(exists);
    });
  });

  describe("returns 'file' if file exists on given path", () => {
    const preparations = () => {
      fse.outputFileSync("text.txt", "abc");
    };

    const expectations = (exists: ExistsResult) => {
      assert.strictEqual(exists, "file");
    };

    it("sync", () => {
      preparations();
      expectations(jetpack.exists("text.txt"));
    });

    it("async", async () => {
      preparations();
      const exists = await jetpack.existsAsync("text.txt");
      expectations(exists);
    });
  });

  describe("respects internal CWD of jetpack instance", () => {
    const preparations = () => {
      fse.outputFileSync("a/text.txt", "abc");
    };

    const expectations = (exists: ExistsResult) => {
      assert.strictEqual(exists, "file");
    };

    it("sync", () => {
      const jetContext = jetpack.cwd("a");
      preparations();
      expectations(jetContext.exists("text.txt"));
    });

    it("async", async () => {
      const jetContext = jetpack.cwd("a");
      preparations();
      const exists = await jetContext.existsAsync("text.txt");
      expectations(exists);
    });
  });

  describe("input validation", () => {
    const tests = [
      { type: "sync", method: jetpack.exists, methodName: "exists" },
      { type: "async", method: jetpack.existsAsync, methodName: "existsAsync" },
    ];

    describe('"path" argument', () => {
      tests.forEach((test) => {
        it(test.type, async () => {
          if (test.type === "async") {
            await assert.rejects(() => test.method(undefined), {
              message: `Argument "path" passed to ${test.methodName}(path) must be a string. Received undefined`,
            });
          } else {
            assert.throws(
              () => {
                test.method(undefined);
              },
              {
                message: `Argument "path" passed to ${test.methodName}(path) must be a string. Received undefined`,
              },
            );
          }
        });
      });
    });
  });
});
