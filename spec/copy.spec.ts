import fse from "fs-extra";
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import assertPath from "./assert_path.js";
import helper from "./helper.js";
import jetpack, { type InspectResult } from "../source/index.js";

describe("copy", () => {
  beforeEach(helper.setCleanTestCwd);
  afterEach(helper.switchBackToCorrectCwd);

  describe("copies a file", () => {
    const preparations = () => {
      fse.outputFileSync("file.txt", "abc");
    };

    const expectations = () => {
      assertPath("file.txt").shouldBeFileWithContent("abc");
      assertPath("file_copied.txt").shouldBeFileWithContent("abc");
    };

    it("sync", () => {
      preparations();
      jetpack.copy("file.txt", "file_copied.txt");
      expectations();
    });

    it("async", async () => {
      preparations();
      await jetpack.copyAsync("file.txt", "file_copied.txt");
      expectations();
    });
  });

  describe("can copy file to nonexistent directory (will create directory)", () => {
    const preparations = () => {
      fse.outputFileSync("file.txt", "abc");
    };

    const expectations = () => {
      assertPath("file.txt").shouldBeFileWithContent("abc");
      assertPath("dir/dir/file.txt").shouldBeFileWithContent("abc");
    };

    it("sync", () => {
      preparations();
      jetpack.copy("file.txt", "dir/dir/file.txt");
      expectations();
    });

    it("async", async () => {
      preparations();
      await jetpack.copyAsync("file.txt", "dir/dir/file.txt");
      expectations();
    });
  });

  describe("copies empty directory", () => {
    const preparations = () => {
      fse.mkdirsSync("dir");
    };

    const expectations = () => {
      assertPath("copied/dir").shouldBeDirectory();
    };

    it("sync", () => {
      preparations();
      jetpack.copy("dir", "copied/dir");
      expectations();
    });

    it("async", async () => {
      preparations();
      await jetpack.copyAsync("dir", "copied/dir");
      expectations();
    });
  });

  describe("copies a tree of files", () => {
    const preparations = () => {
      fse.outputFileSync("a/f1.txt", "abc");
      fse.outputFileSync("a/b/f2.txt", "123");
      fse.mkdirsSync("a/b/c");
    };

    const expectations = () => {
      assertPath("copied/a/f1.txt").shouldBeFileWithContent("abc");
      assertPath("copied/a/b/c").shouldBeDirectory();
      assertPath("copied/a/b/f2.txt").shouldBeFileWithContent("123");
    };

    it("sync", () => {
      preparations();
      jetpack.copy("a", "copied/a");
      expectations();
    });

    it("async", async () => {
      preparations();
      await jetpack.copyAsync("a", "copied/a");
      expectations();
    });
  });

  describe("generates nice error if source path doesn't exist", () => {
    const expectations = (err: any) => {
      assert.strictEqual(err.code, "ENOENT");
      assert.ok(err.message.includes("Path to copy doesn't exist"));
    };

    it("sync", () => {
      try {
        jetpack.copy("a", "b");
        throw new Error("Expected error to be thrown");
      } catch (err: any) {
        expectations(err);
      }
    });

    it("async", async () => {
      await assert.rejects(
        () => jetpack.copyAsync("a", "b"),
        (err: any) => {
          expectations(err);
          return true;
        },
      );
    });
  });

  describe("respects internal CWD of jetpack instance", () => {
    const preparations = () => {
      fse.outputFileSync("a/b.txt", "abc");
    };

    const expectations = () => {
      assertPath("a/b.txt").shouldBeFileWithContent("abc");
      assertPath("a/x.txt").shouldBeFileWithContent("abc");
    };

    it("sync", () => {
      const jetContext = jetpack.cwd("a");
      preparations();
      jetContext.copy("b.txt", "x.txt");
      expectations();
    });

    it("async", async () => {
      const jetContext = jetpack.cwd("a");
      preparations();
      await jetContext.copyAsync("b.txt", "x.txt");
      expectations();
    });
  });

  describe("overwriting behaviour", () => {
    describe("does not overwrite by default", () => {
      const preparations = () => {
        fse.outputFileSync("a/file.txt", "abc");
        fse.mkdirsSync("b");
      };

      const expectations = (err: any) => {
        assert.strictEqual(err.code, "EEXIST");
        assert.ok(err.message.includes("Destination path already exists"));
      };

      it("sync", () => {
        preparations();
        try {
          jetpack.copy("a", "b");
          throw new Error("Expected error to be thrown");
        } catch (err: any) {
          expectations(err);
        }
      });

      it("async", async () => {
        preparations();
        await assert.rejects(
          () => jetpack.copyAsync("a", "b"),
          (err: any) => {
            expectations(err);
            return true;
          },
        );
      });
    });

    describe("overwrites if it was specified", () => {
      const preparations = () => {
        fse.outputFileSync("a/file.txt", "abc");
        fse.outputFileSync("b/file.txt", "xyz");
      };

      const expectations = () => {
        assertPath("a/file.txt").shouldBeFileWithContent("abc");
        assertPath("b/file.txt").shouldBeFileWithContent("abc");
      };

      it("sync", () => {
        preparations();
        jetpack.copy("a", "b", { overwrite: true });
        expectations();
      });

      it("async", async () => {
        preparations();
        await jetpack.copyAsync("a", "b", { overwrite: true });
        expectations();
      });
    });

    describe("overwrites according to what function returns", () => {
      const preparations = () => {
        fse.outputFileSync("from-here/foo/canada.txt", "abc");
        fse.outputFileSync("to-here/foo/canada.txt", "xyz");
        fse.outputFileSync("from-here/foo/eh.txt", "abc");
        fse.outputFileSync("to-here/foo/eh.txt", "xyz");
      };

      const expectations = () => {
        // canada is copied
        assertPath("from-here/foo/canada.txt").shouldBeFileWithContent("abc");
        assertPath("to-here/foo/canada.txt").shouldBeFileWithContent("abc");

        // eh is not copied
        assertPath("from-here/foo/eh.txt").shouldBeFileWithContent("abc");
        assertPath("to-here/foo/eh.txt").shouldBeFileWithContent("xyz");
      };

      const overwrite = (
        srcInspectData: InspectResult,
        destInspectData: InspectResult,
      ) => {
        assert.ok("name" in srcInspectData);
        assert.ok("type" in srcInspectData);
        assert.ok("mode" in srcInspectData);
        assert.ok("accessTime" in srcInspectData);
        assert.ok("modifyTime" in srcInspectData);
        assert.ok("changeTime" in srcInspectData);
        assert.ok("birthTime" in srcInspectData);
        assert.ok("absolutePath" in srcInspectData);

        assert.ok("name" in destInspectData);
        assert.ok("type" in destInspectData);
        assert.ok("mode" in destInspectData);
        assert.ok("accessTime" in destInspectData);
        assert.ok("modifyTime" in destInspectData);
        assert.ok("changeTime" in destInspectData);
        assert.ok("birthTime" in destInspectData);
        assert.ok("absolutePath" in destInspectData);

        return srcInspectData.name.includes("canada");
      };

      it("sync", () => {
        preparations();
        jetpack.copy("from-here", "to-here", { overwrite });
        expectations();
      });

      it("async", async () => {
        preparations();
        await jetpack.copyAsync("from-here", "to-here", { overwrite });
        expectations();
      });
    });
  });

  describe("async overwrite function can return promise", () => {
    const preparations = () => {
      fse.outputFileSync("from-here/foo/canada.txt", "abc");
      fse.outputFileSync("to-here/foo/canada.txt", "xyz");
      fse.outputFileSync("from-here/foo/eh.txt", "123");
      fse.outputFileSync("to-here/foo/eh.txt", "456");
    };

    const expectations = () => {
      // canada is copied
      assertPath("from-here/foo/canada.txt").shouldBeFileWithContent("abc");
      assertPath("to-here/foo/canada.txt").shouldBeFileWithContent("abc");

      // eh is not copied
      assertPath("from-here/foo/eh.txt").shouldBeFileWithContent("123");
      assertPath("to-here/foo/eh.txt").shouldBeFileWithContent("456");
    };

    const overwrite = (
      srcInspectData: InspectResult,
      destInspectData: InspectResult,
    ): Promise<boolean> => {
      return new Promise((resolve, reject) => {
        jetpack.readAsync(srcInspectData.absolutePath).then((data) => {
          resolve(data === "abc");
        });
      });
    };

    it("async", async () => {
      preparations();
      await jetpack.copyAsync("from-here", "to-here", { overwrite });
      expectations();
    });
  });

  describe("filter what to copy", () => {
    describe("by simple pattern", () => {
      const preparations = () => {
        fse.outputFileSync("dir/file.txt", "1");
        fse.outputFileSync("dir/file.md", "m1");
        fse.outputFileSync("dir/a/file.txt", "2");
        fse.outputFileSync("dir/a/file.md", "m2");
      };

      const expectations = () => {
        assertPath("copy/file.txt").shouldBeFileWithContent("1");
        assertPath("copy/file.md").shouldNotExist();
        assertPath("copy/a/file.txt").shouldBeFileWithContent("2");
        assertPath("copy/a/file.md").shouldNotExist();
      };

      it("sync", () => {
        preparations();
        jetpack.copy("dir", "copy", { matching: "*.txt" });
        expectations();
      });

      it("async", async () => {
        preparations();
        await jetpack.copyAsync("dir", "copy", { matching: "*.txt" });
        expectations();
      });
    });

    describe("by pattern anchored to copied directory", () => {
      const preparations = () => {
        fse.outputFileSync("x/y/dir/file.txt", "1");
        fse.outputFileSync("x/y/dir/a/file.txt", "2");
        fse.outputFileSync("x/y/dir/a/b/file.txt", "3");
      };

      const expectations = () => {
        assertPath("copy/file.txt").shouldNotExist();
        assertPath("copy/a/file.txt").shouldBeFileWithContent("2");
        assertPath("copy/a/b/file.txt").shouldNotExist();
      };

      it("sync", () => {
        preparations();
        jetpack.copy("x/y/dir", "copy", { matching: "a/*.txt" });
        expectations();
      });

      it("async", async () => {
        preparations();
        await jetpack.copyAsync("x/y/dir", "copy", { matching: "a/*.txt" });
        expectations();
      });
    });

    describe("can use ./ as indication of anchor directory", () => {
      const preparations = () => {
        fse.outputFileSync("x/y/a.txt", "123");
        fse.outputFileSync("x/y/b/a.txt", "456");
      };

      const expectations = () => {
        assertPath("copy/a.txt").shouldBeFileWithContent("123");
        assertPath("copy/b/a.txt").shouldNotExist();
      };

      it("sync", () => {
        preparations();
        jetpack.copy("x/y", "copy", { matching: "./a.txt" });
        expectations();
      });

      it("async", async () => {
        preparations();
        await jetpack.copyAsync("x/y", "copy", { matching: "./a.txt" });
        expectations();
      });
    });

    describe("matching works also if copying single file", () => {
      const preparations = () => {
        fse.outputFileSync("a", "123");
        fse.outputFileSync("x", "456");
      };

      const expectations = () => {
        assertPath("a-copy").shouldNotExist();
        assertPath("x-copy").shouldBeFileWithContent("456");
      };

      it("sync", () => {
        preparations();
        jetpack.copy("a", "a-copy", { matching: "x" });
        jetpack.copy("x", "x-copy", { matching: "x" });
        expectations();
      });

      it("async", async () => {
        preparations();
        await jetpack.copyAsync("a", "a-copy", { matching: "x" });
        await jetpack.copyAsync("x", "x-copy", { matching: "x" });
        expectations();
      });
    });

    describe("can use negation in patterns", () => {
      const preparations = () => {
        fse.mkdirsSync("x/y/dir/a/b");
        fse.mkdirsSync("x/y/dir/a/x");
        fse.mkdirsSync("x/y/dir/a/y");
        fse.mkdirsSync("x/y/dir/a/z");
      };

      const expectations = () => {
        assertPath("copy/dir/a/b").shouldBeDirectory();
        assertPath("copy/dir/a/x").shouldNotExist();
        assertPath("copy/dir/a/y").shouldNotExist();
        assertPath("copy/dir/a/z").shouldNotExist();
      };

      it("sync", () => {
        preparations();
        jetpack.copy("x/y", "copy", {
          matching: [
            "**",
            // Three different pattern types to test:
            "!x",
            "!dir/a/y",
            "!./dir/a/z",
          ],
        });
        expectations();
      });

      it("async", async () => {
        preparations();
        await jetpack.copyAsync("x/y", "copy", {
          matching: [
            "**",
            // Three different pattern types to test:
            "!x",
            "!dir/a/y",
            "!./dir/a/z",
          ],
        });
        expectations();
      });
    });

    describe("wildcard copies everything", () => {
      const preparations = () => {
        // Just a file
        fse.outputFileSync("x/file.txt", "123");
        // Dot file
        fse.outputFileSync("x/y/.dot", "dot");
        // Empty directory
        fse.mkdirsSync("x/y/z");
      };

      const expectations = () => {
        assertPath("copy/file.txt").shouldBeFileWithContent("123");
        assertPath("copy/y/.dot").shouldBeFileWithContent("dot");
        assertPath("copy/y/z").shouldBeDirectory();
      };

      it("sync", () => {
        preparations();
        jetpack.copy("x", "copy", { matching: "**" });
        expectations();
      });

      it("async", async () => {
        preparations();
        await jetpack.copyAsync("x", "copy", { matching: "**" });
        expectations();
      });
    });
  });

  describe("can copy symlink", () => {
    const preparations = () => {
      fse.mkdirsSync("to_copy");
      fse.symlinkSync("some/file", "to_copy/symlink");
    };
    const expectations = () => {
      assert.strictEqual(
        fse.lstatSync("copied/symlink").isSymbolicLink(),
        true,
      );
      assert.strictEqual(
        fse.readlinkSync("copied/symlink"),
        helper.osSep("some/file"),
      );
    };

    it("sync", () => {
      preparations();
      jetpack.copy("to_copy", "copied");
      expectations();
    });

    it("async", async () => {
      preparations();
      await jetpack.copyAsync("to_copy", "copied");
      expectations();
    });
  });

  describe("can overwrite symlink", () => {
    const preparations = () => {
      fse.mkdirsSync("to_copy");
      fse.symlinkSync("some/file", "to_copy/symlink");
      fse.mkdirsSync("copied");
      fse.symlinkSync("some/other_file", "copied/symlink");
    };

    const expectations = () => {
      assert.strictEqual(
        fse.lstatSync("copied/symlink").isSymbolicLink(),
        true,
      );
      assert.strictEqual(
        fse.readlinkSync("copied/symlink"),
        helper.osSep("some/file"),
      );
    };

    it("sync", () => {
      preparations();
      jetpack.copy("to_copy", "copied", { overwrite: true });
      expectations();
    });

    it("async", async () => {
      preparations();
      await jetpack.copyAsync("to_copy", "copied", { overwrite: true });
      expectations();
    });
  });

  describe("if ignoreCase=true it ignores case in patterns", () => {
    // This test actually tests nothing if performed on case-insensitive file system.

    const preparations = () => {
      fse.mkdirsSync("orig/FoO/BaR/x");
    };

    const expectations = () => {
      assertPath("copy/FoO/BaR/x").shouldBeDirectory();
    };

    it("sync", () => {
      preparations();
      jetpack.copy("orig", "copy", {
        matching: ["foo/bar/x"],
        ignoreCase: true,
      });
      expectations();
    });

    it("async", async () => {
      preparations();
      await jetpack.copyAsync("orig", "copy", {
        matching: ["foo/bar/x"],
        ignoreCase: true,
      });
      expectations();
    });
  });

  if (process.platform !== "win32") {
    describe("copies also file permissions (unix only)", () => {
      const preparations = () => {
        fse.outputFileSync("a/b/c.txt", "abc");
        fse.chmodSync("a/b", "700");
        fse.chmodSync("a/b/c.txt", "711");
      };

      const expectations = () => {
        assertPath("x/b").shouldHaveMode("700");
        assertPath("x/b/c.txt").shouldHaveMode("711");
      };

      it("sync", () => {
        preparations();
        jetpack.copy("a", "x");
        expectations();
      });

      it("async", async () => {
        preparations();
        await jetpack.copyAsync("a", "x");
        expectations();
      });
    });
  }

  describe("input validation", () => {
    const tests = [
      { type: "sync", method: jetpack.copy as any, methodName: "copy" },
      {
        type: "async",
        method: jetpack.copyAsync as any,
        methodName: "copyAsync",
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
            await assert.rejects(() => test.method("abc"), {
              message: `Argument "to" passed to ${test.methodName}(from, to, [options]) must be a string. Received undefined`,
            });
          } else {
            assert.throws(
              () => {
                test.method("abc");
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
                  message: `Argument "options.overwrite" passed to ${test.methodName}(from, to, [options]) must be a boolean or a function. Received number`,
                },
              );
            } else {
              assert.throws(
                () => {
                  test.method("abc", "xyz", { overwrite: 1 });
                },
                {
                  message: `Argument "options.overwrite" passed to ${test.methodName}(from, to, [options]) must be a boolean or a function. Received number`,
                },
              );
            }
          });
        });
      });
      describe('"matching" argument', () => {
        tests.forEach((test) => {
          it(test.type, async () => {
            if (test.type === "async") {
              await assert.rejects(
                () => test.method("abc", "xyz", { matching: 1 }),
                {
                  message: `Argument "options.matching" passed to ${test.methodName}(from, to, [options]) must be a string or an array of string. Received number`,
                },
              );
            } else {
              assert.throws(
                () => {
                  test.method("abc", "xyz", { matching: 1 });
                },
                {
                  message: `Argument "options.matching" passed to ${test.methodName}(from, to, [options]) must be a string or an array of string. Received number`,
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
                () => test.method("abc", "xyz", { ignoreCase: 1 }),
                {
                  message: `Argument "options.ignoreCase" passed to ${test.methodName}(from, to, [options]) must be a boolean. Received number`,
                },
              );
            } else {
              assert.throws(
                () => {
                  test.method("abc", "xyz", { ignoreCase: 1 });
                },
                {
                  message: `Argument "options.ignoreCase" passed to ${test.methodName}(from, to, [options]) must be a boolean. Received number`,
                },
              );
            }
          });
        });
      });
    });
  });
});
