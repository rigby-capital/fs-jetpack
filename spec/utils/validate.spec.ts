import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as validate from "../../source/utils/validate.js";

describe("util validate", () => {
  describe("validates arguments passed to methods", () => {
    it("validates its own input", () => {
      assert.throws(
        () => {
          validate.argument("foo(thing)", "thing", 123, ["foo"]);
        },
        { message: 'Unknown type "foo"' },
      );
    });

    [
      {
        type: "string",
        article: "a",
        goodValue: "abc",
        wrongValue: 123,
        wrongValueType: "number",
      },
      {
        type: "number",
        article: "a",
        goodValue: 123,
        wrongValue: "abc",
        wrongValueType: "string",
      },
      {
        type: "boolean",
        article: "a",
        goodValue: true,
        wrongValue: "abc",
        wrongValueType: "string",
      },
      {
        type: "array",
        article: "an",
        goodValue: [],
        wrongValue: {},
        wrongValueType: "object",
      },
      {
        type: "object",
        article: "an",
        goodValue: {},
        wrongValue: [],
        wrongValueType: "array of ",
      },
      {
        type: "buffer",
        article: "a",
        goodValue: Buffer.alloc(1),
        wrongValue: 123,
        wrongValueType: "number",
      },
      {
        type: "null",
        article: "a",
        goodValue: null,
        wrongValue: 123,
        wrongValueType: "number",
      },
      {
        type: "undefined",
        article: "an",
        goodValue: undefined,
        wrongValue: 123,
        wrongValueType: "number",
      },
      {
        type: "function",
        article: "a",
        goodValue: function () {},
        wrongValue: 123,
        wrongValueType: "number",
      },
    ].forEach((test) => {
      it(`validates that given thing is a(n) ${test.type}`, () => {
        assert.doesNotThrow(() => {
          validate.argument("foo(thing)", "thing", test.goodValue, [test.type]);
        });

        assert.throws(
          () => {
            validate.argument("foo(thing)", "thing", test.wrongValue, [
              test.type,
            ]);
          },
          {
            message: `Argument "thing" passed to foo(thing) must be ${test.article} ${test.type}. Received ${test.wrongValueType}`,
          },
        );
      });
    });

    [
      { type: "string", value: "abc", expect: "number", received: "string" },
      { type: "number", value: 123, expect: "string", received: "number" },
      { type: "boolean", value: true, expect: "number", received: "boolean" },
      { type: "array", value: [], expect: "number", received: "array of " },
      { type: "object", value: {}, expect: "number", received: "object" },
      {
        type: "buffer",
        value: Buffer.alloc(1),
        expect: "number",
        received: "buffer",
      },
      { type: "null", value: null, expect: "number", received: "null" },
      {
        type: "undefined",
        value: undefined,
        expect: "number",
        received: "undefined",
      },
      {
        type: "function",
        value: function () {},
        expect: "number",
        received: "function",
      },
    ].forEach((test) => {
      it(`can detect wrong type: ${test.type}`, () => {
        assert.throws(
          () => {
            validate.argument("foo(thing)", "thing", test.value, [test.expect]);
          },
          {
            message: `Argument "thing" passed to foo(thing) must be a ${test.expect}. Received ${test.received}`,
          },
        );
      });
    });

    it("supports more than one allowed type", () => {
      assert.throws(
        () => {
          validate.argument("foo(thing)", "thing", {}, [
            "string",
            "number",
            "boolean",
          ]);
        },
        {
          message:
            'Argument "thing" passed to foo(thing) must be a string or a number or a boolean. Received object',
        },
      );
    });

    it("validates array internal data", () => {
      assert.doesNotThrow(() => {
        validate.argument(
          "foo(thing)",
          "thing",
          [1, 2, 3],
          ["array of number"],
        );
      });

      assert.throws(
        () => {
          validate.argument(
            "foo(thing)",
            "thing",
            [1, 2, "a"],
            ["array of number"],
          );
        },
        {
          message:
            'Argument "thing" passed to foo(thing) must be an array of number. Received array of number, string',
        },
      );
    });
  });

  describe("validates options object", () => {
    it("options object might be undefined", () => {
      assert.doesNotThrow(() => {
        validate.options("foo(options)", "options", undefined, {
          foo: ["string"],
        });
      });
    });

    it("option key in options object is optional (doh!)", () => {
      assert.doesNotThrow(() => {
        validate.options("foo(options)", "options", {}, { foo: ["string"] });
      });
    });

    it("throws if option key definition not found", () => {
      assert.throws(
        () => {
          validate.options(
            "foo(options)",
            "options",
            { bar: 123 },
            { foo: ["string"] },
          );
        },
        { message: 'Unknown argument "options.bar" passed to foo(options)' },
      );
    });

    it("validates option", () => {
      assert.doesNotThrow(() => {
        validate.options(
          "foo(options)",
          "options",
          { foo: "abc" },
          { foo: ["string"] },
        );
      });

      assert.throws(
        () => {
          validate.options(
            "foo(options)",
            "options",
            { foo: 123 },
            { foo: ["string"] },
          );
        },
        {
          message:
            'Argument "options.foo" passed to foo(options) must be a string. Received number',
        },
      );
    });
  });
});
