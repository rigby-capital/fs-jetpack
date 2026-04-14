# Contributing to @rcsf/fs-jetpack

## Prerequisites

- Node.js >= 22
- npm

## Setup

```sh
git clone https://github.com/rigby-capital/fs-jetpack.git
cd fs-jetpack
npm install
```

## Development workflow

```sh
npm run build       # Compile TypeScript to distribution/
npm test            # Run all tests (node:test)
npm run coverage    # Run tests with coverage
npm run lint        # Lint with XO
npm run lint:fix    # Auto-fix lint issues
```

## Project structure

```
source/         TypeScript source (ESM)
spec/           Tests (node:test + node:assert/strict)
distribution/   Compiled output (git-ignored)
benchmark/      Performance benchmarks
```

## Writing tests

Tests use the Node.js built-in test runner with `node:assert/strict`:

```ts
import { describe, test } from "node:test";
import assert from "node:assert/strict";

describe("feature", () => {
  test("does something", () => {
    assert.equal(actual, expected);
  });
});
```

## Coding style

- XO handles all linting and formatting
- 2-space indentation, double quotes (XO defaults)
- Add JSDoc to all exported functions and types
- Keep async methods as `methodAsync()` counterparts to sync `method()`

## Commit messages

Use concise, descriptive commit messages. Focus on the "why" rather than the "what".

## Pull requests

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes
4. Ensure `npm run build`, `npm run lint`, and `npm test` all pass
5. Submit a pull request
