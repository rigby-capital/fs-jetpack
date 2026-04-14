import { describe, it } from "node:test";
import assert from "node:assert/strict";
import jetpack from "../source/index.js";

// Test for https://github.com/szwacz/fs-jetpack/issues/29
describe("console.log", () => {
  it("can be printed by console.log", () => {
    assert.doesNotThrow(() => {
      console.log(jetpack);
    });
  });
});
