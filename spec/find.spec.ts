import fse from "fs-extra";
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import assertPath from "./assert_path.js";
import helper from "./helper.js";
import jetpack, { type InspectResult } from "../source/index.js";

describe("find", () => {
  beforeEach(helper.setCleanTestCwd);
  afterEach(helper.switchBackToCorrectCwd);

  describe("returns list of relative paths anchored to CWD", () => {
    const preparations = () => {
      fse.outputFileSync("a/b/file.txt", "abc");
    };

    const expectations = (found: string[]) => {
      const normalizedPaths = helper.osSep(["a/b/file.txt"]);
      assert.deepStrictEqual(found, normalizedPaths);
    };

    it("sync", () => {
      preparations();
      expectations(jetpack.find("a", { matching: "*.txt" }));
    });

    it("async", async () => {
      preparations();
      const found = await jetpack.findAsync("a", { matching: "*.txt" });
      expectations(found);
    });
  });

  describe('defaults to "*" if no matching is provided', () => {
    const preparations = () => {
      fse.outputFileSync("a/b/file.txt", "abc");
      fse.outputFileSync("a/b/file.bin", "abc");
    };

    const expectations = (found: string[]) => {
      const normalizedPaths = helper.osSep(["a/b/file.bin", "a/b/file.txt"]);
      assert.deepStrictEqual(found, normalizedPaths);
    };

    it("sync", () => {
      preparations();
      expectations(jetpack.find("a"));
    });

    it("async", async () => {
      preparations();
      const found = await jetpack.findAsync("a");
      expectations(found);
    });
  });

  describe("if recursive=false will exclude subfolders from search", () => {
    const preparations = () => {
      fse.outputFileSync("x/file.txt", "abc");
      fse.outputFileSync("x/y/file.txt", "123");
      fse.outputFileSync("x/y/b/file.txt", "456");
    };

    const expectations = (found: string[]) => {
      const normalizedPaths = helper.osSep(["x/file.txt"]);
      assert.deepStrictEqual(found, normalizedPaths);
    };

    it("sync", () => {
      preparations();
      expectations(jetpack.find("x", { matching: "*.txt", recursive: false }));
    });

    it("async", async () => {
      preparations();
      const found = await jetpack.findAsync("x", {
        matching: "*.txt",
        recursive: false,
      });
      expectations(found);
    });
  });

  describe("defaults to CWD if no path provided", () => {
    const preparations = () => {
      fse.outputFileSync("a/b/file.txt", "abc");
    };

    const expectations = (found: string[]) => {
      const normalizedPaths = helper.osSep(["a/b/file.txt"]);
      assert.deepStrictEqual(found, normalizedPaths);
    };

    it("sync", () => {
      preparations();
      expectations(jetpack.find({ matching: "*.txt" }));
    });

    it("async", async () => {
      preparations();
      const found = await jetpack.findAsync({ matching: "*.txt" });
      expectations(found);
    });
  });

  describe("returns empty list if nothing found", () => {
    const preparations = () => {
      fse.outputFileSync("a/b/c.md", "abc");
    };

    const expectations = (found: string[]) => {
      assert.deepStrictEqual(found, []);
    };

    it("sync", () => {
      preparations();
      expectations(jetpack.find("a", { matching: "*.txt" }));
    });

    it("async", async () => {
      preparations();
      const found = await jetpack.findAsync("a", { matching: "*.txt" });
      expectations(found);
    });
  });

  describe("finds all paths which match globs", () => {
    const preparations = () => {
      fse.outputFileSync("a/b/file.txt", "1");
      fse.outputFileSync("a/b/c/file.txt", "2");
      fse.outputFileSync("a/b/c/file.md", "3");
      fse.outputFileSync("a/x/y/z", "Zzzzz...");
    };

    const expectations = (found: string[]) => {
      const normalizedPaths = helper.osSep([
        "a/b/c/file.txt",
        "a/b/file.txt",
        "a/x/y/z",
      ]);
      found.sort();
      assert.deepStrictEqual(found, normalizedPaths);
    };

    it("sync", () => {
      preparations();
      expectations(jetpack.find("a", { matching: ["*.txt", "z"] }));
    });

    it("async", async () => {
      preparations();
      const found = await jetpack.findAsync("a", { matching: ["*.txt", "z"] });
      expectations(found);
    });
  });

  describe("anchors globs to directory you're finding in", () => {
    const preparations = () => {
      fse.outputFileSync("x/y/a/b/file.txt", "123");
      fse.outputFileSync("x/y/a/b/c/file.txt", "456");
    };

    const expectations = (found: string[]) => {
      const normalizedPaths = helper.osSep(["x/y/a/b/file.txt"]);
      assert.deepStrictEqual(found, normalizedPaths);
    };

    it("sync", () => {
      preparations();
      expectations(jetpack.find("x/y/a", { matching: "b/*.txt" }));
    });

    it("async", async () => {
      preparations();
      const found = await jetpack.findAsync("x/y/a", { matching: "b/*.txt" });
      expectations(found);
    });
  });

  describe("can use ./ as indication of anchor directory", () => {
    const preparations = () => {
      fse.outputFileSync("x/y/file.txt", "123");
      fse.outputFileSync("x/y/b/file.txt", "456");
    };

    const expectations = (found: string[]) => {
      const normalizedPaths = helper.osSep(["x/y/file.txt"]);
      assert.deepStrictEqual(found, normalizedPaths);
    };

    it("sync", () => {
      preparations();
      expectations(jetpack.find("x/y", { matching: "./file.txt" }));
    });

    it("async", async () => {
      preparations();
      const found = await jetpack.findAsync("x/y", { matching: "./file.txt" });
      expectations(found);
    });
  });

  describe("deals with negation globs", () => {
    const preparations = () => {
      fse.outputFileSync("x/y/a/b", "bbb");
      fse.outputFileSync("x/y/a/x", "xxx");
      fse.outputFileSync("x/y/a/y", "yyy");
      fse.outputFileSync("x/y/a/z", "zzz");
    };

    const expectations = (found: string[]) => {
      const normalizedPaths = helper.osSep(["x/y/a/b"]);
      assert.deepStrictEqual(found, normalizedPaths);
    };

    it("sync", () => {
      preparations();
      expectations(
        jetpack.find("x/y", {
          matching: [
            "a/*",
            // Three different pattern types to test:
            "!x",
            "!a/y",
            "!./a/z",
          ],
        }),
      );
    });

    it("async", async () => {
      preparations();
      const found = await jetpack.findAsync("x/y", {
        matching: [
          "a/*",
          // Three different pattern types to test:
          "!x",
          "!a/y",
          "!./a/z",
        ],
      });
      expectations(found);
    });
  });

  describe("can further filter matched results", () => {
    const preparations = () => {
      fse.outputFileSync("x/y/file.txt", "123");
      fse.outputFileSync("x/y/other_file.txt", "1");
      fse.outputFileSync("x/y/bigger_file.txt", "123456789");
      fse.outputFileSync("x/y/b/file.txt", "1234");
    };

    const expectFilterObjFields = (obj: InspectResult) => {
      const fields = [
        "name",
        "type",
        "size",
        "accessTime",
        "modifyTime",
        "changeTime",
        "birthTime",
        "absolutePath",
      ];
      assert.deepStrictEqual(Object.keys(obj).sort(), fields.sort());
    };

    const expectations = (found: string[]) => {
      const normalizedPaths = helper.osSep([
        "x/y/file.txt",
        "x/y/other_file.txt",
      ]);
      assert.deepStrictEqual(found, normalizedPaths);
    };

    it("sync", () => {
      preparations();
      expectations(
        jetpack.find("x/y", {
          matching: "*.txt",
          filter: (fileInspect) => {
            expectFilterObjFields(fileInspect);
            return fileInspect.size <= 3;
          },
        }),
      );
    });

    it("async", async () => {
      preparations();
      const found = await jetpack.findAsync("x/y", {
        matching: "*.txt",
        filter: (fileInspect) => {
          expectFilterObjFields(fileInspect);
          return fileInspect.size <= 3;
        },
      });
      expectations(found);
    });

    it("async (filter can also return promise)", async () => {
      preparations();
      const found = await jetpack.findAsync("x/y", {
        matching: "*.txt",
        filter: (fileInspect) => {
          return Promise.resolve(fileInspect.size <= 3);
        },
      });
      expectations(found);
    });
  });

  describe("filter shouldn't be called for paths not fulfilling the match", () => {
    const preparations = () => {
      fse.outputFileSync("x/y/file.txt", "123");
    };

    const expectations = (found: string[]) => {
      assert.deepStrictEqual(found, []);
    };

    it("sync", () => {
      preparations();
      expectations(
        jetpack.find("x/y", {
          matching: "*.md",
          filter: (fileInspect) => {
            throw "filter shouldn't be called!";
          },
        }),
      );
    });

    it("async", async () => {
      preparations();
      const found = await jetpack.findAsync("x/y", {
        matching: "*.md",
        filter: (fileInspect) => {
          throw "filter shouldn't be called!";
        },
      });
      expectations(found);
    });
  });

  describe("doesn't look for directories by default", () => {
    const preparations = () => {
      fse.outputFileSync("a/b/foo1", "abc");
      fse.mkdirsSync("a/b/foo2");
    };

    const expectations = (found: string[]) => {
      const normalizedPaths = helper.osSep(["a/b/foo1"]);
      assert.deepStrictEqual(found, normalizedPaths);
    };

    it("sync", () => {
      preparations();
      expectations(jetpack.find("a", { matching: "foo*" }));
    });

    it("async", async () => {
      preparations();
      const found = await jetpack.findAsync("a", { matching: "foo*" });
      expectations(found);
    });
  });

  describe("treats symlinks like real files", () => {
    const preparations = () => {
      fse.mkdirsSync("dir");
      fse.outputFileSync("file", "abc");
      jetpack.symlink("dir", "symdir");
      jetpack.symlink("file", "symfile");
    };

    const expectations = (found: string[]) => {
      const expected = ["file", "symfile"];
      assert.deepStrictEqual(found.sort(), expected.sort());
    };

    it("sync", () => {
      preparations();
      expectations(jetpack.find({ matching: "*" }));
    });

    it("async", async () => {
      preparations();
      const found = await jetpack.findAsync({ matching: "*" });
      expectations(found);
    });
  });

  describe("follows to symlinked directories", () => {
    const preparations = () => {
      fse.outputFileSync("dir1/dir2/file.txt", "abc");
      jetpack.symlink("../dir1", "foo/symlink_to_dir1");
      assert.deepStrictEqual(
        jetpack.read("foo/symlink_to_dir1/dir2/file.txt"),
        "abc",
      );
    };

    const expectations = (found: string[]) => {
      const normalizedPaths = helper.osSep([
        "foo/symlink_to_dir1/dir2/file.txt",
      ]);
      assert.deepStrictEqual(found, normalizedPaths);
    };

    it("sync", () => {
      preparations();
      expectations(jetpack.find("foo", { matching: "file*" }));
    });

    it("async", async () => {
      preparations();
      const found = await jetpack.findAsync("foo", { matching: "file*" });
      expectations(found);
    });
  });

  describe("deals gracefully with invalid symlink", () => {
    const preparations = () => {
      fse.outputFileSync("dir/dir/file1.txt", "abc");
      jetpack.symlink("invalid/symlink", "dir/invalid_file.txt");
    };

    const expectations = (found: string[]) => {
      const normalizedPaths = helper.osSep(["dir/dir/file1.txt"]);
      assert.deepStrictEqual(found, normalizedPaths);
    };

    it("sync", () => {
      preparations();
      expectations(jetpack.find("dir", { matching: "*.txt" }));
    });

    it("async", async () => {
      preparations();
      const found = await jetpack.findAsync("dir", { matching: "*.txt" });
      expectations(found);
    });
  });

  describe("can look for files and directories", () => {
    const preparations = () => {
      fse.outputFileSync("a/b/foo1", "abc");
      fse.mkdirsSync("a/b/foo2");
    };

    const expectations = (found: string[]) => {
      const normalizedPaths = helper.osSep(["a/b/foo1", "a/b/foo2"]);
      assert.deepStrictEqual(found, normalizedPaths);
    };

    it("sync", () => {
      preparations();
      expectations(
        jetpack.find("a", {
          matching: "foo*",
          directories: true,
        }),
      );
    });

    it("async", async () => {
      preparations();
      const found = await jetpack.findAsync("a", {
        matching: "foo*",
        directories: true,
      });
      expectations(found);
    });
  });

  describe("can look for only directories", () => {
    const preparations = () => {
      fse.outputFileSync("a/b/foo1", "abc");
      fse.mkdirsSync("a/b/foo2");
    };

    const expectations = (found: string[]) => {
      const normalizedPaths = helper.osSep(["a/b/foo2"]);
      assert.deepStrictEqual(found, normalizedPaths);
    };

    it("sync", () => {
      preparations();
      expectations(
        jetpack.find("a", {
          matching: "foo*",
          files: false,
          directories: true,
        }),
      );
    });

    it("async", async () => {
      preparations();
      const found = await jetpack.findAsync("a", {
        matching: "foo*",
        files: false,
        directories: true,
      });
      expectations(found);
    });
  });

  describe("looking for directories works ok with only negation globs in set", () => {
    const preparations = () => {
      fse.outputFileSync("a/x", "123");
      fse.outputFileSync("a/y", "789");
    };

    const expectations = (found: string[]) => {
      const normalizedPaths = helper.osSep(["a/x"]);
      assert.deepStrictEqual(found, normalizedPaths);
    };

    it("sync", () => {
      preparations();
      expectations(
        jetpack.find("a", {
          matching: ["!y"],
          directories: true,
        }),
      );
    });

    it("async", async () => {
      preparations();
      const found = await jetpack.findAsync("a", {
        matching: ["!y"],
        directories: true,
      });
      expectations(found);
    });
  });

  describe("when you turn off files and directoies returns empty list", () => {
    const preparations = () => {
      fse.outputFileSync("a/b/foo1", "abc");
      fse.mkdirsSync("a/b/foo2");
    };

    const expectations = (found: string[]) => {
      assert.deepStrictEqual(found, []);
    };

    it("sync", () => {
      preparations();
      expectations(
        jetpack.find("a", {
          matching: "foo*",
          files: false,
          directories: false,
        }),
      );
    });

    it("async", async () => {
      preparations();
      const found = await jetpack.findAsync("a", {
        matching: "foo*",
        files: false,
        directories: false,
      });
      expectations(found);
    });
  });

  describe("throws if path doesn't exist", () => {
    const expectations = (err: any) => {
      assert.strictEqual(err.code, "ENOENT");
      assert.ok(
        err.message.includes("Path you want to find stuff in doesn't exist"),
      );
    };

    it("sync", () => {
      try {
        jetpack.find("a", { matching: "*.txt" });
        throw new Error("Expected error to be thrown");
      } catch (err: any) {
        expectations(err);
      }
    });

    it("async", async () => {
      await assert.rejects(
        () => jetpack.findAsync("a", { matching: "*.txt" }),
        (err: any) => {
          expectations(err);
          return true;
        },
      );
    });
  });

  describe("throws if path is a file, not a directory", () => {
    const preparations = () => {
      fse.outputFileSync("a/b", "abc");
    };

    const expectations = (err: any) => {
      assert.strictEqual(err.code, "ENOTDIR");
      assert.ok(
        err.message.includes(
          "Path you want to find stuff in must be a directory",
        ),
      );
    };

    it("sync", () => {
      preparations();
      try {
        jetpack.find("a/b", { matching: "*.txt" });
        throw new Error("Expected error to be thrown");
      } catch (err: any) {
        expectations(err);
      }
    });

    it("async", async () => {
      preparations();
      await assert.rejects(
        () => jetpack.findAsync("a/b", { matching: "*.txt" }),
        (err: any) => {
          expectations(err);
          return true;
        },
      );
    });
  });

  describe("respects internal CWD of jetpack instance", () => {
    const preparations = () => {
      fse.outputFileSync("a/b/c/d.txt", "abc");
    };

    const expectations = (found: string[]) => {
      const normalizedPaths = helper.osSep(["b/c/d.txt"]); // NOT a/b/c/d.txt
      assert.deepStrictEqual(found, normalizedPaths);
    };

    it("sync", () => {
      const jetContext = jetpack.cwd("a");
      preparations();
      expectations(jetContext.find("b", { matching: "*.txt" }));
    });

    it("async", async () => {
      const jetContext = jetpack.cwd("a");
      preparations();
      const found = await jetContext.findAsync("b", { matching: "*.txt" });
      expectations(found);
    });
  });

  describe("finds dot-dirs and dot-files", () => {
    const preparations = () => {
      fse.outputFileSync(".dir/file", "a");
      fse.outputFileSync(".dir/.file", "b");
      fse.outputFileSync(".foo/.file", "c");
    };

    const expectations = (found: string[]) => {
      const normalizedPaths = helper.osSep([".dir", ".dir/.file"]);
      assert.deepStrictEqual(found, normalizedPaths);
    };

    it("sync", () => {
      preparations();
      expectations(
        jetpack.find({
          matching: [".dir", ".file", "!.foo/**"],
          directories: true,
        }),
      );
    });

    it("async", async () => {
      preparations();
      const found = await jetpack.findAsync({
        matching: [".dir", ".file", "!.foo/**"],
        directories: true,
      });
      expectations(found);
    });
  });

  describe("if ignoreCase=true it ignores case in patterns", () => {
    const preparations = () => {
      fse.outputFileSync("FOO/BAR", "a");
    };

    const expectations = (found: string[]) => {
      const paths = ["FOO", "FOO/BAR"];
      const normalizedPaths = helper.osSep(paths);
      assert.deepStrictEqual(found, normalizedPaths);
    };

    it("sync", () => {
      preparations();
      expectations(
        jetpack.find({
          matching: ["foo", "bar"],
          directories: true,
          ignoreCase: true,
        }),
      );
    });

    it("async", async () => {
      preparations();
      const found = await jetpack.findAsync({
        matching: ["foo", "bar"],
        directories: true,
        ignoreCase: true,
      });
      expectations(found);
    });
  });

  describe("input validation", () => {
    const tests = [
      { type: "sync", method: jetpack.find as any, methodName: "find" },
      {
        type: "async",
        method: jetpack.findAsync as any,
        methodName: "findAsync",
      },
    ];

    describe('"path" argument', () => {
      tests.forEach((test) => {
        it(test.type, async () => {
          if (test.type === "async") {
            await assert.rejects(() => test.method(undefined, {}), {
              message: `Argument "path" passed to ${test.methodName}([path], options) must be a string. Received undefined`,
            });
          } else {
            assert.throws(
              () => {
                test.method(undefined, {});
              },
              {
                message: `Argument "path" passed to ${test.methodName}([path], options) must be a string. Received undefined`,
              },
            );
          }
        });
      });
    });

    describe('"options" object', () => {
      describe('"matching" argument', () => {
        tests.forEach((test) => {
          it(test.type, async () => {
            if (test.type === "async") {
              await assert.rejects(() => test.method({ matching: 1 }), {
                message: `Argument "options.matching" passed to ${test.methodName}([path], options) must be a string or an array of string. Received number`,
              });
            } else {
              assert.throws(
                () => {
                  test.method({ matching: 1 });
                },
                {
                  message: `Argument "options.matching" passed to ${test.methodName}([path], options) must be a string or an array of string. Received number`,
                },
              );
            }
          });
        });
      });
      describe('"files" argument', () => {
        tests.forEach((test) => {
          it(test.type, async () => {
            if (test.type === "async") {
              await assert.rejects(() => test.method("abc", { files: 1 }), {
                message: `Argument "options.files" passed to ${test.methodName}([path], options) must be a boolean. Received number`,
              });
            } else {
              assert.throws(
                () => {
                  test.method("abc", { files: 1 });
                },
                {
                  message: `Argument "options.files" passed to ${test.methodName}([path], options) must be a boolean. Received number`,
                },
              );
            }
          });
        });
      });
      describe('"directories" argument', () => {
        tests.forEach((test) => {
          it(test.type, async () => {
            if (test.type === "async") {
              await assert.rejects(
                () => test.method("abc", { directories: 1 }),
                {
                  message: `Argument "options.directories" passed to ${test.methodName}([path], options) must be a boolean. Received number`,
                },
              );
            } else {
              assert.throws(
                () => {
                  test.method("abc", { directories: 1 });
                },
                {
                  message: `Argument "options.directories" passed to ${test.methodName}([path], options) must be a boolean. Received number`,
                },
              );
            }
          });
        });
      });
      describe('"recursive" argument', () => {
        tests.forEach((test) => {
          it(test.type, async () => {
            if (test.type === "async") {
              await assert.rejects(() => test.method("abc", { recursive: 1 }), {
                message: `Argument "options.recursive" passed to ${test.methodName}([path], options) must be a boolean. Received number`,
              });
            } else {
              assert.throws(
                () => {
                  test.method("abc", { recursive: 1 });
                },
                {
                  message: `Argument "options.recursive" passed to ${test.methodName}([path], options) must be a boolean. Received number`,
                },
              );
            }
          });
        });
      });
      describe('"ignoreCase" argument', () => {
        tests.forEach((test) => {
          it(test.type, async () => {
            if (test.type === "async") {
              await assert.rejects(
                () => test.method("abc", { ignoreCase: 1 }),
                {
                  message: `Argument "options.ignoreCase" passed to ${test.methodName}([path], options) must be a boolean. Received number`,
                },
              );
            } else {
              assert.throws(
                () => {
                  test.method("abc", { ignoreCase: 1 });
                },
                {
                  message: `Argument "options.ignoreCase" passed to ${test.methodName}([path], options) must be a boolean. Received number`,
                },
              );
            }
          });
        });
      });
    });
  });
});
