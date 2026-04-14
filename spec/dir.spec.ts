import fse from "fs-extra";
import * as pathUtil from "node:path";
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import assertPath from "./assert_path.js";
import helper from "./helper.js";
import jetpack, { type FSJetpack } from "../source/index.js";

describe("dir", () => {
  beforeEach(helper.setCleanTestCwd);
  afterEach(helper.switchBackToCorrectCwd);

  describe("creates directory if it doesn't exist", () => {
    const expectations = () => {
      assertPath("x").shouldBeDirectory();
    };

    it("sync", () => {
      jetpack.dir("x");
      expectations();
    });

    it("async", async () => {
      await jetpack.dirAsync("x");
      expectations();
    });
  });

  describe("does nothing if directory already exists", () => {
    const preparations = () => {
      fse.mkdirsSync("x");
    };

    const expectations = () => {
      assertPath("x").shouldBeDirectory();
    };

    it("sync", () => {
      preparations();
      jetpack.dir("x");
      expectations();
    });

    it("async", async () => {
      preparations();
      await jetpack.dirAsync("x");
      expectations();
    });
  });

  describe("creates nested directories if necessary", () => {
    const expectations = () => {
      assertPath("a/b/c").shouldBeDirectory();
    };

    it("sync", () => {
      jetpack.dir("a/b/c");
      expectations();
    });

    it("async", async () => {
      await jetpack.dirAsync("a/b/c");
      expectations();
    });
  });

  describe("handles well two calls racing to create the same directory", () => {
    const expectations = () => {
      assertPath("a/b/c").shouldBeDirectory();
    };

    it("async", async () => {
      await Promise.all([jetpack.dirAsync("a/b/c"), jetpack.dirAsync("a/b/c")]);
      expectations();
    });
  });

  describe("doesn't touch directory content by default", () => {
    const preparations = () => {
      fse.mkdirsSync("a/b");
      fse.outputFileSync("a/c.txt", "abc");
    };

    const expectations = () => {
      assertPath("a/b").shouldBeDirectory();
      assertPath("a/c.txt").shouldBeFileWithContent("abc");
    };

    it("sync", () => {
      preparations();
      jetpack.dir("a");
      expectations();
    });

    it("async", async () => {
      preparations();
      await jetpack.dirAsync("a");
      expectations();
    });
  });

  describe("makes directory empty if that option specified", () => {
    const preparations = () => {
      fse.outputFileSync("a/b/file.txt", "abc");
    };

    const expectations = () => {
      assertPath("a/b/file.txt").shouldNotExist();
      assertPath("a").shouldBeDirectory();
    };

    it("sync", () => {
      preparations();
      jetpack.dir("a", { empty: true });
      expectations();
    });

    it("async", async () => {
      preparations();
      await jetpack.dirAsync("a", { empty: true });
      expectations();
    });
  });

  describe("throws if given path is something other than directory", () => {
    const preparations = () => {
      fse.outputFileSync("a", "abc");
    };

    const expectations = (err: any) => {
      assert.ok(err.message.includes("exists but is not a directory"));
    };

    it("sync", () => {
      preparations();
      try {
        jetpack.dir("a");
        throw new Error("Expected error to be thrown");
      } catch (err: any) {
        expectations(err);
      }
    });

    it("async", async () => {
      preparations();
      await assert.rejects(
        () => jetpack.dirAsync("a"),
        (err: any) => {
          expectations(err);
          return true;
        },
      );
    });
  });

  describe("respects internal CWD of jetpack instance", () => {
    const expectations = () => {
      assertPath("a/b").shouldBeDirectory();
    };

    it("sync", () => {
      const jetContext = jetpack.cwd("a");
      jetContext.dir("b");
      expectations();
    });

    it("async", async () => {
      const jetContext = jetpack.cwd("a");
      await jetContext.dirAsync("b");
      expectations();
    });
  });

  describe("returns jetack instance pointing on this directory", () => {
    const expectations = (jetpackContext: FSJetpack) => {
      assert.strictEqual(jetpackContext.cwd(), pathUtil.resolve("a"));
    };

    it("sync", () => {
      expectations(jetpack.dir("a"));
    });

    it("async", async () => {
      const jetpackContext = await jetpack.dirAsync("a");
      expectations(jetpackContext);
    });
  });

  if (process.platform !== "win32") {
    describe("sets mode to newly created directory (unix only)", () => {
      const expectations = () => {
        assertPath("a").shouldHaveMode("511");
      };

      it("sync, mode passed as string", () => {
        jetpack.dir("a", { mode: "511" });
        expectations();
      });

      it("sync, mode passed as number", () => {
        jetpack.dir("a", { mode: 0o511 });
        expectations();
      });

      it("async, mode passed as string", async () => {
        await jetpack.dirAsync("a", { mode: "511" });
        expectations();
      });

      it("async, mode passed as number", async () => {
        await jetpack.dirAsync("a", { mode: 0o511 });
        expectations();
      });
    });

    describe("sets desired mode to every created directory (unix only)", () => {
      const expectations = () => {
        assertPath("a").shouldHaveMode("711");
        assertPath("a/b").shouldHaveMode("711");
      };

      it("sync", () => {
        jetpack.dir("a/b", { mode: "711" });
        expectations();
      });

      it("async", async () => {
        await jetpack.dirAsync("a/b", { mode: "711" });
        expectations();
      });
    });

    describe("changes mode of existing directory to desired (unix only)", () => {
      const preparations = () => {
        fse.mkdirSync("a", "777");
      };
      const expectations = () => {
        assertPath("a").shouldHaveMode("511");
      };

      it("sync", () => {
        preparations();
        jetpack.dir("a", { mode: "511" });
        expectations();
      });

      it("async", async () => {
        preparations();
        await jetpack.dirAsync("a", { mode: "511" });
        expectations();
      });
    });

    describe("leaves mode of directory intact by default (unix only)", () => {
      const preparations = () => {
        fse.mkdirSync("a", "700");
      };

      const expectations = () => {
        assertPath("a").shouldHaveMode("700");
      };

      it("sync", () => {
        preparations();
        jetpack.dir("a");
        expectations();
      });

      it("async", async () => {
        preparations();
        await jetpack.dirAsync("a");
        expectations();
      });
    });
  } else {
    describe("specyfying mode have no effect and throws no error (windows only)", () => {
      const expectations = () => {
        assertPath("x").shouldBeDirectory();
      };

      it("sync", () => {
        jetpack.dir("x", { mode: "511" });
        expectations();
      });

      it("async", async () => {
        await jetpack.dirAsync("x", { mode: "511" });
        expectations();
      });
    });
  }

  describe("input validation", () => {
    const tests = [
      { type: "sync", method: jetpack.dir as any, methodName: "dir" },
      {
        type: "async",
        method: jetpack.dirAsync as any,
        methodName: "dirAsync",
      },
    ];

    describe('"path" argument', () => {
      tests.forEach((test) => {
        it(test.type, async () => {
          if (test.type === "async") {
            await assert.rejects(() => test.method(undefined), {
              message: `Argument "path" passed to ${test.methodName}(path, [criteria]) must be a string. Received undefined`,
            });
          } else {
            assert.throws(
              () => {
                test.method(undefined);
              },
              {
                message: `Argument "path" passed to ${test.methodName}(path, [criteria]) must be a string. Received undefined`,
              },
            );
          }
        });
      });
    });

    describe('"criteria" object', () => {
      describe('"empty" argument', () => {
        tests.forEach((test) => {
          it(test.type, async () => {
            if (test.type === "async") {
              await assert.rejects(() => test.method("abc", { empty: 1 }), {
                message: `Argument "criteria.empty" passed to ${test.methodName}(path, [criteria]) must be a boolean. Received number`,
              });
            } else {
              assert.throws(
                () => {
                  test.method("abc", { empty: 1 });
                },
                {
                  message: `Argument "criteria.empty" passed to ${test.methodName}(path, [criteria]) must be a boolean. Received number`,
                },
              );
            }
          });
        });
      });
      describe('"mode" argument', () => {
        tests.forEach((test) => {
          it(test.type, async () => {
            if (test.type === "async") {
              await assert.rejects(() => test.method("abc", { mode: true }), {
                message: `Argument "criteria.mode" passed to ${test.methodName}(path, [criteria]) must be a string or a number. Received boolean`,
              });
            } else {
              assert.throws(
                () => {
                  test.method("abc", { mode: true });
                },
                {
                  message: `Argument "criteria.mode" passed to ${test.methodName}(path, [criteria]) must be a string or a number. Received boolean`,
                },
              );
            }
          });
        });
      });
    });
  });
});
