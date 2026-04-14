import fse from "fs-extra";
import * as os from "node:os";
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import assertPath from "./assert_path.js";
import helper from "./helper.js";
import jetpack, { type FSJetpack } from "../source/index.js";

describe("tmpDir", () => {
  beforeEach(helper.setCleanTestCwd);
  afterEach(helper.switchBackToCorrectCwd);

  describe("creates temporary directory", () => {
    const expectations = (jetpackContext: FSJetpack) => {
      assertPath(jetpackContext.path()).shouldBeDirectory();
      assert.strictEqual(jetpackContext.path().startsWith(os.tmpdir()), true);
      assert.match(jetpackContext.path(), /(\/|\\)[0-9a-f]+$/);
    };

    it("sync", () => {
      expectations(jetpack.tmpDir());
    });

    it("async", async () => {
      const jetpackContext = await jetpack.tmpDirAsync();
      expectations(jetpackContext);
    });
  });

  describe("directory name can be prefixed", () => {
    const expectations = (jetpackContext: FSJetpack) => {
      assertPath(jetpackContext.path()).shouldBeDirectory();
      assert.strictEqual(jetpackContext.path().startsWith(os.tmpdir()), true);
      assert.match(jetpackContext.path(), /(\/|\\)abc_[0-9a-f]+$/);
    };

    it("sync", () => {
      expectations(jetpack.tmpDir({ prefix: "abc_" }));
    });

    it("async", async () => {
      const jetpackContext = await jetpack.tmpDirAsync({ prefix: "abc_" });
      expectations(jetpackContext);
    });
  });

  describe("directory can be created in any base directory", () => {
    const expectations = (jetpackContext: FSJetpack) => {
      assertPath(jetpackContext.path()).shouldBeDirectory();
      assert.strictEqual(jetpackContext.path().startsWith(jetpack.cwd()), true);
    };

    it("sync", () => {
      expectations(jetpack.tmpDir({ basePath: "." }));
    });

    it("async", async () => {
      const jetpackContext = await jetpack.tmpDirAsync({ basePath: "." });
      expectations(jetpackContext);
    });
  });

  describe("if base directory doesn't exist it will be created", () => {
    const expectations = (jetpackContext: FSJetpack) => {
      assertPath(jetpackContext.path()).shouldBeDirectory();
      assert.strictEqual(
        jetpackContext.path().startsWith(jetpack.path("abc")),
        true,
      );
    };

    it("sync", () => {
      expectations(jetpack.tmpDir({ basePath: "abc" }));
    });

    it("async", async () => {
      const jetpackContext = await jetpack.tmpDirAsync({ basePath: "abc" });
      expectations(jetpackContext);
    });
  });

  describe("input validation", () => {
    const tests = [
      { type: "sync", method: jetpack.tmpDir as any, methodName: "tmpDir" },
      {
        type: "async",
        method: jetpack.tmpDirAsync as any,
        methodName: "tmpDirAsync",
      },
    ];

    describe('"options" object', () => {
      describe('"prefix" argument', () => {
        tests.forEach((test) => {
          it(test.type, async () => {
            if (test.type === "async") {
              await assert.rejects(() => test.method({ prefix: 1 }), {
                message: `Argument "options.prefix" passed to ${test.methodName}([options]) must be a string. Received number`,
              });
            } else {
              assert.throws(
                () => {
                  test.method({ prefix: 1 });
                },
                {
                  message: `Argument "options.prefix" passed to ${test.methodName}([options]) must be a string. Received number`,
                },
              );
            }
          });
        });
      });
      describe('"basePath" argument', () => {
        tests.forEach((test) => {
          it(test.type, async () => {
            if (test.type === "async") {
              await assert.rejects(() => test.method({ basePath: 1 }), {
                message: `Argument "options.basePath" passed to ${test.methodName}([options]) must be a string. Received number`,
              });
            } else {
              assert.throws(
                () => {
                  test.method({ basePath: 1 });
                },
                {
                  message: `Argument "options.basePath" passed to ${test.methodName}([options]) must be a string. Received number`,
                },
              );
            }
          });
        });
      });
    });
  });
});
