# 6.0.0 (unreleased)

This is the first release of `@rcsf/fs-jetpack`, a maintained successor of [`fs-jetpack`](https://github.com/szwacz/fs-jetpack) by Jakub Szwacz.

- **(breaking change)** Package renamed to `@rcsf/fs-jetpack`
- **(breaking change)** ESM-only — no more CommonJS support
- **(breaking change)** Requires Node.js >= 22
- **(breaking change)** Source rewritten in TypeScript — types are generated from source, no more separate `types.d.ts`
- Replaced custom `promisify` and `fs` adapter with native `node:fs/promises`
- Replaced `.then()/.catch()` chains with `async/await` throughout
- Replaced Mocha + Chai with the Node.js built-in test runner (`node:test` + `node:assert`)
- Adopted XO for linting and formatting
- Updated `minimatch` dependency

## Previous releases

For the changelog of the original `fs-jetpack` package (up to v5.1.0), see the [upstream repository](https://github.com/szwacz/fs-jetpack/blob/master/CHANGELOG.md).
