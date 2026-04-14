import fse from "fs-extra";
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import assertPath from "./assert_path.js";
import helper from "./helper.js";
import jetpack from "../src/index.js";

describe("append", () => {
  beforeEach(helper.setCleanTestCwd);
  afterEach(helper.switchBackToCorrectCwd);

  describe("appends String to file", () => {
    const preparations = () => {
      fse.writeFileSync("file.txt", "abc");
    };

    const expectations = () => {
      assertPath("file.txt").shouldBeFileWithContent("abcxyz");
    };

    it("sync", () => {
      preparations();
      jetpack.append("file.txt", "xyz");
      expectations();
    });

    it("async", async () => {
      preparations();
      await jetpack.appendAsync("file.txt", "xyz");
      expectations();
    });
  });

  describe("appends Buffer to file", () => {
    const preparations = () => {
      fse.writeFileSync("file.bin", Buffer.from([11]));
    };

    const expectations = () => {
      assertPath("file.bin").shouldBeFileWithContent(Buffer.from([11, 22]));
    };

    it("sync", () => {
      preparations();
      jetpack.append("file.bin", Buffer.from([22]));
      expectations();
    });

    it("async", async () => {
      preparations();
      await jetpack.appendAsync("file.bin", Buffer.from([22]));
      expectations();
    });
  });

  describe("if file doesn't exist creates it", () => {
    const expectations = () => {
      assertPath("file.txt").shouldBeFileWithContent("xyz");
    };

    it("sync", () => {
      jetpack.append("file.txt", "xyz");
      expectations();
    });

    it("async", async () => {
      await jetpack.appendAsync("file.txt", "xyz");
      expectations();
    });
  });

  describe("if parent directory doesn't exist creates it", () => {
    const expectations = () => {
      assertPath("dir/dir/file.txt").shouldBeFileWithContent("xyz");
    };

    it("sync", () => {
      jetpack.append("dir/dir/file.txt", "xyz");
      expectations();
    });

    it("async", async () => {
      await jetpack.appendAsync("dir/dir/file.txt", "xyz");
      expectations();
    });
  });

  describe("respects internal CWD of jetpack instance", () => {
    const preparations = () => {
      fse.outputFileSync("a/b.txt", "abc");
    };

    const expectations = () => {
      assertPath("a/b.txt").shouldBeFileWithContent("abcxyz");
    };

    it("sync", () => {
      const jetContext = jetpack.cwd("a");
      preparations();
      jetContext.append("b.txt", "xyz");
      expectations();
    });

    it("async", async () => {
      const jetContext = jetpack.cwd("a");
      preparations();
      await jetContext.appendAsync("b.txt", "xyz");
      expectations();
    });
  });

  describe("input validation", () => {
    const tests = [
      { type: "sync", method: jetpack.append as any, methodName: "append" },
      {
        type: "async",
        method: jetpack.appendAsync as any,
        methodName: "appendAsync",
      },
    ];

    describe('"path" argument', () => {
      tests.forEach((test) => {
        it(test.type, async () => {
          if (test.type === "async") {
            await assert.rejects(() => test.method(undefined, "xyz"), {
              message: `Argument "path" passed to ${test.methodName}(path, data, [options]) must be a string. Received undefined`,
            });
          } else {
            assert.throws(
              () => {
                test.method(undefined, "xyz");
              },
              {
                message: `Argument "path" passed to ${test.methodName}(path, data, [options]) must be a string. Received undefined`,
              },
            );
          }
        });
      });
    });

    describe('"data" argument', () => {
      tests.forEach((test) => {
        it(test.type, async () => {
          if (test.type === "async") {
            await assert.rejects(() => test.method("abc"), {
              message: `Argument "data" passed to ${test.methodName}(path, data, [options]) must be a string or a buffer. Received undefined`,
            });
          } else {
            assert.throws(
              () => {
                test.method("abc");
              },
              {
                message: `Argument "data" passed to ${test.methodName}(path, data, [options]) must be a string or a buffer. Received undefined`,
              },
            );
          }
        });
      });
    });

    describe('"options" object', () => {
      describe('"mode" argument', () => {
        tests.forEach((test) => {
          it(test.type, async () => {
            if (test.type === "async") {
              await assert.rejects(
                () => test.method("abc", "xyz", { mode: true }),
                {
                  message: `Argument "options.mode" passed to ${test.methodName}(path, data, [options]) must be a string or a number. Received boolean`,
                },
              );
            } else {
              assert.throws(
                () => {
                  test.method("abc", "xyz", { mode: true });
                },
                {
                  message: `Argument "options.mode" passed to ${test.methodName}(path, data, [options]) must be a string or a number. Received boolean`,
                },
              );
            }
          });
        });
      });
    });
  });

  if (process.platform !== "win32") {
    describe("sets file mode on created file (unix only)", () => {
      const expectations = () => {
        assertPath("file.txt").shouldHaveMode("711");
      };

      it("sync", () => {
        jetpack.append("file.txt", "abc", { mode: "711" });
        expectations();
      });

      it("async", async () => {
        await jetpack.appendAsync("file.txt", "abc", { mode: "711" });
        expectations();
      });
    });
  }
});
