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
} from "./jetpack.js";

/**
 * Factory function to create a new fs-jetpack instance with a custom CWD.
 *
 * @example
 * ```ts
 * import { createJetpack } from "@rcsf/fs-jetpack";
 * const src = createJetpack("/path/to/source");
 * ```
 */
export { default as createJetpack } from "./jetpack.js";

const jetpack = jetpackContext();
export default jetpack;

// Re-export all public API methods bound to the default jetpack instance
// so users can do: import { read, write, copy } from "@rcsf/fs-jetpack";
export const {
  cwd,
  path,
  append,
  appendAsync,
  copy,
  copyAsync,
  createReadStream,
  createWriteStream,
  dir,
  dirAsync,
  exists,
  existsAsync,
  file,
  fileAsync,
  find,
  findAsync,
  inspect,
  inspectAsync,
  inspectTree,
  inspectTreeAsync,
  list,
  listAsync,
  move,
  moveAsync,
  read,
  readAsync,
  remove,
  removeAsync,
  rename,
  renameAsync,
  symlink,
  symlinkAsync,
  tmpDir,
  tmpDirAsync,
  write,
  writeAsync,
} = jetpack;
