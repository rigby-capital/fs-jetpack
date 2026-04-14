import fse from "fs-extra";
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import assertPath from "./assert_path.js";
import helper from "./helper.js";
import jetpack from "../source/index.js";

describe("read", () => {
  beforeEach(helper.setCleanTestCwd);
  afterEach(helper.switchBackToCorrectCwd);

  describe("reads file as a string", () => {
    const preparations = () => {
      fse.outputFileSync("file.txt", "abc");
    };

    const expectations = (content: any) => {
      assert.strictEqual(content, "abc");
    };

    it("sync", () => {
      preparations();
      expectations(jetpack.read("file.txt")); // defaults to 'utf8'
      expectations(jetpack.read("file.txt", "utf8")); // explicitly specified
    });

    it("async", async () => {
      preparations();
      let content = await jetpack.readAsync("file.txt"); // defaults to 'utf8'
      expectations(content);
      content = await jetpack.readAsync("file.txt", "utf8"); // explicitly said
      expectations(content);
    });
  });

  describe("reads file as a Buffer", () => {
    const preparations = () => {
      fse.outputFileSync("file.txt", Buffer.from([11, 22]));
    };

    const expectations = (content: Buffer) => {
      assert.strictEqual(Buffer.isBuffer(content), true);
      assert.strictEqual(content.length, 2);
      assert.strictEqual(content[0], 11);
      assert.strictEqual(content[1], 22);
    };

    it("sync", () => {
      preparations();
      expectations(jetpack.read("file.txt", "buffer"));
    });

    it("async", async () => {
      preparations();
      const content = await jetpack.readAsync("file.txt", "buffer");
      expectations(content);
    });
  });

  describe("reads file as JSON", () => {
    const obj = {
      utf8: "ąćłźż",
    };

    const preparations = () => {
      fse.outputFileSync("file.json", JSON.stringify(obj));
    };

    const expectations = (content: any) => {
      assert.deepStrictEqual(content, obj);
    };

    it("sync", () => {
      preparations();
      expectations(jetpack.read("file.json", "json"));
    });

    it("async", async () => {
      preparations();
      const content = await jetpack.readAsync("file.json", "json");
      expectations(content);
    });
  });

  describe("gives nice error message when JSON parsing failed", () => {
    const preparations = () => {
      fse.outputFileSync("file.json", '{ "abc: 123 }'); // Malformed JSON
    };

    const expectations = (err: any) => {
      assert.ok(err.message.includes("JSON parsing failed while reading"));
    };

    it("sync", () => {
      preparations();
      try {
        jetpack.read("file.json", "json");
        throw new Error("Expected error to be thrown");
      } catch (err: any) {
        expectations(err);
      }
    });

    it("async", async () => {
      preparations();
      await assert.rejects(
        () => jetpack.readAsync("file.json", "json"),
        (err: any) => {
          expectations(err);
          return true;
        },
      );
    });
  });

  describe("reads file as JSON with Date parsing", () => {
    const obj = {
      utf8: "ąćłźż",
      date: new Date(),
    };

    const preparations = () => {
      fse.outputFileSync("file.json", JSON.stringify(obj));
    };

    const expectations = (content: any) => {
      assert.deepStrictEqual(content, obj);
    };

    it("sync", () => {
      preparations();
      expectations(jetpack.read("file.json", "jsonWithDates"));
    });

    it("async", async () => {
      preparations();
      const content = await jetpack.readAsync("file.json", "jsonWithDates");
      expectations(content);
    });
  });

  describe("returns undefined if file doesn't exist", () => {
    const expectations = (content: any) => {
      assert.strictEqual(content, undefined);
    };

    it("sync", () => {
      expectations(jetpack.read("nonexistent.txt"));
      expectations(jetpack.read("nonexistent.txt", "json"));
      expectations(jetpack.read("nonexistent.txt", "buffer"));
    });

    it("async", async () => {
      let content = await jetpack.readAsync("nonexistent.txt");
      expectations(content);
      content = await jetpack.readAsync("nonexistent.txt", "json");
      expectations(content);
      content = await jetpack.readAsync("nonexistent.txt", "buffer");
      expectations(content);
    });
  });

  describe("throws if given path is a directory", () => {
    const preparations = () => {
      fse.mkdirsSync("dir");
    };

    const expectations = (err: any) => {
      assert.strictEqual(err.code, "EISDIR");
    };

    it("sync", () => {
      preparations();
      try {
        jetpack.read("dir");
        throw new Error("Expected error to be thrown");
      } catch (err: any) {
        expectations(err);
      }
    });

    it("async", async () => {
      preparations();
      await assert.rejects(
        () => jetpack.readAsync("dir"),
        (err: any) => {
          expectations(err);
          return true;
        },
      );
    });
  });

  describe("respects internal CWD of jetpack instance", () => {
    const preparations = () => {
      fse.outputFileSync("a/file.txt", "abc");
    };

    const expectations = (data: any) => {
      assert.strictEqual(data, "abc");
    };

    it("sync", () => {
      const jetContext = jetpack.cwd("a");
      preparations();
      expectations(jetContext.read("file.txt"));
    });

    it("async", async () => {
      const jetContext = jetpack.cwd("a");
      preparations();
      const data = await jetContext.readAsync("file.txt");
      expectations(data);
    });
  });

  describe("input validation", () => {
    const tests = [
      { type: "sync", method: jetpack.read as any, methodName: "read" },
      {
        type: "async",
        method: jetpack.readAsync as any,
        methodName: "readAsync",
      },
    ];

    describe('"path" argument', () => {
      tests.forEach((test) => {
        it(test.type, async () => {
          if (test.type === "async") {
            await assert.rejects(() => test.method(undefined, "xyz"), {
              message: `Argument "path" passed to ${test.methodName}(path, returnAs) must be a string. Received undefined`,
            });
          } else {
            assert.throws(
              () => {
                test.method(undefined, "xyz");
              },
              {
                message: `Argument "path" passed to ${test.methodName}(path, returnAs) must be a string. Received undefined`,
              },
            );
          }
        });
      });
    });

    describe('"returnAs" argument', () => {
      tests.forEach((test) => {
        it(test.type, async () => {
          if (test.type === "async") {
            await assert.rejects(() => test.method("abc", true), {
              message: `Argument "returnAs" passed to ${test.methodName}(path, returnAs) must be a string or an undefined. Received boolean`,
            });
            await assert.rejects(() => test.method("abc", "foo"), {
              message: `Argument "returnAs" passed to ${test.methodName}(path, returnAs) must have one of values: utf8, buffer, json, jsonWithDates`,
            });
          } else {
            assert.throws(
              () => {
                test.method("abc", true);
              },
              {
                message: `Argument "returnAs" passed to ${test.methodName}(path, returnAs) must be a string or an undefined. Received boolean`,
              },
            );
            assert.throws(
              () => {
                test.method("abc", "foo");
              },
              {
                message: `Argument "returnAs" passed to ${test.methodName}(path, returnAs) must have one of values: utf8, buffer, json, jsonWithDates`,
              },
            );
          }
        });
      });
    });
  });
});
