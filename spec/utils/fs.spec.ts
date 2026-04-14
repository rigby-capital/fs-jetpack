import fs from "node:fs";
import fsp from "node:fs/promises";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("node:fs usage", () => {
  it("node:fs module is available", () => {
    assert.strictEqual(typeof fs.readFileSync, "function");
    assert.strictEqual(typeof fs.writeFileSync, "function");
  });

  it("node:fs/promises module is available", () => {
    assert.strictEqual(typeof fsp.readFile, "function");
    assert.strictEqual(typeof fsp.writeFile, "function");
  });
});
