import fse from "fs-extra";
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import assertPath from "./assert_path.js";
import helper from "./helper.js";
import jetpack from "../source/index.js";

describe("list", () => {
  beforeEach(helper.setCleanTestCwd);
  afterEach(helper.switchBackToCorrectCwd);

  describe("lists file names in given path", () => {
    const preparations = () => {
      fse.mkdirsSync("dir/empty");
      fse.outputFileSync("dir/empty.txt", "");
      fse.outputFileSync("dir/file.txt", "abc");
      fse.outputFileSync("dir/subdir/file.txt", "defg");
    };

    const expectations = (data: string[]) => {
      assert.deepStrictEqual(data, [
        "empty",
        "empty.txt",
        "file.txt",
        "subdir",
      ]);
    };

    it("sync", () => {
      preparations();
      expectations(jetpack.list("dir"));
    });

    it("async", async () => {
      preparations();
      const listAsync = await jetpack.listAsync("dir");
      expectations(listAsync);
    });
  });

  describe("lists CWD if no path parameter passed", () => {
    const preparations = () => {
      fse.mkdirsSync("dir/a");
      fse.outputFileSync("dir/b", "");
    };

    const expectations = (data: string[]) => {
      assert.deepStrictEqual(data, ["a", "b"]);
    };

    it("sync", () => {
      const jetContext = jetpack.cwd("dir");
      preparations();
      expectations(jetContext.list());
    });

    it("async", async () => {
      const jetContext = jetpack.cwd("dir");
      preparations();
      const list = await jetContext.listAsync();
      expectations(list);
    });
  });

  describe("returns undefined if path doesn't exist", () => {
    const expectations = (data: any) => {
      assert.strictEqual(data, undefined);
    };

    it("sync", () => {
      expectations(jetpack.list("nonexistent"));
    });

    it("async", async () => {
      const data = await jetpack.listAsync("nonexistent");
      expectations(data);
    });
  });

  describe("throws if given path is not a directory", () => {
    const preparations = () => {
      fse.outputFileSync("file.txt", "abc");
    };

    const expectations = (err: any) => {
      assert.strictEqual(err.code, "ENOTDIR");
    };

    it("sync", () => {
      preparations();
      try {
        jetpack.list("file.txt");
        throw new Error("Expected error to be thrown");
      } catch (err: any) {
        expectations(err);
      }
    });

    it("async", async () => {
      preparations();
      await assert.rejects(
        () => jetpack.listAsync("file.txt"),
        (err: any) => {
          expectations(err);
          return true;
        },
      );
    });
  });

  describe("respects internal CWD of jetpack instance", () => {
    const preparations = () => {
      fse.outputFileSync("a/b/c.txt", "abc");
    };

    const expectations = (data: string[]) => {
      assert.deepStrictEqual(data, ["c.txt"]);
    };

    it("sync", () => {
      const jetContext = jetpack.cwd("a");
      preparations();
      expectations(jetContext.list("b"));
    });

    it("async", async () => {
      const jetContext = jetpack.cwd("a");
      preparations();
      const data = await jetContext.listAsync("b");
      expectations(data);
    });
  });

  describe("input validation", () => {
    const tests = [
      { type: "sync", method: jetpack.list as any, methodName: "list" },
      {
        type: "async",
        method: jetpack.listAsync as any,
        methodName: "listAsync",
      },
    ];

    describe('"path" argument', () => {
      tests.forEach((test) => {
        it(test.type, async () => {
          if (test.type === "async") {
            await assert.rejects(() => test.method(true), {
              message: `Argument "path" passed to ${test.methodName}(path) must be a string or an undefined. Received boolean`,
            });
          } else {
            assert.throws(
              () => {
                test.method(true);
              },
              {
                message: `Argument "path" passed to ${test.methodName}(path) must be a string or an undefined. Received boolean`,
              },
            );
          }
        });
      });
    });
  });
});
