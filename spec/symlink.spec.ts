import fse from "fs-extra";
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import assertPath from "./assert_path.js";
import helper from "./helper.js";
import jetpack from "../source/index.js";

describe("symlink", () => {
  beforeEach(helper.setCleanTestCwd);
  afterEach(helper.switchBackToCorrectCwd);

  describe("can create a symlink", () => {
    const expectations = () => {
      assert.strictEqual(fse.lstatSync("symlink").isSymbolicLink(), true);
      assert.strictEqual(fse.readlinkSync("symlink"), "some_path");
    };

    it("sync", () => {
      jetpack.symlink("some_path", "symlink");
      expectations();
    });

    it("async", async () => {
      await jetpack.symlinkAsync("some_path", "symlink");
      expectations();
    });
  });

  describe("can create nonexistent parent directories", () => {
    const expectations = () => {
      assert.strictEqual(fse.lstatSync("a/b/symlink").isSymbolicLink(), true);
    };

    it("sync", () => {
      jetpack.symlink("whatever", "a/b/symlink");
      expectations();
    });

    it("async", async () => {
      await jetpack.symlinkAsync("whatever", "a/b/symlink");
      expectations();
    });
  });

  describe("respects internal CWD of jetpack instance", () => {
    const preparations = () => {
      fse.mkdirsSync("a/b");
    };

    const expectations = () => {
      assert.strictEqual(fse.lstatSync("a/b/symlink").isSymbolicLink(), true);
    };

    it("sync", () => {
      const jetContext = jetpack.cwd("a/b");
      preparations();
      jetContext.symlink("whatever", "symlink");
      expectations();
    });

    it("async", async () => {
      const jetContext = jetpack.cwd("a/b");
      preparations();
      await jetContext.symlinkAsync("whatever", "symlink");
      expectations();
    });
  });

  describe("input validation", () => {
    const tests = [
      { type: "sync", method: jetpack.symlink as any, methodName: "symlink" },
      {
        type: "async",
        method: jetpack.symlinkAsync as any,
        methodName: "symlinkAsync",
      },
    ];

    describe('"symlinkValue" argument', () => {
      tests.forEach((test) => {
        it(test.type, async () => {
          if (test.type === "async") {
            await assert.rejects(() => test.method(undefined, "abc"), {
              message: `Argument "symlinkValue" passed to ${test.methodName}(symlinkValue, path) must be a string. Received undefined`,
            });
          } else {
            assert.throws(
              () => {
                test.method(undefined, "abc");
              },
              {
                message: `Argument "symlinkValue" passed to ${test.methodName}(symlinkValue, path) must be a string. Received undefined`,
              },
            );
          }
        });
      });
    });

    describe('"path" argument', () => {
      tests.forEach((test) => {
        it(test.type, async () => {
          if (test.type === "async") {
            await assert.rejects(() => test.method("xyz", undefined), {
              message: `Argument "path" passed to ${test.methodName}(symlinkValue, path) must be a string. Received undefined`,
            });
          } else {
            assert.throws(
              () => {
                test.method("xyz", undefined);
              },
              {
                message: `Argument "path" passed to ${test.methodName}(symlinkValue, path) must be a string. Received undefined`,
              },
            );
          }
        });
      });
    });
  });
});
