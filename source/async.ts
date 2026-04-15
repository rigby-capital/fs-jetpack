/**
 * Async-only API for `@rcsf/fs-jetpack`.
 *
 * The **named exports** are async-only (no `Async` suffix) — every
 * I/O function returns a promise.  A handful of inherently synchronous
 * utilities (`path`, `createReadStream`, `createWriteStream`, `use`)
 * are also re-exported for convenience so that a single import
 * specifier is sufficient.
 *
 * The default export is a full `FSJetpack` instance.
 *
 * @example
 * ```ts
 * import { read, write, copy } from "@rcsf/fs-jetpack/async";
 * const data = await read("config.json", "json");
 * ```
 *
 * @module
 */
import jetpackContext from "./jetpack.js";

export type {
  FSJetpack,
  ExistsResult,
  AppendData,
  AppendOptions,
  Checksum,
  InspectOptions,
  InspectTreeOptions,
  InspectTreeResult,
  WritableData,
  RenameOptions,
  InspectResult,
  FindOptions,
  WriteOptions,
  MoveOptions,
  CopyOptions,
  DirCriteria,
  FileCriteria,
  TmpDirOptions,
  FormatHandler,
  JetpackPlugin,
  JetpackFile,
  JetpackDir,
} from "./jetpack.js";

export {default as createJetpack} from "./jetpack.js";

const jetpack = jetpackContext();
export default jetpack;

// Re-export async methods with suffix-less names.
// Consumers import { read, write, ... } from "@rcsf/fs-jetpack/async"
// and every function returns a promise.
export const {
  path,
  createReadStream,
  createWriteStream,
  use,
} = jetpack;
export const append = jetpack.appendAsync;
export const copy = jetpack.copyAsync;
export const dir = jetpack.dirAsync;
export const exists = jetpack.existsAsync;
export const file = jetpack.fileAsync;
export const find = jetpack.findAsync;
export const inspect = jetpack.inspectAsync;
export const inspectTree = jetpack.inspectTreeAsync;
export const list = jetpack.listAsync;
export const move = jetpack.moveAsync;
export const read = jetpack.readAsync;
export const remove = jetpack.removeAsync;
export const rename = jetpack.renameAsync;
export const symlink = jetpack.symlinkAsync;
export const tmpDir = jetpack.tmpDirAsync;
export const write = jetpack.writeAsync;
