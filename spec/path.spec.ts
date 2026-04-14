import * as pathUtil from "node:path";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import jetpack from "../source/index.js";

describe("path", () => {
  it("if no parameters passed returns same path as cwd()", () => {
    assert.strictEqual(jetpack.path(), jetpack.cwd());
    assert.strictEqual(jetpack.path(""), jetpack.cwd());
    assert.strictEqual(jetpack.path("."), jetpack.cwd());
  });

  it("is absolute if prepending slash present", () => {
    assert.strictEqual(jetpack.path("/blah"), pathUtil.resolve("/blah"));
  });

  it("resolves to CWD path of this jetpack instance", () => {
    const a = pathUtil.join(jetpack.cwd(), "a");
    // Create jetpack instance with other CWD
    const jetpackSubdir = jetpack.cwd("subdir");
    const b = pathUtil.join(jetpack.cwd(), "subdir", "b");
    assert.strictEqual(jetpack.path("a"), a);
    assert.strictEqual(jetpackSubdir.path("b"), b);
  });

  it("can take unlimited number of arguments as path parts", () => {
    const abc = pathUtil.join(jetpack.cwd(), "a", "b", "c");
    assert.strictEqual(jetpack.path("a", "b", "c"), abc);
  });
});
