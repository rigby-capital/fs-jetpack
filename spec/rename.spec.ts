import * as pathUtil from "node:path";
import fse from "fs-extra";
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import assertPath from "./assert_path.js";
import helper from "./helper.js";
import jetpack from "../source/index.js";

describe("rename", () => {
  beforeEach(helper.setCleanTestCwd);
  afterEach(helper.switchBackToCorrectCwd);

  describe("renames file", () => {
    const preparations = () => {
      fse.outputFileSync("a/b.txt", "abc");
    };

    const expectations = () => {
      assertPath("a/b.txt").shouldNotExist();
      assertPath("a/x.txt").shouldBeFileWithContent("abc");
    };

    it("sync", () => {
      preparations();
      jetpack.rename("a/b.txt", "x.txt");
      expectations();
    });

    it("async", async () => {
      preparations();
      await jetpack.renameAsync("a/b.txt", "x.txt");
      expectations();
    });
  });

  describe("renames directory", () => {
    const preparations = () => {
      fse.outputFileSync("a/b/c.txt", "abc");
    };

    const expectations = () => {
      assertPath("a/b").shouldNotExist();
      assertPath("a/x").shouldBeDirectory();
    };

    it("sync", () => {
      preparations();
      jetpack.rename("a/b", "x");
      expectations();
    });

    it("async", async () => {
      preparations();
      await jetpack.renameAsync("a/b", "x");
      expectations();
    });
  });

  describe("overwriting behaviour", () => {
    describe("does not overwrite by default", () => {
      const preparations = () => {
        fse.outputFileSync("file1.txt", "abc");
        fse.outputFileSync("file2.txt", "xyz");
      };

      const expectations = (err: any) => {
        assert.strictEqual(err.code, "EEXIST");
        assert.ok(err.message.includes("Destination path already exists"));
        assertPath("file2.txt").shouldBeFileWithContent("xyz");
      };

      it("sync", () => {
        preparations();
        try {
          jetpack.rename("file1.txt", "file2.txt");
          throw new Error("Expected error to be thrown");
        } catch (err: any) {
          expectations(err);
        }
      });

      it("async", async () => {
        preparations();
        await assert.rejects(
          () => jetpack.renameAsync("file1.txt", "file2.txt"),
          (err: any) => {
            expectations(err);
            return true;
          },
        );
      });
    });

    describe("overwrites if it was specified", () => {
      const preparations = () => {
        fse.outputFileSync("file1.txt", "abc");
        fse.outputFileSync("file2.txt", "xyz");
      };

      const expectations = () => {
        assertPath("file1.txt").shouldNotExist();
        assertPath("file2.txt").shouldBeFileWithContent("abc");
      };

      it("sync", () => {
        preparations();
        jetpack.rename("file1.txt", "file2.txt", { overwrite: true });
        expectations();
      });

      it("async", async () => {
        preparations();
        await jetpack.renameAsync("file1.txt", "file2.txt", {
          overwrite: true,
        });
        expectations();
      });
    });
  });

  describe("can overwrite a directory", () => {
    const preparations = () => {
      fse.outputFileSync("file1.txt", "abc");
      fse.mkdirsSync("dir");
    };

    const expectations = () => {
      assertPath("file1.txt").shouldNotExist();
      assertPath("dir").shouldBeFileWithContent("abc");
    };

    it("sync", () => {
      preparations();
      jetpack.rename("file1.txt", "dir", { overwrite: true });
      expectations();
    });

    it("async", async () => {
      preparations();
      await jetpack.renameAsync("file1.txt", "dir", { overwrite: true });
      expectations();
    });
  });

  describe("respects internal CWD of jetpack instance", () => {
    const preparations = () => {
      fse.outputFileSync("a/b/c.txt", "abc");
    };

    const expectations = () => {
      assertPath("a/b").shouldNotExist();
      assertPath("a/x").shouldBeDirectory();
    };

    it("sync", () => {
      const jetContext = jetpack.cwd("a");
      preparations();
      jetContext.rename("b", "x");
      expectations();
    });

    it("async", async () => {
      const jetContext = jetpack.cwd("a");
      preparations();
      await jetContext.renameAsync("b", "x");
      expectations();
    });
  });

  describe("input validation", () => {
    const tests = [
      { type: "sync", method: jetpack.rename as any, methodName: "rename" },
      {
        type: "async",
        method: jetpack.renameAsync as any,
        methodName: "renameAsync",
      },
    ];

    describe('"path" argument', () => {
      tests.forEach((test) => {
        it(test.type, async () => {
          if (test.type === "async") {
            await assert.rejects(() => test.method(undefined, "xyz"), {
              message: `Argument "path" passed to ${test.methodName}(path, newName, [options]) must be a string. Received undefined`,
            });
          } else {
            assert.throws(
              () => {
                test.method(undefined, "xyz");
              },
              {
                message: `Argument "path" passed to ${test.methodName}(path, newName, [options]) must be a string. Received undefined`,
              },
            );
          }
        });
      });
    });

    describe('"newName" argument', () => {
      describe("type check", () => {
        tests.forEach((test) => {
          it(test.type, async () => {
            if (test.type === "async") {
              await assert.rejects(() => test.method("abc", undefined), {
                message: `Argument "newName" passed to ${test.methodName}(path, newName, [options]) must be a string. Received undefined`,
              });
            } else {
              assert.throws(
                () => {
                  test.method("abc", undefined);
                },
                {
                  message: `Argument "newName" passed to ${test.methodName}(path, newName, [options]) must be a string. Received undefined`,
                },
              );
            }
          });
        });
      });

      describe("shouldn't be path, just a filename", () => {
        const pathToTest = pathUtil.join("new-name", "with-a-slash");
        tests.forEach((test) => {
          it(test.type, async () => {
            if (test.type === "async") {
              await assert.rejects(() => test.method("abc", pathToTest), {
                message: `Argument "newName" passed to ${test.methodName}(path, newName, [options]) should be a filename, not a path. Received "${pathToTest}"`,
              });
            } else {
              assert.throws(
                () => {
                  test.method("abc", pathToTest);
                },
                {
                  message: `Argument "newName" passed to ${test.methodName}(path, newName, [options]) should be a filename, not a path. Received "${pathToTest}"`,
                },
              );
            }
          });
        });
      });
    });

    describe('"options" object', () => {
      describe('"overwrite" argument', () => {
        tests.forEach((test) => {
          it(test.type, async () => {
            if (test.type === "async") {
              await assert.rejects(
                () => test.method("abc", "xyz", { overwrite: 1 }),
                {
                  message: `Argument "options.overwrite" passed to ${test.methodName}(path, newName, [options]) must be a boolean. Received number`,
                },
              );
            } else {
              assert.throws(
                () => {
                  test.method("abc", "xyz", { overwrite: 1 });
                },
                {
                  message: `Argument "options.overwrite" passed to ${test.methodName}(path, newName, [options]) must be a boolean. Received number`,
                },
              );
            }
          });
        });
      });
    });
  });
});
