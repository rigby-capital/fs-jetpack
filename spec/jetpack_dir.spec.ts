import fse from "fs-extra";
import * as pathUtil from "node:path";
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import assertPath from "./assert_path.js";
import helper from "./helper.js";
import jetpack from "../source/index.js";

describe("JetpackDir", () => {
  beforeEach(helper.setCleanTestCwd);
  afterEach(helper.switchBackToCorrectCwd);

  describe("path()", () => {
    it("returns the absolute path of the directory reference", () => {
      const d = jetpack.dir("mydir");
      assert.strictEqual(d.path(), pathUtil.resolve("mydir"));
    });
  });

  describe("exists()", () => {
    it("returns false if directory does not exist", () => {
      const d = jetpack.dir("nope");
      assert.strictEqual(d.exists(), false);
    });

    it("returns 'dir' if directory exists", () => {
      fse.mkdirSync("mydir");
      const d = jetpack.dir("mydir");
      assert.strictEqual(d.exists(), "dir");
    });

    it("async variant works", async () => {
      fse.mkdirSync("mydir");
      const d = jetpack.dir("mydir");
      assert.strictEqual(await d.existsAsync(), "dir");
    });
  });

  describe("file()", () => {
    it("creates a lazy JetpackFile reference within the directory", () => {
      const d = jetpack.dir("mydir");
      const f = d.file("hello.txt");
      assert.strictEqual(f.path(), pathUtil.resolve("mydir", "hello.txt"));
    });

    it("nested file references resolve correctly", () => {
      const d = jetpack.dir("a");
      const f = d.file("b/c.txt");
      assert.strictEqual(f.path(), pathUtil.resolve("a", "b", "c.txt"));
    });
  });

  describe("dir()", () => {
    it("creates a lazy JetpackDir reference within the directory", () => {
      const d = jetpack.dir("parent");
      const child = d.dir("child");
      assert.strictEqual(child.path(), pathUtil.resolve("parent", "child"));
    });
  });

  describe("list()", () => {
    it("lists directory contents", () => {
      fse.mkdirSync("mydir");
      fse.writeFileSync("mydir/a.txt", "a");
      fse.writeFileSync("mydir/b.txt", "b");
      const d = jetpack.dir("mydir");
      const entries = d.list();
      assert.ok(entries.includes("a.txt"));
      assert.ok(entries.includes("b.txt"));
    });

    it("throws ENOENT if directory does not exist (strict semantic)", () => {
      const d = jetpack.dir("missing");
      assert.throws(
        () => d.list(),
        (err: any) => {
          assert.strictEqual(err.code, "ENOENT");
          return true;
        },
      );
    });

    it("async variant lists contents", async () => {
      fse.mkdirSync("mydir");
      fse.writeFileSync("mydir/a.txt", "a");
      const d = jetpack.dir("mydir");
      const entries = await d.listAsync();
      assert.ok(entries.includes("a.txt"));
    });

    it("async variant throws ENOENT if missing", async () => {
      const d = jetpack.dir("missing");
      await assert.rejects(
        () => d.listAsync(),
        (err: any) => {
          assert.strictEqual(err.code, "ENOENT");
          return true;
        },
      );
    });
  });

  describe("find()", () => {
    it("finds files matching pattern", () => {
      fse.mkdirSync("mydir");
      fse.writeFileSync("mydir/a.txt", "a");
      fse.writeFileSync("mydir/b.md", "b");
      const d = jetpack.dir("mydir");
      const found = d.find({ matching: "*.txt" });
      assert.ok(found.some((f: string) => f.includes("a.txt")));
      assert.ok(!found.some((f: string) => f.includes("b.md")));
    });

    it("async variant finds files", async () => {
      fse.mkdirSync("mydir");
      fse.writeFileSync("mydir/a.txt", "a");
      const d = jetpack.dir("mydir");
      const found = await d.findAsync({ matching: "*.txt" });
      assert.ok(found.some((f: string) => f.includes("a.txt")));
    });
  });

  describe("copy()", () => {
    it("copies the directory", () => {
      fse.mkdirSync("src");
      fse.writeFileSync("src/file.txt", "data");
      const d = jetpack.dir("src");
      d.copy(pathUtil.resolve("dst"));
      assertPath("dst/file.txt").shouldBeFileWithContent("data");
    });

    it("async variant copies the directory", async () => {
      fse.mkdirSync("src");
      fse.writeFileSync("src/file.txt", "data");
      const d = jetpack.dir("src");
      await d.copyAsync(pathUtil.resolve("dst"));
      assertPath("dst/file.txt").shouldBeFileWithContent("data");
    });
  });

  describe("move()", () => {
    it("moves the directory", () => {
      fse.mkdirSync("src");
      fse.writeFileSync("src/file.txt", "data");
      const d = jetpack.dir("src");
      d.move(pathUtil.resolve("dst"));
      assertPath("src").shouldNotExist();
      assertPath("dst/file.txt").shouldBeFileWithContent("data");
    });

    it("async variant moves the directory", async () => {
      fse.mkdirSync("src");
      fse.writeFileSync("src/file.txt", "data");
      const d = jetpack.dir("src");
      await d.moveAsync(pathUtil.resolve("dst"));
      assertPath("src").shouldNotExist();
      assertPath("dst/file.txt").shouldBeFileWithContent("data");
    });
  });

  describe("rename()", () => {
    it("renames the directory", () => {
      fse.mkdirSync("old");
      fse.writeFileSync("old/file.txt", "data");
      const d = jetpack.dir("old");
      d.rename("new");
      assertPath("old").shouldNotExist();
      assertPath("new/file.txt").shouldBeFileWithContent("data");
    });

    it("async variant renames the directory", async () => {
      fse.mkdirSync("old");
      fse.writeFileSync("old/file.txt", "data");
      const d = jetpack.dir("old");
      await d.renameAsync("new");
      assertPath("old").shouldNotExist();
      assertPath("new/file.txt").shouldBeFileWithContent("data");
    });
  });

  describe("remove()", () => {
    it("removes the directory and everything inside", () => {
      fse.mkdirSync("doomed");
      fse.writeFileSync("doomed/file.txt", "bye");
      const d = jetpack.dir("doomed");
      d.remove();
      assertPath("doomed").shouldNotExist();
    });

    it("does nothing if directory does not exist", () => {
      const d = jetpack.dir("nonexistent");
      d.remove(); // should not throw
    });

    it("async variant removes the directory", async () => {
      fse.mkdirSync("doomed");
      fse.writeFileSync("doomed/file.txt", "bye");
      const d = jetpack.dir("doomed");
      await d.removeAsync();
      assertPath("doomed").shouldNotExist();
    });
  });

  describe("ensure()", () => {
    it("creates the directory if it doesn't exist", () => {
      const d = jetpack.dir("newdir");
      d.ensure();
      assertPath("newdir").shouldBeDirectory();
    });

    it("returns this for fluent chaining", () => {
      const d = jetpack.dir("newdir");
      const result = d.ensure();
      assert.strictEqual(result, d);
    });

    it("creates nested directories", () => {
      const d = jetpack.dir("a/b/c");
      d.ensure();
      assertPath("a/b/c").shouldBeDirectory();
    });

    it("async variant creates the directory", async () => {
      const d = jetpack.dir("newdir");
      const result = await d.ensureAsync();
      assert.strictEqual(result, d);
      assertPath("newdir").shouldBeDirectory();
    });
  });

  describe("inspect()", () => {
    it("returns inspect result for existing directory", () => {
      fse.mkdirSync("mydir");
      const d = jetpack.dir("mydir");
      const result = d.inspect();
      assert.strictEqual(result.name, "mydir");
      assert.strictEqual(result.type, "dir");
    });

    it("throws ENOENT if directory does not exist (strict semantic)", () => {
      const d = jetpack.dir("missing");
      assert.throws(
        () => d.inspect(),
        (err: any) => {
          assert.strictEqual(err.code, "ENOENT");
          return true;
        },
      );
    });

    it("async variant returns inspect result", async () => {
      fse.mkdirSync("mydir");
      const d = jetpack.dir("mydir");
      const result = await d.inspectAsync();
      assert.strictEqual(result.name, "mydir");
    });

    it("async variant throws ENOENT if missing", async () => {
      const d = jetpack.dir("missing");
      await assert.rejects(
        () => d.inspectAsync(),
        (err: any) => {
          assert.strictEqual(err.code, "ENOENT");
          return true;
        },
      );
    });
  });

  describe("inspectTree()", () => {
    it("returns tree for existing directory", () => {
      fse.mkdirSync("mydir");
      fse.writeFileSync("mydir/file.txt", "data");
      const d = jetpack.dir("mydir");
      const tree = d.inspectTree();
      assert.strictEqual(tree.name, "mydir");
      assert.ok(tree.children);
      assert.ok(tree.children.length > 0);
    });

    it("throws ENOENT if directory does not exist", () => {
      const d = jetpack.dir("missing");
      assert.throws(
        () => d.inspectTree(),
        (err: any) => {
          assert.strictEqual(err.code, "ENOENT");
          return true;
        },
      );
    });

    it("async variant returns tree", async () => {
      fse.mkdirSync("mydir");
      fse.writeFileSync("mydir/file.txt", "data");
      const d = jetpack.dir("mydir");
      const tree = await d.inspectTreeAsync();
      assert.strictEqual(tree.name, "mydir");
      assert.ok(tree.children);
    });
  });

  describe("tmpDir()", () => {
    it("creates a temporary directory and returns a JetpackDir", () => {
      fse.mkdirSync("base");
      const d = jetpack.dir("base");
      const tmp = d.tmpDir({ basePath: "." });
      assert.strictEqual(typeof tmp.path(), "string");
      assert.ok(tmp.path().startsWith(pathUtil.resolve("base")));
      assert.strictEqual(tmp.exists(), "dir");
    });

    it("defaults to os.tmpdir() when no basePath specified", () => {
      fse.mkdirSync("base");
      const d = jetpack.dir("base");
      const tmp = d.tmpDir();
      assert.strictEqual(typeof tmp.path(), "string");
      assert.strictEqual(tmp.exists(), "dir");
    });

    it("async variant creates a temporary directory", async () => {
      fse.mkdirSync("base");
      const d = jetpack.dir("base");
      const tmp = await d.tmpDirAsync({ basePath: "." });
      assert.strictEqual(typeof tmp.path(), "string");
      assert.ok(tmp.path().startsWith(pathUtil.resolve("base")));
      assert.strictEqual(tmp.exists(), "dir");
    });
  });

  describe("lazy semantics", () => {
    it("does not perform any I/O on construction", () => {
      // This should not throw even though the directory doesn't exist
      const d = jetpack.dir("nonexistent");
      assert.strictEqual(typeof d.path(), "string");
    });
  });

  describe("composability", () => {
    it("can chain dir().file() to create and write files", () => {
      const d = jetpack.dir("project");
      d.ensure();
      d.file("config.json").write({ key: "value" });
      const content = fse.readFileSync(
        pathUtil.resolve("project", "config.json"),
        "utf8",
      );
      assert.deepStrictEqual(JSON.parse(content), { key: "value" });
    });

    it("can chain dir().dir() to create nested structures", () => {
      const d = jetpack.dir("project");
      d.ensure();
      const sub = d.dir("src");
      sub.ensure();
      assertPath("project/src").shouldBeDirectory();
    });
  });
});
