import fse from "fs-extra";
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import assertPath from "./assert_path.js";
import helper from "./helper.js";
import jetpack, { type InspectTreeResult } from "../source/index.js";

describe("inspectTree", () => {
  beforeEach(helper.setCleanTestCwd);
  afterEach(helper.switchBackToCorrectCwd);

  describe("inspects whole tree of files", () => {
    const preparations = () => {
      fse.outputFileSync("dir/file.txt", "abc");
      fse.outputFileSync("dir/subdir/file.txt", "defg");
    };

    const expectations = (data: InspectTreeResult) => {
      assert.deepStrictEqual(data, {
        name: "dir",
        type: "dir",
        size: 7,
        children: [
          {
            name: "subdir",
            type: "dir",
            size: 4,
            children: [
              {
                name: "file.txt",
                type: "file",
                size: 4,
              },
            ],
          },
          {
            name: "file.txt",
            type: "file",
            size: 3,
          },
        ],
      });
    };

    it("sync", () => {
      preparations();
      expectations(jetpack.inspectTree("dir"));
    });

    it("async", async () => {
      preparations();
      const tree = await jetpack.inspectTreeAsync("dir");
      expectations(tree);
    });
  });

  describe("sorts the results alphabetically, and by directories first, files second", () => {
    const preparations = () => {
      fse.outputFileSync("dir/z.txt", "xyz");
      fse.outputFileSync("dir/a.txt", "abc");
      fse.mkdirsSync("dir/z/b");
      fse.mkdirsSync("dir/z/a");
    };

    const expectations = (data: InspectTreeResult) => {
      assert.deepStrictEqual(data, {
        name: "dir",
        type: "dir",
        size: 6,
        children: [
          {
            name: "z",
            type: "dir",
            size: 0,
            children: [
              {
                name: "a",
                type: "dir",
                size: 0,
                children: [],
              },
              {
                name: "b",
                type: "dir",
                size: 0,
                children: [],
              },
            ],
          },
          {
            name: "a.txt",
            type: "file",
            size: 3,
          },
          {
            name: "z.txt",
            type: "file",
            size: 3,
          },
        ],
      });
    };

    it("sync", () => {
      preparations();
      expectations(jetpack.inspectTree("dir"));
    });

    it("async", async () => {
      preparations();
      const tree = await jetpack.inspectTreeAsync("dir");
      expectations(tree);
    });
  });

  describe("can output relative path for every tree node", () => {
    const preparations = () => {
      fse.outputFileSync("dir/subdir/file.txt", "defg");
    };

    const expectations = (data: InspectTreeResult) => {
      assert.strictEqual(data.relativePath, ".");
      assert.strictEqual(data.children[0].relativePath, "./subdir");
      assert.strictEqual(
        data.children[0].children[0].relativePath,
        "./subdir/file.txt",
      );
    };

    it("sync", () => {
      preparations();
      expectations(jetpack.inspectTree("dir", { relativePath: true }));
    });

    it("async", async () => {
      preparations();
      const tree = await jetpack.inspectTreeAsync("dir", {
        relativePath: true,
      });
      expectations(tree);
    });
  });

  describe("if given path is a file just inspects that file", () => {
    const preparations = () => {
      fse.outputFileSync("dir/file.txt", "abc");
    };

    const expectations = (data: InspectTreeResult) => {
      assert.deepStrictEqual(data, {
        name: "file.txt",
        type: "file",
        size: 3,
      });
    };

    it("sync", () => {
      preparations();
      expectations(jetpack.inspectTree("dir/file.txt"));
    });

    it("async", async () => {
      preparations();
      const tree = await jetpack.inspectTreeAsync("dir/file.txt");
      expectations(tree);
    });
  });

  describe("behaves ok with empty directory", () => {
    const preparations = () => {
      fse.mkdirsSync("empty");
    };

    const expectations = (data: InspectTreeResult) => {
      assert.deepStrictEqual(data, {
        name: "empty",
        type: "dir",
        size: 0,
        children: [],
      });
    };

    it("sync", () => {
      preparations();
      expectations(jetpack.inspectTree("empty"));
    });

    it("async", async () => {
      preparations();
      const tree = await jetpack.inspectTreeAsync("empty");
      expectations(tree);
    });
  });

  describe("returns undefined if path doesn't exist", () => {
    const expectations = (data: InspectTreeResult) => {
      assert.strictEqual(data, undefined);
    };

    it("sync", () => {
      expectations(jetpack.inspectTree("nonexistent"));
    });

    it("async", async () => {
      const dataAsync = await jetpack.inspectTreeAsync("nonexistent");
      expectations(dataAsync);
    });
  });

  describe("can output file times (ctime, mtime, atime, birthtime)", () => {
    const preparations = () => {
      fse.outputFileSync("dir/file.txt", "abc");
    };

    const expectations = (data: InspectTreeResult) => {
      assert.strictEqual(typeof data.accessTime.getTime, "function");
      assert.strictEqual(typeof data.modifyTime.getTime, "function");
      assert.strictEqual(typeof data.changeTime.getTime, "function");
      assert.strictEqual(typeof data.birthTime.getTime, "function");

      assert.strictEqual(
        typeof data.children[0].accessTime.getTime,
        "function",
      );
      assert.strictEqual(
        typeof data.children[0].modifyTime.getTime,
        "function",
      );
      assert.strictEqual(
        typeof data.children[0].changeTime.getTime,
        "function",
      );
      assert.strictEqual(typeof data.children[0].birthTime.getTime, "function");
    };

    it("sync", () => {
      preparations();
      expectations(jetpack.inspectTree("dir", { times: true }));
    });

    it("async", async () => {
      preparations();
      const data = await jetpack.inspectTreeAsync("dir", { times: true });
      expectations(data);
    });
  });

  describe("respects internal CWD of jetpack instance", () => {
    const preparations = () => {
      fse.outputFileSync("a/b.txt", "abc");
    };

    const expectations = (data: InspectTreeResult) => {
      assert.strictEqual(data.name, "b.txt");
    };

    it("sync", () => {
      const jetContext = jetpack.cwd("a");
      preparations();
      expectations(jetContext.inspectTree("b.txt"));
    });

    it("async", async () => {
      const jetContext = jetpack.cwd("a");
      preparations();
      const data = await jetContext.inspectTreeAsync("b.txt");
      expectations(data);
    });
  });

  describe("reports symlinks by default", () => {
    const preparations = () => {
      fse.outputFileSync("dir/file.txt", "abc");
      fse.symlinkSync("file.txt", "dir/symlinked_file.txt");
    };

    const expectations = (data: InspectTreeResult) => {
      assert.deepStrictEqual(data, {
        name: "dir",
        type: "dir",
        size: 3,
        children: [
          {
            name: "file.txt",
            type: "file",
            size: 3,
          },
          {
            name: "symlinked_file.txt",
            type: "symlink",
            pointsAt: "file.txt",
          },
        ],
      });
    };

    it("sync", () => {
      preparations();
      expectations(jetpack.inspectTree("dir")); // implicit
      expectations(jetpack.inspectTree("dir", { symlinks: "report" })); // explicit
    });

    it("async", async () => {
      preparations();
      let tree = await jetpack.inspectTreeAsync("dir"); // implicit
      expectations(tree);
      tree = await jetpack.inspectTreeAsync("dir", { symlinks: "report" }); // explicit
      expectations(tree);
    });
  });

  describe("follows symlinks when option specified", () => {
    const preparations = () => {
      fse.outputFileSync("dir/file.txt", "abc");
      fse.symlinkSync("file.txt", "dir/symlinked_file.txt");
    };

    const expectations = (data: InspectTreeResult) => {
      assert.deepStrictEqual(data, {
        name: "dir",
        type: "dir",
        size: 6,
        children: [
          {
            name: "file.txt",
            type: "file",
            size: 3,
          },
          {
            name: "symlinked_file.txt",
            type: "file",
            size: 3,
          },
        ],
      });
    };

    it("sync", () => {
      preparations();
      expectations(jetpack.inspectTree("dir", { symlinks: "follow" }));
    });

    it("async", async () => {
      preparations();
      const tree = await jetpack.inspectTreeAsync("dir", {
        symlinks: "follow",
      });
      expectations(tree);
    });
  });

  describe("can compute checksum of a whole tree", () => {
    const preparations = () => {
      fse.outputFileSync("dir/a.txt", "abc");
      fse.outputFileSync("dir/b.txt", "defg");
    };

    const expectations = (data: InspectTreeResult) => {
      // md5 of
      // 'a.txt' + '900150983cd24fb0d6963f7d28e17f72' +
      // 'b.txt' + '025e4da7edac35ede583f5e8d51aa7ec'
      assert.strictEqual(data.md5, "b0ff9df854172efe752cb36b96c8bccd");
      // md5 of 'abc'
      assert.strictEqual(
        data.children[0].md5,
        "900150983cd24fb0d6963f7d28e17f72",
      );
      // md5 of 'defg'
      assert.strictEqual(
        data.children[1].md5,
        "025e4da7edac35ede583f5e8d51aa7ec",
      );
    };

    it("sync", () => {
      preparations();
      expectations(jetpack.inspectTree("dir", { checksum: "md5" }));
    });

    it("async", async () => {
      preparations();
      const tree = await jetpack.inspectTreeAsync("dir", { checksum: "md5" });
      expectations(tree);
    });
  });

  describe("can count checksum of empty directory", () => {
    const preparations = () => {
      fse.mkdirsSync("empty_dir");
    };

    const expectations = (data: InspectTreeResult) => {
      // md5 of empty string
      assert.strictEqual(data.md5, "d41d8cd98f00b204e9800998ecf8427e");
    };

    it("sync", () => {
      preparations();
      expectations(jetpack.inspectTree("empty_dir", { checksum: "md5" }));
    });

    it("async", async () => {
      preparations();
      const tree = await jetpack.inspectTreeAsync("empty_dir", {
        checksum: "md5",
      });
      expectations(tree);
    });
  });

  describe("input validation", () => {
    const tests = [
      {
        type: "sync",
        method: jetpack.inspectTree as any,
        methodName: "inspectTree",
      },
      {
        type: "async",
        method: jetpack.inspectTreeAsync as any,
        methodName: "inspectTreeAsync",
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
      describe('"relativePath" argument', () => {
        tests.forEach((test) => {
          it(test.type, async () => {
            if (test.type === "async") {
              await assert.rejects(
                () => test.method("abc", { relativePath: 1 }),
                {
                  message: `Argument "options.relativePath" passed to ${test.methodName}(path, [options]) must be a boolean. Received number`,
                },
              );
            } else {
              assert.throws(
                () => {
                  test.method("abc", { relativePath: 1 });
                },
                {
                  message: `Argument "options.relativePath" passed to ${test.methodName}(path, [options]) must be a boolean. Received number`,
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
