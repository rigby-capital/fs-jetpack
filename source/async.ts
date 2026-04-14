/**
 * Async-only API for `@rcsf/fs-jetpack`.
 *
 * @example
 * ```ts
 * import { readAsync, writeAsync, copyAsync } from "@rcsf/fs-jetpack/async";
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

export const {
  path,
  appendAsync,
  copyAsync,
  createReadStream,
  createWriteStream,
  dirAsync,
  existsAsync,
  fileAsync,
  findAsync,
  inspectAsync,
  inspectTreeAsync,
  listAsync,
  moveAsync,
  readAsync,
  removeAsync,
  renameAsync,
  symlinkAsync,
  tmpDirAsync,
  writeAsync,
  use,
} = jetpack;
