import fse from "fs-extra";
import * as pathUtil from "node:path";
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import assertPath from "./assert_path.js";
import helper from "./helper.js";
import jetpack from "../source/index.js";

describe("JetpackFile", () => {
  beforeEach(helper.setCleanTestCwd);
  afterEach(helper.switchBackToCorrectCwd);

  describe("path()", () => {
    it("returns the absolute path of the file reference", () => {
      const f = jetpack.file("hello.txt");
      assert.strictEqual(f.path(), pathUtil.resolve("hello.txt"));
    });
  });

  describe("exists()", () => {
    it("returns false if file does not exist", () => {
      const f = jetpack.file("nope.txt");
      assert.strictEqual(f.exists(), false);
    });

    it("returns 'file' if file exists", () => {
      fse.writeFileSync("hello.txt", "world");
      const f = jetpack.file("hello.txt");
      assert.strictEqual(f.exists(), "file");
    });

    it("async variant works", async () => {
      fse.writeFileSync("hello.txt", "world");
      const f = jetpack.file("hello.txt");
      assert.strictEqual(await f.existsAsync(), "file");
    });
  });

  describe("read()", () => {
    it("reads file content as utf8 by default", () => {
      fse.writeFileSync("hello.txt", "world");
      const f = jetpack.file("hello.txt");
      assert.strictEqual(f.read(), "world");
    });

    it("reads file as buffer", () => {
      fse.writeFileSync("hello.txt", "world");
      const f = jetpack.file("hello.txt");
      const buf = f.read("buffer");
      assert.ok(Buffer.isBuffer(buf));
      assert.strictEqual(buf.toString(), "world");
    });

    it("reads file as json", () => {
      fse.writeFileSync("data.json", '{"a":1}');
      const f = jetpack.file("data.json");
      assert.deepStrictEqual(f.read("json"), { a: 1 });
    });

    it("throws ENOENT if file does not exist (strict semantic)", () => {
      const f = jetpack.file("missing.txt");
      assert.throws(
        () => f.read(),
        (err: any) => {
          assert.strictEqual(err.code, "ENOENT");
          return true;
        },
      );
    });

    it("async variant reads file", async () => {
      fse.writeFileSync("hello.txt", "world");
      const f = jetpack.file("hello.txt");
      assert.strictEqual(await f.readAsync(), "world");
    });

    it("async variant throws ENOENT if file does not exist", async () => {
      const f = jetpack.file("missing.txt");
      await assert.rejects(
        () => f.readAsync(),
        (err: any) => {
          assert.strictEqual(err.code, "ENOENT");
          return true;
        },
      );
    });
  });

  describe("write()", () => {
    it("writes string data", () => {
      const f = jetpack.file("out.txt");
      f.write("hello");
      assertPath("out.txt").shouldBeFileWithContent("hello");
    });

    it("writes object as JSON", () => {
      const f = jetpack.file("out.json");
      f.write({ a: 1 });
      const content = fse.readFileSync("out.json", "utf8");
      assert.deepStrictEqual(JSON.parse(content), { a: 1 });
    });

    it("creates parent directories", () => {
      const f = jetpack.file("a/b/c.txt");
      f.write("deep");
      assertPath("a/b/c.txt").shouldBeFileWithContent("deep");
    });

    it("async variant writes data", async () => {
      const f = jetpack.file("out.txt");
      await f.writeAsync("hello");
      assertPath("out.txt").shouldBeFileWithContent("hello");
    });
  });

  describe("append()", () => {
    it("appends data to existing file", () => {
      fse.writeFileSync("log.txt", "line1\n");
      const f = jetpack.file("log.txt");
      f.append("line2\n");
      assertPath("log.txt").shouldBeFileWithContent("line1\nline2\n");
    });

    it("creates file if it does not exist", () => {
      const f = jetpack.file("log.txt");
      f.append("first");
      assertPath("log.txt").shouldBeFileWithContent("first");
    });

    it("async variant appends data", async () => {
      fse.writeFileSync("log.txt", "a");
      const f = jetpack.file("log.txt");
      await f.appendAsync("b");
      assertPath("log.txt").shouldBeFileWithContent("ab");
    });
  });

  describe("copy()", () => {
    it("copies the file to a new location", () => {
      fse.writeFileSync("src.txt", "data");
      const f = jetpack.file("src.txt");
      f.copy(pathUtil.resolve("dst.txt"));
      assertPath("dst.txt").shouldBeFileWithContent("data");
    });

    it("async variant copies the file", async () => {
      fse.writeFileSync("src.txt", "data");
      const f = jetpack.file("src.txt");
      await f.copyAsync(pathUtil.resolve("dst.txt"));
      assertPath("dst.txt").shouldBeFileWithContent("data");
    });
  });

  describe("move()", () => {
    it("moves the file", () => {
      fse.writeFileSync("src.txt", "data");
      const f = jetpack.file("src.txt");
      f.move(pathUtil.resolve("dst.txt"));
      assertPath("src.txt").shouldNotExist();
      assertPath("dst.txt").shouldBeFileWithContent("data");
    });

    it("async variant moves the file", async () => {
      fse.writeFileSync("src.txt", "data");
      const f = jetpack.file("src.txt");
      await f.moveAsync(pathUtil.resolve("dst.txt"));
      assertPath("src.txt").shouldNotExist();
      assertPath("dst.txt").shouldBeFileWithContent("data");
    });
  });

  describe("rename()", () => {
    it("renames the file", () => {
      fse.writeFileSync("old.txt", "data");
      const f = jetpack.file("old.txt");
      f.rename("new.txt");
      assertPath("old.txt").shouldNotExist();
      assertPath("new.txt").shouldBeFileWithContent("data");
    });

    it("async variant renames the file", async () => {
      fse.writeFileSync("old.txt", "data");
      const f = jetpack.file("old.txt");
      await f.renameAsync("new.txt");
      assertPath("old.txt").shouldNotExist();
      assertPath("new.txt").shouldBeFileWithContent("data");
    });
  });

  describe("remove()", () => {
    it("removes the file", () => {
      fse.writeFileSync("doomed.txt", "bye");
      const f = jetpack.file("doomed.txt");
      f.remove();
      assertPath("doomed.txt").shouldNotExist();
    });

    it("does nothing if file does not exist", () => {
      const f = jetpack.file("nonexistent.txt");
      f.remove(); // should not throw
    });

    it("async variant removes the file", async () => {
      fse.writeFileSync("doomed.txt", "bye");
      const f = jetpack.file("doomed.txt");
      await f.removeAsync();
      assertPath("doomed.txt").shouldNotExist();
    });
  });

  describe("ensure()", () => {
    it("creates the file if it doesn't exist", () => {
      const f = jetpack.file("new.txt");
      f.ensure();
      assertPath("new.txt").shouldBeFileWithContent("");
    });

    it("returns this for fluent chaining", () => {
      const f = jetpack.file("new.txt");
      const result = f.ensure();
      assert.strictEqual(result, f);
    });

    it("creates parent directories", () => {
      const f = jetpack.file("a/b/new.txt");
      f.ensure();
      assertPath("a/b/new.txt").shouldBeFileWithContent("");
    });

    it("can set content via criteria", () => {
      const f = jetpack.file("new.txt");
      f.ensure({ content: "hello" });
      assertPath("new.txt").shouldBeFileWithContent("hello");
    });

    it("async variant creates the file", async () => {
      const f = jetpack.file("new.txt");
      const result = await f.ensureAsync();
      assert.strictEqual(result, f);
      assertPath("new.txt").shouldBeFileWithContent("");
    });
  });

  describe("inspect()", () => {
    it("returns inspect result for existing file", () => {
      fse.writeFileSync("hello.txt", "world");
      const f = jetpack.file("hello.txt");
      const result = f.inspect();
      assert.strictEqual(result.name, "hello.txt");
      assert.strictEqual(result.type, "file");
      assert.strictEqual(result.size, 5);
    });

    it("throws ENOENT if file does not exist (strict semantic)", () => {
      const f = jetpack.file("missing.txt");
      assert.throws(
        () => f.inspect(),
        (err: any) => {
          assert.strictEqual(err.code, "ENOENT");
          return true;
        },
      );
    });

    it("async variant returns inspect result", async () => {
      fse.writeFileSync("hello.txt", "world");
      const f = jetpack.file("hello.txt");
      const result = await f.inspectAsync();
      assert.strictEqual(result.name, "hello.txt");
    });

    it("async variant throws ENOENT if missing", async () => {
      const f = jetpack.file("missing.txt");
      await assert.rejects(
        () => f.inspectAsync(),
        (err: any) => {
          assert.strictEqual(err.code, "ENOENT");
          return true;
        },
      );
    });
  });

  describe("createReadStream()", () => {
    it("creates a readable stream", async () => {
      fse.writeFileSync("hello.txt", "stream-data");
      const f = jetpack.file("hello.txt");
      const stream = f.createReadStream();
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      assert.strictEqual(Buffer.concat(chunks).toString(), "stream-data");
    });
  });

  describe("createWriteStream()", () => {
    it("creates a writable stream", async () => {
      const f = jetpack.file("hello.txt");
      // Ensure parent exists
      f.ensure();
      const stream = f.createWriteStream();
      await new Promise<void>((resolve, reject) => {
        stream.write("streamed", (err) => {
          if (err) {
            reject(err);
          } else {
            stream.end(resolve);
          }
        });
      });
      assertPath("hello.txt").shouldBeFileWithContent("streamed");
    });
  });

  describe("lazy semantics", () => {
    it("does not perform any I/O on construction", () => {
      // This should not throw even though the file doesn't exist
      const f = jetpack.file("nonexistent.txt");
      assert.strictEqual(typeof f.path(), "string");
    });
  });
});
