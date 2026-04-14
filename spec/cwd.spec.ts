import * as pathUtil from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import jetpack from "../source/index.js";

describe("cwd", () => {
  it("returns the same path as process.cwd for main instance of jetpack", () => {
    assert.strictEqual(jetpack.cwd(), process.cwd());
  });

  it("can create new context with different cwd", () => {
    let jetCwd = jetpack.cwd("/"); // absolute path
    assert.strictEqual(jetCwd.cwd(), pathUtil.resolve(process.cwd(), "/"));

    jetCwd = jetpack.cwd("../.."); // relative path
    assert.strictEqual(jetCwd.cwd(), pathUtil.resolve(process.cwd(), "../.."));

    assert.strictEqual(jetpack.cwd(), process.cwd()); // cwd of main lib should be intact
  });

  it("cwd contexts can be created recursively", () => {
    const jetCwd1 = jetpack.cwd("..");
    assert.strictEqual(jetCwd1.cwd(), pathUtil.resolve(process.cwd(), ".."));

    const jetCwd2 = jetCwd1.cwd("..");
    assert.strictEqual(jetCwd2.cwd(), pathUtil.resolve(process.cwd(), "../.."));
  });

  it("cwd can join path parts", () => {
    const jetCwd = jetpack.cwd("a", "b", "c");
    assert.strictEqual(
      jetCwd.cwd(),
      pathUtil.resolve(process.cwd(), "a", "b", "c"),
    );
  });
});
