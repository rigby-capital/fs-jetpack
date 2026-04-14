import fse from "fs-extra";
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import assertPath from "./assert_path.js";
import helper from "./helper.js";
import jetpack from "../source/index.js";

describe("write", () => {
  beforeEach(helper.setCleanTestCwd);
  afterEach(helper.switchBackToCorrectCwd);

  describe("writes data from string", () => {
    const expectations = () => {
      assertPath("file.txt").shouldBeFileWithContent("abc");
    };

    it("sync", () => {
      jetpack.write("file.txt", "abc");
      expectations();
    });

    it("async", async () => {
      await jetpack.writeAsync("file.txt", "abc");
      expectations();
    });
  });

  describe("writes data from Buffer", () => {
    const expectations = () => {
      assertPath("file.txt").shouldBeFileWithContent(Buffer.from([11, 22]));
    };

    it("sync", () => {
      jetpack.write("file.txt", Buffer.from([11, 22]));
      expectations();
    });

    it("async", async () => {
      await jetpack.writeAsync("file.txt", Buffer.from([11, 22]));
      expectations();
    });
  });

  describe("writes data as JSON", () => {
    const obj = {
      utf8: "ąćłźż",
    };

    const expectations = () => {
      const content = JSON.parse(fse.readFileSync("file.json", "utf8"));
      assert.deepStrictEqual(content, obj);
    };

    it("sync", () => {
      jetpack.write("file.json", obj);
      expectations();
    });

    it("async", async () => {
      await jetpack.writeAsync("file.json", obj);
      expectations();
    });
  });

  describe("written JSON data can be indented", () => {
    const obj = {
      utf8: "ąćłźż",
    };

    const expectations = () => {
      const sizeA = fse.statSync("a.json").size;
      const sizeB = fse.statSync("b.json").size;
      const sizeC = fse.statSync("c.json").size;
      assert.ok(sizeB > sizeA);
      assert.ok(sizeC > sizeB);
    };

    it("sync", () => {
      jetpack.write("a.json", obj, { jsonIndent: 0 });
      jetpack.write("b.json", obj); // Default indent = 2
      jetpack.write("c.json", obj, { jsonIndent: 4 });
      expectations();
    });

    it("async", async () => {
      await Promise.all([
        jetpack.writeAsync("a.json", obj, { jsonIndent: 0 }),
        jetpack.writeAsync("b.json", obj), // Default indent = 2
        jetpack.writeAsync("c.json", obj, { jsonIndent: 4 }),
      ]);
      expectations();
    });
  });

  describe("writes and reads file as JSON with Date parsing", () => {
    const obj = {
      date: new Date(),
    };

    const expectations = () => {
      const content = JSON.parse(fse.readFileSync("file.json", "utf8"));
      assert.strictEqual(content.date, obj.date.toISOString());
    };

    it("sync", () => {
      jetpack.write("file.json", obj);
      expectations();
    });

    it("async", async () => {
      await jetpack.writeAsync("file.json", obj);
      expectations();
    });
  });

  if (process.platform !== "win32") {
    describe("sets mode of the file (unix only)", () => {
      const preparations = () => {
        fse.writeFileSync("file.txt", "abc", { mode: "700" });
      };
      const expectations = () => {
        assertPath("file.txt").shouldBeFileWithContent("xyz");
        assertPath("file.txt").shouldHaveMode("711");
      };

      it("sync, mode passed as string", () => {
        jetpack.write("file.txt", "xyz", { mode: "711" });
        expectations();
      });

      it("sync, mode passed as number", () => {
        jetpack.write("file.txt", "xyz", { mode: 0o711 });
        expectations();
      });

      it("async, mode passed as string", async () => {
        await jetpack.writeAsync("file.txt", "xyz", { mode: "711" });
        expectations();
      });

      it("async, mode passed as number", async () => {
        await jetpack.writeAsync("file.txt", "xyz", { mode: 0o711 });
        expectations();
      });
    });
  }

  describe("can create nonexistent parent directories", () => {
    const expectations = () => {
      assertPath("a/b/c.txt").shouldBeFileWithContent("abc");
    };

    it("sync", () => {
      jetpack.write("a/b/c.txt", "abc");
      expectations();
    });

    it("async", async () => {
      await jetpack.writeAsync("a/b/c.txt", "abc");
      expectations();
    });
  });

  describe("respects internal CWD of jetpack instance", () => {
    const expectations = () => {
      assertPath("a/b/c.txt").shouldBeFileWithContent("abc");
    };

    it("sync", () => {
      const jetContext = jetpack.cwd("a");
      jetContext.write("b/c.txt", "abc");
      expectations();
    });

    it("async", async () => {
      const jetContext = jetpack.cwd("a");
      await jetContext.writeAsync("b/c.txt", "abc");
      expectations();
    });
  });

  describe("input validation", () => {
    const tests = [
      { type: "sync", method: jetpack.write as any, methodName: "write" },
      {
        type: "async",
        method: jetpack.writeAsync as any,
        methodName: "writeAsync",
      },
    ];

    describe('"path" argument', () => {
      tests.forEach((test) => {
        it(test.type, async () => {
          if (test.type === "async") {
            await assert.rejects(() => test.method(undefined), {
              message: `Argument "path" passed to ${test.methodName}(path, data, [options]) must be a string. Received undefined`,
            });
          } else {
            assert.throws(
              () => {
                test.method(undefined);
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
            await assert.rejects(() => test.method("abc", true), {
              message: `Argument "data" passed to ${test.methodName}(path, data, [options]) must be a string or a buffer or an object or an array. Received boolean`,
            });
          } else {
            assert.throws(
              () => {
                test.method("abc", true);
              },
              {
                message: `Argument "data" passed to ${test.methodName}(path, data, [options]) must be a string or a buffer or an object or an array. Received boolean`,
              },
            );
          }
        });
      });
    });

    describe('"options" object', () => {
      describe('"atomic" argument', () => {
        tests.forEach((test) => {
          it(test.type, async () => {
            if (test.type === "async") {
              await assert.rejects(
                () => test.method("abc", "xyz", { atomic: 1 }),
                {
                  message: `Argument "options.atomic" passed to ${test.methodName}(path, data, [options]) must be a boolean. Received number`,
                },
              );
            } else {
              assert.throws(
                () => {
                  test.method("abc", "xyz", { atomic: 1 });
                },
                {
                  message: `Argument "options.atomic" passed to ${test.methodName}(path, data, [options]) must be a boolean. Received number`,
                },
              );
            }
          });
        });
      });
      describe('"jsonIndent" argument', () => {
        tests.forEach((test) => {
          it(test.type, async () => {
            if (test.type === "async") {
              await assert.rejects(
                () => test.method("abc", "xyz", { jsonIndent: true }),
                {
                  message: `Argument "options.jsonIndent" passed to ${test.methodName}(path, data, [options]) must be a number. Received boolean`,
                },
              );
            } else {
              assert.throws(
                () => {
                  test.method("abc", "xyz", { jsonIndent: true });
                },
                {
                  message: `Argument "options.jsonIndent" passed to ${test.methodName}(path, data, [options]) must be a number. Received boolean`,
                },
              );
            }
          });
        });
      });
    });
  });
});
