import fse from "fs-extra";
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import assertPath from "./assert_path.js";
import helper from "./helper.js";
import jetpack from "../source/index.js";

describe("move", () => {
  beforeEach(helper.setCleanTestCwd);
  afterEach(helper.switchBackToCorrectCwd);

  describe("moves file", () => {
    const preparations = () => {
      fse.outputFileSync("a/b.txt", "abc");
    };

    const expectations = () => {
      assertPath("a/b.txt").shouldNotExist();
      assertPath("c.txt").shouldBeFileWithContent("abc");
    };

    it("sync", () => {
      preparations();
      jetpack.move("a/b.txt", "c.txt");
      expectations();
    });

    it("async", async () => {
      preparations();
      await jetpack.moveAsync("a/b.txt", "c.txt");
      expectations();
    });
  });

  describe("moves directory", () => {
    const preparations = () => {
      fse.outputFileSync("a/b/c.txt", "abc");
      fse.mkdirsSync("x");
    };

    const expectations = () => {
      assertPath("a").shouldNotExist();
      assertPath("x/y/b/c.txt").shouldBeFileWithContent("abc");
    };

    it("sync", () => {
      preparations();
      jetpack.move("a", "x/y");
      expectations();
    });

    it("async", async () => {
      preparations();
      await jetpack.moveAsync("a", "x/y");
      expectations();
    });
  });

  describe("creates nonexistent directories for destination path", () => {
    const preparations = () => {
      fse.outputFileSync("a.txt", "abc");
    };

    const expectations = () => {
      assertPath("a.txt").shouldNotExist();
      assertPath("a/b/z.txt").shouldBeFileWithContent("abc");
    };

    it("sync", () => {
      preparations();
      jetpack.move("a.txt", "a/b/z.txt");
      expectations();
    });

    it("async", async () => {
      preparations();
      await jetpack.moveAsync("a.txt", "a/b/z.txt");
      expectations();
    });
  });

  describe("generates nice error when source path doesn't exist", () => {
    const expectations = (err: any) => {
      assert.strictEqual(err.code, "ENOENT");
      assert.ok(err.message.includes("Path to move doesn't exist"));
    };

    it("sync", () => {
      try {
        jetpack.move("a", "b");
        throw new Error("Expected error to be thrown");
      } catch (err: any) {
        expectations(err);
      }
    });

    it("async", async () => {
      await assert.rejects(
        () => jetpack.moveAsync("a", "b"),
        (err: any) => {
          expectations(err);
          return true;
        },
      );
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
          jetpack.move("file1.txt", "file2.txt");
          throw new Error("Expected error to be thrown");
        } catch (err: any) {
          expectations(err);
        }
      });

      it("async", async () => {
        preparations();
        await assert.rejects(
          () => jetpack.moveAsync("file1.txt", "file2.txt"),
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
        jetpack.move("file1.txt", "file2.txt", { overwrite: true });
        expectations();
      });

      it("async", async () => {
        preparations();
        await jetpack.moveAsync("file1.txt", "file2.txt", { overwrite: true });
        expectations();
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
        jetpack.move("file1.txt", "dir", { overwrite: true });
        expectations();
      });

      it("async", async () => {
        preparations();
        await jetpack.moveAsync("file1.txt", "dir", { overwrite: true });
        expectations();
      });
    });
  });

  describe("respects internal CWD of jetpack instance", () => {
    const preparations = () => {
      fse.outputFileSync("a/b.txt", "abc");
    };

    const expectations = () => {
      assertPath("a/b.txt").shouldNotExist();
      assertPath("a/x.txt").shouldBeFileWithContent("abc");
    };

    it("sync", () => {
      const jetContext = jetpack.cwd("a");
      preparations();
      jetContext.move("b.txt", "x.txt");
      expectations();
    });

    it("async", async () => {
      const jetContext = jetpack.cwd("a");
      preparations();
      await jetContext.moveAsync("b.txt", "x.txt");
      expectations();
    });
  });

  describe("input validation", () => {
    const tests = [
      { type: "sync", method: jetpack.move as any, methodName: "move" },
      {
        type: "async",
        method: jetpack.moveAsync as any,
        methodName: "moveAsync",
      },
    ];

    describe('"from" argument', () => {
      tests.forEach((test) => {
        it(test.type, async () => {
          if (test.type === "async") {
            await assert.rejects(() => test.method(undefined, "xyz"), {
              message: `Argument "from" passed to ${test.methodName}(from, to, [options]) must be a string. Received undefined`,
            });
          } else {
            assert.throws(
              () => {
                test.method(undefined, "xyz");
              },
              {
                message: `Argument "from" passed to ${test.methodName}(from, to, [options]) must be a string. Received undefined`,
              },
            );
          }
        });
      });
    });

    describe('"to" argument', () => {
      tests.forEach((test) => {
        it(test.type, async () => {
          if (test.type === "async") {
            await assert.rejects(() => test.method("abc", undefined), {
              message: `Argument "to" passed to ${test.methodName}(from, to, [options]) must be a string. Received undefined`,
            });
          } else {
            assert.throws(
              () => {
                test.method("abc", undefined);
              },
              {
                message: `Argument "to" passed to ${test.methodName}(from, to, [options]) must be a string. Received undefined`,
              },
            );
          }
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
                  message: `Argument "options.overwrite" passed to ${test.methodName}(from, to, [options]) must be a boolean. Received number`,
                },
              );
            } else {
              assert.throws(
                () => {
                  test.method("abc", "xyz", { overwrite: 1 });
                },
                {
                  message: `Argument "options.overwrite" passed to ${test.methodName}(from, to, [options]) must be a boolean. Received number`,
                },
              );
            }
          });
        });
      });
    });
  });
});
