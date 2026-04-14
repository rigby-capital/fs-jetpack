import fse from "fs-extra";
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import assertPath from "./assert_path.js";
import helper from "./helper.js";
import jetpack from "../src/index.js";
import { InspectResult, Checksum } from "../types";

describe("inspect", () => {
  beforeEach(helper.setCleanTestCwd);
  afterEach(helper.switchBackToCorrectCwd);

  describe("can inspect a file", () => {
    const preparations = () => {
      fse.outputFileSync("dir/file.txt", "abc");
    };

    const expectations = (data: InspectResult) => {
      assert.deepStrictEqual(data, {
        name: "file.txt",
        type: "file",
        size: 3,
      });
    };

    it("sync", () => {
      preparations();
      expectations(jetpack.inspect("dir/file.txt"));
    });

    it("async", async () => {
      preparations();
      const data = await jetpack.inspectAsync("dir/file.txt");
      expectations(data);
    });
  });

  describe("can inspect a directory", () => {
    const preparations = () => {
      fse.mkdirsSync("empty");
    };

    const expectations = (data: InspectResult) => {
      assert.deepStrictEqual(data, {
        name: "empty",
        type: "dir",
      });
    };

    it("sync", () => {
      preparations();
      expectations(jetpack.inspect("empty"));
    });

    it("async", async () => {
      preparations();
      const data = await jetpack.inspectAsync("empty");
      expectations(data);
    });
  });

  describe("returns undefined if path doesn't exist", () => {
    const expectations = (data: InspectResult) => {
      assert.strictEqual(data, undefined);
    };

    it("sync", () => {
      expectations(jetpack.inspect("nonexistent"));
    });

    it("async", async () => {
      const data = await jetpack.inspectAsync("nonexistent");
      expectations(data);
    });
  });

  describe("can output file times (ctime, mtime, atime)", () => {
    const preparations = () => {
      fse.outputFileSync("dir/file.txt", "abc");
    };

    const expectations = (data: InspectResult) => {
      assert.strictEqual(typeof data.accessTime.getTime, "function");
      assert.strictEqual(typeof data.modifyTime.getTime, "function");
      assert.strictEqual(typeof data.changeTime.getTime, "function");
      assert.strictEqual(typeof data.birthTime.getTime, "function");
    };

    it("sync", () => {
      preparations();
      expectations(jetpack.inspect("dir/file.txt", { times: true }));
    });

    it("async", async () => {
      preparations();
      const data = await jetpack.inspectAsync("dir/file.txt", { times: true });
      expectations(data);
    });
  });

  describe("can output absolute path", () => {
    const preparations = () => {
      fse.outputFileSync("dir/file.txt", "abc");
    };

    const expectations = (data: InspectResult) => {
      assert.strictEqual(data.absolutePath, jetpack.path("dir/file.txt"));
    };

    it("sync", () => {
      preparations();
      expectations(jetpack.inspect("dir/file.txt", { absolutePath: true }));
    });

    it("async", async () => {
      preparations();
      const data = await jetpack.inspectAsync("dir/file.txt", {
        absolutePath: true,
      });
      expectations(data);
    });
  });

  describe("respects internal CWD of jetpack instance", () => {
    const preparations = () => {
      fse.outputFileSync("a/b.txt", "abc");
    };

    const expectations = (data: InspectResult) => {
      assert.strictEqual(data.name, "b.txt");
    };

    it("sync", () => {
      const jetContext = jetpack.cwd("a");
      preparations();
      expectations(jetContext.inspect("b.txt"));
    });

    it("async", async () => {
      const jetContext = jetpack.cwd("a");
      preparations();
      const data = await jetContext.inspectAsync("b.txt");
      expectations(data);
    });
  });

  describe("reports symlink by default", () => {
    const preparations = () => {
      fse.outputFileSync("dir/file.txt", "abc");
      fse.symlinkSync("dir/file.txt", "symlinked_file.txt");
    };

    const expectations = (data: InspectResult) => {
      assert.deepStrictEqual(data, {
        name: "symlinked_file.txt",
        type: "symlink",
        pointsAt: helper.osSep("dir/file.txt"),
      });
    };

    it("sync", () => {
      preparations();
      expectations(jetpack.inspect("symlinked_file.txt")); // implicit
      expectations(
        jetpack.inspect("symlinked_file.txt", { symlinks: "report" }),
      ); // explicit
    });

    it("async", async () => {
      preparations();
      let data = await jetpack.inspectAsync("symlinked_file.txt"); // implicit
      expectations(data);
      data = await jetpack.inspectAsync("symlinked_file.txt", {
        symlinks: "report",
      }); // explicit
      expectations(data);
    });
  });

  describe("follows symlink if option specified", () => {
    const preparations = () => {
      fse.outputFileSync("dir/file.txt", "abc");
      fse.symlinkSync("dir/file.txt", "symlinked_file.txt");
    };

    const expectations = (data: InspectResult) => {
      assert.deepStrictEqual(data, {
        name: "symlinked_file.txt",
        type: "file",
        size: 3,
      });
    };

    it("sync", () => {
      preparations();
      expectations(
        jetpack.inspect("symlinked_file.txt", { symlinks: "follow" }),
      );
    });

    it("async", async () => {
      preparations();
      const data = await jetpack.inspectAsync("symlinked_file.txt", {
        symlinks: "follow",
      });
      expectations(data);
    });
  });

  if (process.platform !== "win32") {
    describe("can output file mode (unix only)", () => {
      const preparations = () => {
        fse.outputFileSync("dir/file.txt", "abc", {
          mode: 0o511,
        });
      };

      const expectations = (data: InspectResult) => {
        assert.strictEqual(helper.parseMode(data.mode), "511");
      };

      it("sync", () => {
        preparations();
        expectations(jetpack.inspect("dir/file.txt", { mode: true }));
      });

      it("async", async () => {
        preparations();
        const data = await jetpack.inspectAsync("dir/file.txt", { mode: true });
        expectations(data);
      });
    });
  }

  describe("checksums", () => {
    const testsData = [
      {
        name: "md5",
        type: "md5",
        content: "abc",
        expected: "900150983cd24fb0d6963f7d28e17f72",
      },
      {
        name: "sha1",
        type: "sha1",
        content: "abc",
        expected: "a9993e364706816aba3e25717850c26c9cd0d89d",
      },
      {
        name: "sha256",
        type: "sha256",
        content: "abc",
        expected:
          "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
      },
      {
        name: "sha512",
        type: "sha512",
        content: "abc",
        expected:
          "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f",
      },
      {
        name: "calculates correctly checksum of an empty file",
        type: "md5",
        content: "",
        expected: "d41d8cd98f00b204e9800998ecf8427e",
      },
    ];

    testsData.forEach((test) => {
      describe(test.name, () => {
        const preparations = () => {
          fse.outputFileSync("file.txt", test.content);
        };

        const expectations = (data: InspectResult) => {
          assert.deepStrictEqual(data[test.type as Checksum], test.expected);
        };

        it("sync", () => {
          preparations();
          expectations(
            jetpack.inspect("file.txt", { checksum: test.type as Checksum }),
          );
        });

        it("async", async () => {
          preparations();
          const data = await jetpack.inspectAsync("file.txt", {
            checksum: test.type as Checksum,
          });
          expectations(data);
        });
      });
    });
  });

  describe("input validation", () => {
    const tests = [
      { type: "sync", method: jetpack.inspect as any, methodName: "inspect" },
      {
        type: "async",
        method: jetpack.inspectAsync as any,
        methodName: "inspectAsync",
      },
    ];

    describe('"path" argument', () => {
      tests.forEach((test) => {
        it(test.type, async () => {
          if (test.type === "async") {
            await assert.rejects(() => test.method(undefined), {
              message: `Argument "path" passed to ${test.methodName}(path, [options]) must be a string. Received undefined`,
            });
          } else {
            assert.throws(
              () => {
                test.method(undefined);
              },
              {
                message: `Argument "path" passed to ${test.methodName}(path, [options]) must be a string. Received undefined`,
              },
            );
          }
        });
      });
    });

    describe('"options" object', () => {
      describe('"checksum" argument', () => {
        tests.forEach((test) => {
          it(test.type + " (type check)", async () => {
            if (test.type === "async") {
              await assert.rejects(() => test.method("abc", { checksum: 1 }), {
                message: `Argument "options.checksum" passed to ${test.methodName}(path, [options]) must be a string. Received number`,
              });
            } else {
              assert.throws(
                () => {
                  test.method("abc", { checksum: 1 });
                },
                {
                  message: `Argument "options.checksum" passed to ${test.methodName}(path, [options]) must be a string. Received number`,
                },
              );
            }
          });
          it(test.type + " (value check)", async () => {
            if (test.type === "async") {
              await assert.rejects(
                () => test.method("abc", { checksum: "foo" }),
                {
                  message: `Argument "options.checksum" passed to ${test.methodName}(path, [options]) must have one of values: md5, sha1, sha256, sha512`,
                },
              );
            } else {
              assert.throws(
                () => {
                  test.method("abc", { checksum: "foo" });
                },
                {
                  message: `Argument "options.checksum" passed to ${test.methodName}(path, [options]) must have one of values: md5, sha1, sha256, sha512`,
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
              await assert.rejects(() => test.method("abc", { mode: 1 }), {
                message: `Argument "options.mode" passed to ${test.methodName}(path, [options]) must be a boolean. Received number`,
              });
            } else {
              assert.throws(
                () => {
                  test.method("abc", { mode: 1 });
                },
                {
                  message: `Argument "options.mode" passed to ${test.methodName}(path, [options]) must be a boolean. Received number`,
                },
              );
            }
          });
        });
      });
      describe('"times" argument', () => {
        tests.forEach((test) => {
          it(test.type, async () => {
            if (test.type === "async") {
              await assert.rejects(() => test.method("abc", { times: 1 }), {
                message: `Argument "options.times" passed to ${test.methodName}(path, [options]) must be a boolean. Received number`,
              });
            } else {
              assert.throws(
                () => {
                  test.method("abc", { times: 1 });
                },
                {
                  message: `Argument "options.times" passed to ${test.methodName}(path, [options]) must be a boolean. Received number`,
                },
              );
            }
          });
        });
      });
      describe('"absolutePath" argument', () => {
        tests.forEach((test) => {
          it(test.type, async () => {
            if (test.type === "async") {
              await assert.rejects(
                () => test.method("abc", { absolutePath: 1 }),
                {
                  message: `Argument "options.absolutePath" passed to ${test.methodName}(path, [options]) must be a boolean. Received number`,
                },
              );
            } else {
              assert.throws(
                () => {
                  test.method("abc", { absolutePath: 1 });
                },
                {
                  message: `Argument "options.absolutePath" passed to ${test.methodName}(path, [options]) must be a boolean. Received number`,
                },
              );
            }
          });
        });
      });
      describe('"symlinks" argument', () => {
        tests.forEach((test) => {
          it(test.type + " (type check)", async () => {
            if (test.type === "async") {
              await assert.rejects(() => test.method("abc", { symlinks: 1 }), {
                message: `Argument "options.symlinks" passed to ${test.methodName}(path, [options]) must be a string. Received number`,
              });
            } else {
              assert.throws(
                () => {
                  test.method("abc", { symlinks: 1 });
                },
                {
                  message: `Argument "options.symlinks" passed to ${test.methodName}(path, [options]) must be a string. Received number`,
                },
              );
            }
          });
          it(test.type + " (value check)", async () => {
            if (test.type === "async") {
              await assert.rejects(
                () => test.method("abc", { symlinks: "foo" }),
                {
                  message: `Argument "options.symlinks" passed to ${test.methodName}(path, [options]) must have one of values: report, follow`,
                },
              );
            } else {
              assert.throws(
                () => {
                  test.method("abc", { symlinks: "foo" });
                },
                {
                  message: `Argument "options.symlinks" passed to ${test.methodName}(path, [options]) must have one of values: report, follow`,
                },
              );
            }
          });
        });
      });
    });
  });
});
