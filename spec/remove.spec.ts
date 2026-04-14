import fse from "fs-extra";
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import assertPath from "./assert_path.js";
import helper from "./helper.js";
import jetpack from "../src/index.js";

describe("remove", () => {
  beforeEach(helper.setCleanTestCwd);
  afterEach(helper.switchBackToCorrectCwd);

  describe("doesn't throw if path already doesn't exist", () => {
    it("sync", () => {
      jetpack.remove("dir");
    });

    it("async", async () => {
      await jetpack.removeAsync("dir");
    });
  });

  describe("should delete file", () => {
    const preparations = () => {
      fse.outputFileSync("file.txt", "abc");
    };

    const expectations = () => {
      assertPath("file.txt").shouldNotExist();
    };

    it("sync", () => {
      preparations();
      jetpack.remove("file.txt");
      expectations();
    });

    it("async", async () => {
      preparations();
      await jetpack.removeAsync("file.txt");
      expectations();
    });
  });

  describe("removes directory with stuff inside", () => {
    const preparations = () => {
      fse.mkdirsSync("a/b/c");
      fse.outputFileSync("a/f.txt", "abc");
      fse.outputFileSync("a/b/f.txt", "123");
    };

    const expectations = () => {
      assertPath("a").shouldNotExist();
    };

    it("sync", () => {
      preparations();
      jetpack.remove("a");
      expectations();
    });

    it("async", async () => {
      preparations();
      await jetpack.removeAsync("a");
      expectations();
    });
  });

  describe("will retry attempt if file is locked", () => {
    const preparations = () => {
      fse.mkdirsSync("a/b/c");
      fse.outputFileSync("a/f.txt", "abc");
      fse.outputFileSync("a/b/f.txt", "123");
    };

    const expectations = () => {
      assertPath("a").shouldNotExist();
    };

    it("async", async () => {
      preparations();

      await new Promise<void>((resolve, reject) => {
        fse.open("a/f.txt", "w", (err: any, fd: number) => {
          if (err) {
            reject(err);
          } else {
            // Unlock the file after some time.
            setTimeout(() => {
              fse.close(fd);
            }, 150);

            jetpack
              .removeAsync("a")
              .then(() => {
                expectations();
                resolve();
              })
              .catch(reject);
          }
        });
      });
    });
  });

  describe("respects internal CWD of jetpack instance", () => {
    const preparations = () => {
      fse.outputFileSync("a/b/c.txt", "123");
    };

    const expectations = () => {
      assertPath("a").shouldBeDirectory();
      assertPath("a/b").shouldNotExist();
    };

    it("sync", () => {
      const jetContext = jetpack.cwd("a");
      preparations();
      jetContext.remove("b");
      expectations();
    });

    it("async", async () => {
      const jetContext = jetpack.cwd("a");
      preparations();
      await jetContext.removeAsync("b");
      expectations();
    });
  });

  describe("can be called with no parameters, what will remove CWD directory", () => {
    const preparations = () => {
      fse.outputFileSync("a/b/c.txt", "abc");
    };

    const expectations = () => {
      assertPath("a").shouldNotExist();
    };

    it("sync", () => {
      const jetContext = jetpack.cwd("a");
      preparations();
      jetContext.remove();
      expectations();
    });

    it("async", async () => {
      const jetContext = jetpack.cwd("a");
      preparations();
      await jetContext.removeAsync();
      expectations();
    });
  });

  describe("removes only symlinks, never real content where symlinks point", () => {
    const preparations = () => {
      fse.outputFileSync("have_to_stay_file", "abc");
      fse.mkdirsSync("to_remove");
      fse.symlinkSync("../have_to_stay_file", "to_remove/symlink");
      // Make sure we symlinked it properly.
      assert.strictEqual(fse.readFileSync("to_remove/symlink", "utf8"), "abc");
    };

    const expectations = () => {
      assertPath("have_to_stay_file").shouldBeFileWithContent("abc");
      assertPath("to_remove").shouldNotExist();
    };

    it("sync", () => {
      preparations();
      jetpack.remove("to_remove");
      expectations();
    });

    it("async", async () => {
      preparations();
      await jetpack.removeAsync("to_remove");
      expectations();
    });
  });

  describe("input validation", () => {
    const tests = [
      { type: "sync", method: jetpack.remove as any, methodName: "remove" },
      {
        type: "async",
        method: jetpack.removeAsync as any,
        methodName: "removeAsync",
      },
    ];

    describe('"path" argument', () => {
      tests.forEach((test) => {
        it(test.type, async () => {
          if (test.type === "async") {
            await assert.rejects(() => test.method(true), {
              message: `Argument "path" passed to ${test.methodName}([path]) must be a string or an undefined. Received boolean`,
            });
          } else {
            assert.throws(
              () => {
                test.method(true);
              },
              {
                message: `Argument "path" passed to ${test.methodName}([path]) must be a string or an undefined. Received boolean`,
              },
            );
          }
        });
      });
    });
  });
});
