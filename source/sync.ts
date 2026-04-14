/**
 * Synchronous-only API for `@rcsf/fs-jetpack`.
 *
 * @example
 * ```ts
 * import { read, write, copy } from "@rcsf/fs-jetpack/sync";
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
  cwd,
  path,
  append,
  copy,
  createReadStream,
  createWriteStream,
  dir,
  exists,
  file,
  find,
  inspect,
  inspectTree,
  list,
  move,
  read,
  remove,
  rename,
  symlink,
  tmpDir,
  write,
  use,
} = jetpack;
