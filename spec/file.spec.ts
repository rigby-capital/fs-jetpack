import fse from "fs-extra";
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import assertPath from "./assert_path.js";
import helper from "./helper.js";
import jetpack, { type FSJetpack } from "../source/index.js";

describe("file", () => {
  beforeEach(helper.setCleanTestCwd);
  afterEach(helper.switchBackToCorrectCwd);

  describe("creates file if it doesn't exist", () => {
    const expectations = () => {
      assertPath("file.txt").shouldBeFileWithContent("");
    };

    it("sync", () => {
      jetpack.file("file.txt");
      expectations();
    });

    it("async", async () => {
      await jetpack.fileAsync("file.txt");
      expectations();
    });
  });

  describe("leaves file intact if it already exists", () => {
    const preparations = () => {
      fse.outputFileSync("file.txt", "abc");
    };

    const expectations = () => {
      assertPath("file.txt").shouldBeFileWithContent("abc");
    };

    it("sync", () => {
      preparations();
      jetpack.file("file.txt");
      expectations();
    });

    it("async", async () => {
      preparations();
      await jetpack.fileAsync("file.txt");
      expectations();
    });
  });

  describe("can save file content given as string", () => {
    const expectations = () => {
      assertPath("file.txt").shouldBeFileWithContent("ąbć");
    };

    it("sync", () => {
      jetpack.file("file.txt", { content: "ąbć" });
      expectations();
    });

    it("async", async () => {
      await jetpack.fileAsync("file.txt", { content: "ąbć" });
      expectations();
    });
  });

  describe("can save file content given as buffer", () => {
    const expectations = () => {
      assertPath("file").shouldBeFileWithContent(Buffer.from([11, 22]));
    };

    it("sync", () => {
      jetpack.file("file", { content: Buffer.from([11, 22]) });
      expectations();
    });

    it("async", async () => {
      await jetpack.fileAsync("file", { content: Buffer.from([11, 22]) });
      expectations();
    });
  });

  describe("can save file content given as plain JS object (will be saved as JSON)", () => {
    const obj = {
      a: "abc",
      b: 123,
    };

    const expectations = () => {
      const data = JSON.parse(fse.readFileSync("file.txt", "utf8"));
      assert.deepStrictEqual(data, obj);
    };

    it("sync", () => {
      jetpack.file("file.txt", { content: obj });
      expectations();
    });

    it("async", async () => {
      await jetpack.fileAsync("file.txt", { content: obj });
      expectations();
    });
  });

  describe("written JSON data can be indented", () => {
    const obj = {
      a: "abc",
      b: 123,
    };

    const expectations = () => {
      const sizeA = fse.statSync("a.json").size;
      const sizeB = fse.statSync("b.json").size;
      const sizeC = fse.statSync("c.json").size;
      assert.ok(sizeB > sizeA);
      assert.ok(sizeC > sizeB);
    };

    it("sync", () => {
      jetpack.file("a.json", { content: obj, jsonIndent: 0 });
      jetpack.file("b.json", { content: obj }); // Default indent = 2
      jetpack.file("c.json", { content: obj, jsonIndent: 4 });
      expectations();
    });

    it("async", async () => {
      await jetpack.fileAsync("a.json", { content: obj, jsonIndent: 0 });
      await jetpack.fileAsync("b.json", { content: obj }); // Default indent = 2
      await jetpack.fileAsync("c.json", { content: obj, jsonIndent: 4 });
      expectations();
    });
  });

  describe("replaces content of already existing file", () => {
    const preparations = () => {
      fse.writeFileSync("file.txt", "abc");
    };

    const expectations = () => {
      assertPath("file.txt").shouldBeFileWithContent("123");
    };

    it("sync", () => {
      preparations();
      jetpack.file("file.txt", { content: "123" });
      expectations();
    });

    it("async", async () => {
      preparations();
      await jetpack.fileAsync("file.txt", { content: "123" });
      expectations();
    });
  });

  describe("throws if given path is not a file", () => {
    const preparations = () => {
      fse.mkdirsSync("a");
    };

    const expectations = (err: any) => {
      assert.ok(err.message.includes("exists but is not a file."));
    };

    it("sync", () => {
      preparations();
      try {
        jetpack.file("a");
        throw new Error("Expected error to be thrown");
      } catch (err: any) {
        expectations(err);
      }
    });

    it("async", async () => {
      preparations();
      await assert.rejects(
        () => jetpack.fileAsync("a"),
        (err: any) => {
          expectations(err);
          return true;
        },
      );
    });
  });

  describe("if directory for file doesn't exist creates it as well", () => {
    const expectations = () => {
      assertPath("a/b/c.txt").shouldBeFileWithContent("");
    };

    it("sync", () => {
      jetpack.file("a/b/c.txt");
      expectations();
    });

    it("async", async () => {
      await jetpack.fileAsync("a/b/c.txt");
      expectations();
    });
  });

  describe("returns currently used jetpack instance", () => {
    const expectations = (jetpackContext: FSJetpack) => {
      assert.strictEqual(jetpackContext, jetpack);
    };

    it("sync", () => {
      expectations(jetpack.file("file.txt"));
    });

    it("async", async () => {
      const jetpackContext = await jetpack.fileAsync("file.txt");
      expectations(jetpackContext);
    });
  });

  describe("respects internal CWD of jetpack instance", () => {
    const expectations = () => {
      assertPath("a/b.txt").shouldBeFileWithContent("");
    };

    it("sync", () => {
      const jetContext = jetpack.cwd("a");
      jetContext.file("b.txt");
      expectations();
    });

    it("async", async () => {
      const jetContext = jetpack.cwd("a");
      await jetContext.fileAsync("b.txt");
      expectations();
    });
  });

  if (process.platform !== "win32") {
    describe("sets mode of newly created file (unix only)", () => {
      const expectations = () => {
        assertPath("file.txt").shouldHaveMode("711");
      };

      it("sync, mode passed as string", () => {
        jetpack.file("file.txt", { mode: "711" });
        expectations();
      });

      it("sync, mode passed as number", () => {
        jetpack.file("file.txt", { mode: 0o711 });
        expectations();
      });

      it("async, mode passed as string", async () => {
        await jetpack.fileAsync("file.txt", { mode: "711" });
        expectations();
      });

      it("async, mode passed as number", async () => {
        await jetpack.fileAsync("file.txt", { mode: 0o711 });
        expectations();
      });
    });

    describe("changes mode of existing file if it doesn't match (unix only)", () => {
      const preparations = () => {
        fse.writeFileSync("file.txt", "abc", { mode: "700" });
      };

      const expectations = () => {
        assertPath("file.txt").shouldHaveMode("511");
      };

      it("sync", () => {
        preparations();
        jetpack.file("file.txt", { mode: "511" });
        expectations();
      });

      it("async", async () => {
        preparations();
        await jetpack.fileAsync("file.txt", { mode: "511" });
        expectations();
      });
    });

    describe("leaves mode of file intact if not explicitly specified (unix only)", () => {
      const preparations = () => {
        fse.writeFileSync("file.txt", "abc", { mode: "700" });
      };

      const expectations = () => {
        assertPath("file.txt").shouldHaveMode("700");
      };

      it("sync, ensure exists", () => {
        preparations();
        jetpack.file("file.txt");
        expectations();
      });

      it("sync, ensure content", () => {
        preparations();
        jetpack.file("file.txt", { content: "abc" });
        expectations();
      });

      it("async, ensure exists", async () => {
        preparations();
        await jetpack.fileAsync("file.txt");
        expectations();
      });

      it("async, ensure content", async () => {
        preparations();
        await jetpack.fileAsync("file.txt", { content: "abc" });
        expectations();
      });
    });
  } else {
    describe("specyfying mode have no effect and throws no error (windows only)", () => {
      it("sync", () => {
        jetpack.file("file.txt", { mode: "711" });
      });

      it("async", async () => {
        await jetpack.fileAsync("file.txt", { mode: "711" });
      });
    });
  }

  describe("input validation", () => {
    const tests = [
      { type: "sync", method: jetpack.file as any, methodName: "file" },
      {
        type: "async",
        method: jetpack.fileAsync as any,
        methodName: "fileAsync",
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
      describe('"content" argument', () => {
        tests.forEach((test) => {
          it(test.type, async () => {
            if (test.type === "async") {
              await assert.rejects(() => test.method("abc", { content: 1 }), {
                message: `Argument "criteria.content" passed to ${test.methodName}(path, [criteria]) must be a string or a buffer or an object or an array. Received number`,
              });
            } else {
              assert.throws(
                () => {
                  test.method("abc", { content: 1 });
                },
                {
                  message: `Argument "criteria.content" passed to ${test.methodName}(path, [criteria]) must be a string or a buffer or an object or an array. Received number`,
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
                () => test.method("abc", { jsonIndent: true }),
                {
                  message: `Argument "criteria.jsonIndent" passed to ${test.methodName}(path, [criteria]) must be a number. Received boolean`,
                },
              );
            } else {
              assert.throws(
                () => {
                  test.method("abc", { jsonIndent: true });
                },
                {
                  message: `Argument "criteria.jsonIndent" passed to ${test.methodName}(path, [criteria]) must be a number. Received boolean`,
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
