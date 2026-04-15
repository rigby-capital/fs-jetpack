# RFC: v7.0.0 — OOP API Revision

## Summary

Major API evolution for `@rcsf/fs-jetpack` v7.0.0, inspired by
[szwacz/fs-jetpack#116](https://github.com/szwacz/fs-jetpack/issues/116)
and community feedback. Adds an object-oriented layer (`JetpackFile`,
`JetpackDir`) on top of the existing flat API — without removing the flat API.

## Design Decisions

| # | Decision | Resolution |
|---|----------|------------|
| 1 | Flat shorthand methods | **Keep.** `jetpack.read(path)` works alongside `jetpack.file(path).read()` |
| 2 | Sync/async pattern | **Keep `method()` / `methodAsync()` on default import.** Add `@rcsf/fs-jetpack/sync` and `@rcsf/fs-jetpack/async` subpath exports |
| 3 | `file("x").read()` on non-existent file | **Throws** `ENOENT`. Strict file-handle semantic |
| 4 | `JetpackDir.list()` / `.inspect()` on non-existent dir | **Throws** `ENOENT` (same strict semantic) |
| 5 | Pluggable formats | **`.use()` plugin pattern**, mutable (modifies instance in place) |
| 6 | `cwd()` deprecation | **JSDoc `@deprecated` tag only**, no runtime warning. Remove in v8 |
| 7 | `file("x").ensure()` return type | **Returns `JetpackFile`** for fluent chaining |
| 8 | Format handler inheritance | **Shared reference** — child dir/file objects inherit the parent's format handlers |

---

## 1. New Entry Points

### Subpath exports

```jsonc
{
  "exports": {
    ".":       { "types": "./distribution/index.d.ts",  "import": "./distribution/index.js" },
    "./sync":  { "types": "./distribution/sync.d.ts",   "import": "./distribution/sync.js" },
    "./async": { "types": "./distribution/async.d.ts",   "import": "./distribution/async.js" }
  }
}
```

**`@rcsf/fs-jetpack`** (default) — Full API, backward-compatible with v6:
```ts
import jetpack from "@rcsf/fs-jetpack";
import { read, write, createJetpack } from "@rcsf/fs-jetpack";
```

**`@rcsf/fs-jetpack/sync`** — Sync-only named functions, no `Async` suffix:
```ts
import { read, write, copy } from "@rcsf/fs-jetpack/sync";
const content = read("/path/to/file.json", "json");
```

**`@rcsf/fs-jetpack/async`** — Async-only named functions, no `Async` suffix:
```ts
import { read, write, copy } from "@rcsf/fs-jetpack/async";
const content = await read("/path/to/file.json", "json");
```

---

## 2. `JetpackFile` — Lazy File Reference

Created via `jetpack.file("path")` (without criteria). No I/O on construction.

```ts
type JetpackFile = {
  path(): string;

  exists(): ExistsResult;
  existsAsync(): Promise<ExistsResult>;

  // Throws ENOENT if file doesn't exist (strict handle semantic)
  read(): string;
  read(returnAs: "utf8"): string;
  read(returnAs: "buffer"): Buffer;
  read(returnAs: "json" | "jsonWithDates"): unknown;
  readAsync(): Promise<string>;
  readAsync(returnAs: "utf8"): Promise<string>;
  readAsync(returnAs: "buffer"): Promise<Buffer>;
  readAsync(returnAs: "json" | "jsonWithDates"): Promise<unknown>;

  write(data: WritableData, options?: WriteOptions): void;
  writeAsync(data: WritableData, options?: WriteOptions): Promise<void>;

  append(data: AppendData, options?: AppendOptions): void;
  appendAsync(data: AppendData, options?: AppendOptions): Promise<void>;

  copy(to: string, options?: CopyOptions): void;
  copyAsync(to: string, options?: CopyOptions): Promise<void>;

  move(to: string, options?: MoveOptions): void;
  moveAsync(to: string, options?: MoveOptions): Promise<void>;

  rename(newName: string, options?: RenameOptions): void;
  renameAsync(newName: string, options?: RenameOptions): Promise<void>;

  remove(): void;
  removeAsync(): Promise<void>;

  // Truncates to zero bytes. Creates if doesn't exist.
  empty(): void;
  emptyAsync(): Promise<void>;

  // Creates the file on disk (mkdir -p parents). Returns self for chaining.
  ensure(criteria?: FileCriteria): JetpackFile;
  ensureAsync(criteria?: FileCriteria): Promise<JetpackFile>;

  // Throws ENOENT if file doesn't exist
  inspect(options?: InspectOptions): InspectResult;
  inspectAsync(options?: InspectOptions): Promise<InspectResult>;

  symlink(target: string): void;
  symlinkAsync(target: string): Promise<void>;

  createReadStream(options?: ReadStreamOptions): fs.ReadStream;
  createWriteStream(options?: WriteStreamOptions): fs.WriteStream;
};
```

### Key behavior vs v6 flat API

| Operation | `jetpack.read("missing")` (flat) | `jetpack.file("missing").read()` (OOP) |
|-----------|----------------------------------|----------------------------------------|
| Non-existent file | Returns `undefined` | **Throws** `ENOENT` |

---

## 3. `JetpackDir` — Lazy Directory Reference

Created via `jetpack.dir("path")` (without criteria). No I/O on construction.

```ts
type JetpackDir = {
  path(): string;

  exists(): ExistsResult;
  existsAsync(): Promise<ExistsResult>;

  // Lazy references (no I/O)
  file(name: string): JetpackFile;
  dir(name: string): JetpackDir;

  // Throws ENOENT if directory doesn't exist (strict)
  list(): string[];
  listAsync(): Promise<string[]>;

  find(options?: FindOptions): string[];
  findAsync(options?: FindOptions): Promise<string[]>;

  copy(to: string, options?: CopyOptions): void;
  copyAsync(to: string, options?: CopyOptions): Promise<void>;

  move(to: string, options?: MoveOptions): void;
  moveAsync(to: string, options?: MoveOptions): Promise<void>;

  rename(newName: string, options?: RenameOptions): void;
  renameAsync(newName: string, options?: RenameOptions): Promise<void>;

  remove(): void;
  removeAsync(): Promise<void>;

  // Removes contents but keeps the directory
  empty(): void;
  emptyAsync(): Promise<void>;

  // mkdir -p. Returns self for chaining.
  ensure(criteria?: { mode?: string | number }): JetpackDir;
  ensureAsync(criteria?: { mode?: string | number }): Promise<JetpackDir>;

  // Throws ENOENT if doesn't exist
  inspect(options?: InspectOptions): InspectResult;
  inspectAsync(options?: InspectOptions): Promise<InspectResult>;

  inspectTree(options?: InspectTreeOptions): InspectTreeResult;
  inspectTreeAsync(options?: InspectTreeOptions): Promise<InspectTreeResult>;

  tmpDir(options?: TmpDirOptions): JetpackDir;
  tmpDirAsync(options?: TmpDirOptions): Promise<JetpackDir>;
};
```

---

## 4. Overloaded `file()` / `dir()` on `FSJetpack`

```ts
type FSJetpack = {
  // v7: no criteria → lazy reference (no I/O)
  file(path: string): JetpackFile;
  dir(path: string): JetpackDir;

  // v6 behavior (kept): with criteria → ensure + return FSJetpack
  file(path: string, criteria: FileCriteria): FSJetpack;
  fileAsync(path: string, criteria: FileCriteria): Promise<FSJetpack>;
  dir(path: string, criteria: DirCriteria): FSJetpack;
  dirAsync(path: string, criteria: DirCriteria): Promise<FSJetpack>;

  // All other methods unchanged...
};
```

**Overload resolution at runtime:**
- `jetpack.file("x")` → no 2nd argument → return `JetpackFile`
- `jetpack.file("x", { content: "..." })` → criteria present → v6 ensure → return `FSJetpack`
- `jetpack.dir("x")` → no 2nd argument → return `JetpackDir`
- `jetpack.dir("x", { empty: true })` → criteria present → v6 ensure → return `FSJetpack`

---

## 5. `.use()` Plugin System

```ts
type FormatHandler = {
  encode(data: unknown, options?: unknown): string | Buffer;
  decode(raw: string, options?: unknown): unknown;
};

type JetpackPlugin = {
  name: string;
  formats?: Record<string, FormatHandler>;  // file extension → handler
};

type FSJetpack = {
  use(plugin: JetpackPlugin): FSJetpack;  // mutable, returns self
  // ...
};
```

### Usage

```ts
import jetpack from "@rcsf/fs-jetpack";
import JSON5 from "json5";

jetpack.use({
  name: "json5",
  formats: {
    json5: {
      encode: (data) => JSON5.stringify(data, undefined, 2),
      decode: (raw) => JSON5.parse(raw.toString()),
    },
  },
});

// Auto-detected by extension:
jetpack.write("config.json5", { key: "value" });
const cfg = jetpack.read("config.json5", "parsed");

// Also works on file objects:
const f = jetpack.file("settings.toml");
f.write({ database: { host: "localhost" } });
```

### Internal behavior

- `use()` stores handlers in a closure-scoped `Map<string, FormatHandler>`
- Built-in `json` and `jsonWithDates` become pre-registered handlers (not hardcoded)
- `read("path", "parsed")` looks up the extension in the handler map
- `write("path", object)` checks extension → if handler found, uses `handler.encode()`
- Child instances (from `dir()`, `tmpDir()`, `cwd()`) inherit the parent's format map by **shared reference**

---

## 6. `cwd()` Deprecation

```ts
type FSJetpack = {
  /** @deprecated Use `dir()` instead. Will be removed in v8. */
  cwd: {
    (): string;
    (...pathParts: string[]): FSJetpack;
  };
};
```

No runtime warning. JSDoc tag only. Functionality unchanged.

---

## 7. Breaking Changes

| Change | v6 | v7 |
|--------|----|----|
| `file("x")` without criteria | Creates file on disk, returns `FSJetpack` | **Lazy** `JetpackFile`, no I/O |
| `dir("x")` without criteria | Creates dir on disk, returns `FSJetpack` | **Lazy** `JetpackDir`, no I/O |
| `file("x", criteria)` | Creates/ensures file, returns `FSJetpack` | **Same** (kept) |
| `dir("x", criteria)` | Creates/ensures dir, returns scoped `FSJetpack` | **Same** (kept) |
| `cwd()` | Active | **Deprecated** (JSDoc only) |

### Migration

```ts
// v6: creates the file
jetpack.file("log.txt");
// v7: lazy reference, use ensure() to create
jetpack.file("log.txt").ensure();

// v6: creates dir, returns scoped instance
const sub = jetpack.dir("sub");
sub.read("foo.txt");
// v7 option A: explicit ensure
const sub = jetpack.dir("sub").ensure();
// v7 option B: use flat API (unchanged)
jetpack.read("sub/foo.txt");
// v7 option C: OOP style
jetpack.dir("sub").file("foo.txt").read();
```

---

## 8. Effort Estimate

| Work item | Estimate |
|-----------|----------|
| Type definitions (`JetpackFile`, `JetpackDir`, `JetpackPlugin`) | 1 day |
| Implement `JetpackFile` wrapper | 2 days |
| Implement `JetpackDir` wrapper | 2 days |
| Overload `file()` / `dir()` on `FSJetpack` | 1 day |
| `/sync` and `/async` subpath exports | 1 day |
| `.use()` plugin system + format handler plumbing | 2 days |
| Migrate existing tests + new tests | 3–4 days |
| Deprecate `cwd()`, update types | 0.5 day |
| README, migration guide, CHANGELOG, JSDoc | 1–2 days |
| **Total** | **~14–16 days** |

---

## References

- Original proposal: [szwacz/fs-jetpack#116](https://github.com/szwacz/fs-jetpack/issues/116)
- Pluggable formats idea: [@eaton's comment](https://github.com/szwacz/fs-jetpack/issues/116#issuecomment-1793573892)
- `find()` zero-argument bug: [szwacz/fs-jetpack#122](https://github.com/szwacz/fs-jetpack/issues/122) (fixed in v6)
