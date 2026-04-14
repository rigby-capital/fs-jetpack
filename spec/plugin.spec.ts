import fse from "fs-extra";
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import assertPath from "./assert_path.js";
import helper from "./helper.js";
import jetpack, { createJetpack, type FormatHandler, type JetpackPlugin } from "../source/index.js";

describe("plugin system", () => {
  beforeEach(helper.setCleanTestCwd);
  afterEach(helper.switchBackToCorrectCwd);

  describe("use()", () => {
    it("returns the jetpack instance for chaining", () => {
      const j = createJetpack(process.cwd());
      const plugin: JetpackPlugin = { name: "test" };
      const result = j.use(plugin);
      assert.strictEqual(result, j);
    });

    it("accepts a plugin with no formats", () => {
      const j = createJetpack(process.cwd());
      // Should not throw
      j.use({ name: "empty" });
    });
  });

  describe("format handlers", () => {
    // A simple custom format: lines of "key=value"
    const iniHandler: FormatHandler = {
      encode(data: unknown): string {
        const obj = data as Record<string, string>;
        return Object.entries(obj)
          .map(([k, v]) => `${k}=${v}`)
          .join("\n");
      },
      decode(raw: string | Buffer): unknown {
        const str = typeof raw === "string" ? raw : raw.toString();
        const result: Record<string, string> = {};
        for (const line of str.split("\n")) {
          if (line.includes("=")) {
            const [key, ...rest] = line.split("=");
            result[key] = rest.join("=");
          }
        }
        return result;
      },
    };

    const iniPlugin: JetpackPlugin = {
      name: "ini",
      formats: {
        ini: iniHandler,
      },
    };

    describe("write with format handler", () => {
      it("sync: uses handler.encode() for registered extension", () => {
        const j = createJetpack(process.cwd());
        j.use(iniPlugin);
        j.write("config.ini", { host: "localhost", port: "3000" });
        const content = fse.readFileSync("config.ini", "utf8");
        assert.strictEqual(content, "host=localhost\nport=3000");
      });

      it("async: uses handler.encode() for registered extension", async () => {
        const j = createJetpack(process.cwd());
        j.use(iniPlugin);
        await j.writeAsync("config.ini", { host: "localhost", port: "3000" });
        const content = fse.readFileSync("config.ini", "utf8");
        assert.strictEqual(content, "host=localhost\nport=3000");
      });

      it("does not use handler for string data (passthrough)", () => {
        const j = createJetpack(process.cwd());
        j.use(iniPlugin);
        j.write("config.ini", "raw content");
        assertPath("config.ini").shouldBeFileWithContent("raw content");
      });

      it("does not use handler for Buffer data (passthrough)", () => {
        const j = createJetpack(process.cwd());
        j.use(iniPlugin);
        j.write("config.ini", Buffer.from("raw"));
        assertPath("config.ini").shouldBeFileWithContent("raw");
      });

      it("still uses JSON for unregistered extensions", () => {
        const j = createJetpack(process.cwd());
        j.use(iniPlugin);
        j.write("data.json", { a: 1 });
        const content = JSON.parse(fse.readFileSync("data.json", "utf8"));
        assert.deepStrictEqual(content, { a: 1 });
      });
    });

    describe("read with format handler", () => {
      it("sync: uses handler.decode() when no returnAs specified", () => {
        const j = createJetpack(process.cwd());
        j.use(iniPlugin);
        fse.writeFileSync("config.ini", "host=localhost\nport=3000");
        const result = j.read("config.ini");
        assert.deepStrictEqual(result, { host: "localhost", port: "3000" });
      });

      it("async: uses handler.decode() when no returnAs specified", async () => {
        const j = createJetpack(process.cwd());
        j.use(iniPlugin);
        fse.writeFileSync("config.ini", "host=localhost\nport=3000");
        const result = await j.readAsync("config.ini");
        assert.deepStrictEqual(result, { host: "localhost", port: "3000" });
      });

      it("returns undefined for missing files (does not throw)", () => {
        const j = createJetpack(process.cwd());
        j.use(iniPlugin);
        const result = j.read("missing.ini");
        assert.strictEqual(result, undefined);
      });

      it("bypasses handler when explicit returnAs is provided", () => {
        const j = createJetpack(process.cwd());
        j.use(iniPlugin);
        fse.writeFileSync("config.ini", "host=localhost");
        // Explicit utf8 should return raw string, not decoded
        const result = j.read("config.ini", "utf8");
        assert.strictEqual(result, "host=localhost");
      });

      it("bypasses handler when returnAs is buffer", () => {
        const j = createJetpack(process.cwd());
        j.use(iniPlugin);
        fse.writeFileSync("config.ini", "data");
        const result = j.read("config.ini", "buffer");
        assert.ok(Buffer.isBuffer(result));
      });

      it("reads unregistered extensions normally", () => {
        const j = createJetpack(process.cwd());
        j.use(iniPlugin);
        fse.writeFileSync("data.txt", "hello");
        const result = j.read("data.txt");
        assert.strictEqual(result, "hello");
      });
    });

    describe("format handler inheritance", () => {
      it("child instances inherit format handlers (shared reference)", () => {
        const j = createJetpack(process.cwd());
        j.use(iniPlugin);
        fse.mkdirSync("sub");
        fse.writeFileSync("sub/config.ini", "key=val");
        const child = j.cwd("sub");
        const result = child.read("config.ini");
        assert.deepStrictEqual(result, { key: "val" });
      });

      it("format registered on parent after child creation is visible to child", () => {
        const j = createJetpack(process.cwd());
        const child = j.cwd(".");
        // Register AFTER child was created
        j.use(iniPlugin);
        fse.writeFileSync("config.ini", "k=v");
        const result = child.read("config.ini");
        assert.deepStrictEqual(result, { k: "v" });
      });
    });

    describe("multiple format handlers", () => {
      const csvHandler: FormatHandler = {
        encode(data: unknown): string {
          const rows = data as string[][];
          return rows.map((row) => row.join(",")).join("\n");
        },
        decode(raw: string | Buffer): unknown {
          const str = typeof raw === "string" ? raw : raw.toString();
          return str.split("\n").map((line) => line.split(","));
        },
      };

      it("supports multiple formats registered via one plugin", () => {
        const j = createJetpack(process.cwd());
        j.use({
          name: "multi",
          formats: {
            ini: iniHandler,
            csv: csvHandler,
          },
        });
        fse.writeFileSync("config.ini", "a=1");
        fse.writeFileSync("data.csv", "a,b\n1,2");
        assert.deepStrictEqual(j.read("config.ini"), { a: "1" });
        assert.deepStrictEqual(j.read("data.csv"), [
          ["a", "b"],
          ["1", "2"],
        ]);
      });

      it("supports registering multiple plugins", () => {
        const j = createJetpack(process.cwd());
        j.use(iniPlugin);
        j.use({ name: "csv", formats: { csv: csvHandler } });
        fse.writeFileSync("config.ini", "x=y");
        fse.writeFileSync("data.csv", "a,b");
        assert.deepStrictEqual(j.read("config.ini"), { x: "y" });
        assert.deepStrictEqual(j.read("data.csv"), [["a", "b"]]);
      });
    });
  });
});
