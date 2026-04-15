/** @type {import('xo').FlatXoConfig} */
const xoConfig = [
  {
    ignores: ["benchmark/**", "distribution/**"],
  },
  {
    space: 2,
    prettier: "compat",
    rules: {
      // --- TypeScript strictness relaxations ---
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-type-assertion": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-restricted-types": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/use-unknown-in-catch-callback-variable": "off",
      "@typescript-eslint/promise-function-async": "off",

      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/only-throw-error": "off",
      "@typescript-eslint/no-confusing-void-expression": "off",
      "@typescript-eslint/prefer-promise-reject-errors": "off",
      "@typescript-eslint/consistent-type-imports": "off",
      "@typescript-eslint/unified-signatures": "off",
      "@typescript-eslint/switch-exhaustiveness-check": "off",
      "@typescript-eslint/naming-convention": "off",
      "@typescript-eslint/member-ordering": "off",

      // --- Node.js ---
      "n/prefer-global/buffer": "off",
      "n/prefer-global/process": "off",


      // --- Unicorn ---
      "unicorn/prevent-abbreviations": "off",
      "unicorn/no-array-for-each": "off",
      "unicorn/catch-error-name": "off",

      "unicorn/filename-case": "off",
      "unicorn/no-array-callback-reference": "off",
      "unicorn/no-array-sort": "off",
      "unicorn/no-negated-condition": "off",
      "unicorn/no-anonymous-default-export": "off",
      "unicorn/prefer-string-slice": "off",
      "unicorn/prefer-string-replace-all": "off",
      "unicorn/prefer-string-raw": "off",
      "unicorn/prefer-default-parameters": "off",
      "unicorn/prefer-regexp-test": "off",
      "unicorn/prefer-optional-catch-binding": "off",
      "unicorn/prefer-node-protocol": "off",
      "unicorn/better-regex": "off",

      // --- Style ---
      "max-nested-callbacks": "off",
      "capitalized-comments": "off",

      "no-negated-condition": "off",
      "no-eq-null": "off",
      "no-await-in-loop": "off",
      eqeqeq: ["error", "always", { null: "ignore" }],
      "arrow-body-style": "off",
      "object-shorthand": "off",
      "require-unicode-regexp": "off",
      "prefer-const": "warn",

      // --- Import ---
      "import-x/no-anonymous-default-export": "off",
      "import-x/extensions": "off",
      "import-x/order": "off",

      // --- Stylistic ---
      "@stylistic/padding-line-between-statements": "off",
      "@stylistic/curly-newline": "off",
      "@stylistic/indent-binary-ops": "off",
    },
  },
  {
    // Allow deprecated cwd() usage in tests and in re-export entry points
    files: ["spec/**", "source/index.ts", "source/sync.ts", "source/async.ts"],
    rules: {
      "@typescript-eslint/no-deprecated": "off",
    },
  },
];

export default xoConfig;
