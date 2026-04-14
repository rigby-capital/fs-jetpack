import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as matcher from "../../src/utils/matcher.js";

describe("matcher", () => {
  it("can test against one pattern passed as a string", () => {
    const test = matcher.create("/", "a");
    assert.strictEqual(test("/a"), true);
    assert.strictEqual(test("/b"), false);
  });

  it("can test against many patterns passed as an array", () => {
    const test = matcher.create("/", ["a", "b"]);
    assert.strictEqual(test("/a"), true);
    assert.strictEqual(test("/b"), true);
    assert.strictEqual(test("/c"), false);
  });

  describe("pattern types", () => {
    it("only basename", () => {
      const test = matcher.create("/", "a");
      assert.strictEqual(test("/a"), true);
      assert.strictEqual(test("/b/a"), true);
      assert.strictEqual(test("/a/b"), false);
    });

    it("absolute", () => {
      let test = matcher.create("/", ["/b"]);
      assert.strictEqual(test("/b"), true);
      assert.strictEqual(test("/a/b"), false);
      test = matcher.create("/a", ["/b"]);
      assert.strictEqual(test("/a/b"), false);
    });

    it("relative with ./", () => {
      const test = matcher.create("/a", ["./b"]);
      assert.strictEqual(test("/a/b"), true);
      assert.strictEqual(test("/b"), false);
    });

    it("relative (because has slash inside)", () => {
      const test = matcher.create("/a", ["b/c"]);
      assert.strictEqual(test("/a/b/c"), true);
      assert.strictEqual(test("/b/c"), false);
    });
  });

  describe("possible tokens", () => {
    it("*", () => {
      let test = matcher.create("/", ["*"]);
      assert.strictEqual(test("/a"), true);
      assert.strictEqual(test("/a/b.txt"), true);

      test = matcher.create("/", ["a*b"]);
      assert.strictEqual(test("/ab"), true);
      assert.strictEqual(test("/a_b"), true);
      assert.strictEqual(test("/a__b"), true);
    });

    it("**", () => {
      let test = matcher.create("/", ["**"]);
      assert.strictEqual(test("/a"), true);
      assert.strictEqual(test("/a/b"), true);

      test = matcher.create("/", ["a/**/d"]);
      assert.strictEqual(test("/a/d"), true);
      assert.strictEqual(test("/a/b/d"), true);
      assert.strictEqual(test("/a/b/c/d"), true);
      assert.strictEqual(test("/a"), false);
      assert.strictEqual(test("/d"), false);
    });

    it("**/something", () => {
      const test = matcher.create("/", ["**/a"]);
      assert.strictEqual(test("/a"), true);
      assert.strictEqual(test("/x/a"), true);
      assert.strictEqual(test("/x/y/a"), true);
      assert.strictEqual(test("/a/b"), false);
    });

    it("@(pattern|pattern) - exactly one of patterns", () => {
      const test = matcher.create("/", ["@(foo|bar)"]);
      assert.strictEqual(test("/foo"), true);
      assert.strictEqual(test("/bar"), true);
      assert.strictEqual(test("/foobar"), false);
    });

    it("+(pattern|pattern) - one or more of patterns", () => {
      const test = matcher.create("/", ["+(foo|bar)"]);
      assert.strictEqual(test("/foo"), true);
      assert.strictEqual(test("/bar"), true);
      assert.strictEqual(test("/foobar"), true);
      assert.strictEqual(test("/foobarbaz"), false);
    });

    it("?(pattern|pattern) - zero or one of patterns", () => {
      const test = matcher.create("/", ["?(foo|bar)1"]);
      assert.strictEqual(test("/1"), true);
      assert.strictEqual(test("/foo1"), true);
      assert.strictEqual(test("/bar1"), true);
      assert.strictEqual(test("/foobar1"), false);
    });

    it("*(pattern|pattern) - zero or more of patterns", () => {
      const test = matcher.create("/", ["*(foo|bar)1"]);
      assert.strictEqual(test("/1"), true);
      assert.strictEqual(test("/foo1"), true);
      assert.strictEqual(test("/bar1"), true);
      assert.strictEqual(test("/foobar1"), true);
      assert.strictEqual(test("/barfoo1"), true);
      assert.strictEqual(test("/foofoo1"), true);
    });

    it("{a,b}", () => {
      const test = matcher.create("/", ["*.{jpg,png}"]);
      assert.strictEqual(test("a.jpg"), true);
      assert.strictEqual(test("b.png"), true);
      assert.strictEqual(test("c.txt"), false);
    });

    it("?", () => {
      const test = matcher.create("/", ["a?c"]);
      assert.strictEqual(test("/abc"), true);
      assert.strictEqual(test("/ac"), false);
      assert.strictEqual(test("/abbc"), false);
    });

    it("[...] - characters range", () => {
      const test = matcher.create("/", ["[0-9][0-9]"]);
      assert.strictEqual(test("/78"), true);
      assert.strictEqual(test("/a78"), false);
    });

    it("combining different tokens together", () => {
      const test = matcher.create("/", ["+(f?o|bar*)"]);
      assert.strictEqual(test("/f0o"), true);
      assert.strictEqual(test("/f_o"), true);
      assert.strictEqual(test("/bar"), true);
      assert.strictEqual(test("/bar_"), true);
      assert.strictEqual(test("/f_obar123"), true);
      assert.strictEqual(test("/f__obar123"), false);
    });

    it("comment character # has no special meaning", () => {
      const test = matcher.create("/", ["#a"]);
      assert.strictEqual(test("/#a"), true);
    });
  });

  describe("negation", () => {
    it("selects everything except negated", () => {
      const test = matcher.create("/", "!abc");
      assert.strictEqual(test("/abc"), false);
      assert.strictEqual(test("/xyz"), true);
    });

    it("selects everything except negated (multiple patterns)", () => {
      const test = matcher.create("/", ["!abc", "!xyz"]);
      assert.strictEqual(test("/abc"), false);
      assert.strictEqual(test("/xyz"), false);
      assert.strictEqual(test("/whatever"), true);
    });

    it("filters previous match if negation is farther in order", () => {
      const test = matcher.create("/", ["abc", "123", "!/xyz/**", "!789/**"]);
      assert.strictEqual(test("/abc"), true);
      assert.strictEqual(test("/456/123"), true);
      assert.strictEqual(test("/xyz/abc"), false);
      assert.strictEqual(test("/789/123"), false);
      assert.strictEqual(test("/whatever"), false);
    });
  });

  describe("dotfiles", () => {
    it("has no problem with matching dotfile", () => {
      const test = matcher.create("/", ".foo");
      assert.strictEqual(test("/.foo"), true);
      assert.strictEqual(test("/foo"), false);
    });

    it("dotfile negation", () => {
      let test = matcher.create("/", ["abc", "!.foo/**"]);
      assert.strictEqual(test("/.foo/abc"), false);
      test = matcher.create("/", ["abc", "!.foo/**"]);
      assert.strictEqual(test("/foo/abc"), true);
    });
  });
});
