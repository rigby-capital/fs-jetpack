# 7.0.0

## Breaking changes

- **`file("path")` without criteria** now returns a lazy `JetpackFile` reference (no I/O). Previously it created the file on disk and returned an `FSJetpack` instance.
  - To get the v6 behavior, pass an empty criteria object: `jetpack.file("path", {})` or use `jetpack.file("path").ensure()`.
- **`dir("path")` without criteria** now returns a lazy `JetpackDir` reference (no I/O). Previously it created the directory on disk and returned a scoped `FSJetpack` instance.
  - To get the v6 behavior, pass an empty criteria object: `jetpack.dir("path", {})` or use `jetpack.dir("path").ensure()`.
- **`cwd()` is deprecated** (JSDoc `@deprecated` tag only, no runtime warning). Use `dir()` instead. Will be removed in v8.

## New features

- **`JetpackFile`** — lazy file handle with strict ENOENT semantics. Created via `jetpack.file("path")`. Methods: `path()`, `exists()`, `read()`, `write()`, `append()`, `copy()`, `move()`, `rename()`, `remove()`, `ensure()`, `inspect()`, `symlink()`, `createReadStream()`, `createWriteStream()`.
- **`JetpackDir`** — lazy directory handle with strict ENOENT semantics. Created via `jetpack.dir("path")`. Methods: `path()`, `exists()`, `file()`, `dir()`, `list()`, `find()`, `copy()`, `move()`, `rename()`, `remove()`, `ensure()`, `inspect()`, `inspectTree()`, `tmpDir()`.
- **`.use()` plugin system** — register format handlers for custom file extensions (e.g. TOML, YAML, JSON5). Handlers provide `encode()` and `decode()` methods. Registered handlers are inherited by child instances via shared reference.
- **`@rcsf/fs-jetpack/sync`** — subpath export with sync-only named methods (no `Async` suffix).
- **`@rcsf/fs-jetpack/async`** — subpath export with async-only named methods (no `Async` suffix).
- New exported types: `FormatHandler`, `JetpackPlugin`, `JetpackFile`, `JetpackDir`.

# 6.0.0

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
