import {inspect as utilInspect} from 'node:util';
import path from 'node:path';
import type fs from 'node:fs';
import * as append from './append.js';
import * as dir from './dir.js';
import * as file from './file.js';
import * as find from './find.js';
import * as inspectMod from './inspect.js';
import * as inspectTree from './inspect_tree.js';
import * as copy from './copy.js';
import * as exists from './exists.js';
import * as list from './list.js';
import * as move from './move.js';
import * as read from './read.js';
import * as remove from './remove.js';
import * as rename from './rename.js';
import * as streams from './streams.js';
import * as tmpDir from './tmp_dir.js';
import * as write from './write.js';
import * as symlink from './symlink.js';
import type {InspectResult} from './inspect.js';
import type {FindOptions} from './find.js';
import type {WriteOptions} from './write.js';
import type {MoveOptions} from './move.js';
import type {CopyOptions} from './copy.js';
import type {DirCriteria} from './dir.js';
import type {FileCriteria} from './file.js';
import type {TmpDirOptions} from './tmp_dir.js';

/**
 * Return value of {@link FSJetpack.exists}. Returns `false` if the path does
 * not exist, or a string indicating the type of filesystem entry.
 */
export type ExistsResult = false | 'dir' | 'file' | 'other';

/** Data that can be appended to a file -- a UTF-8 string or a Buffer. */
export type AppendData = string | Buffer;

/** Options for {@link FSJetpack.append}. */
export type AppendOptions = {
  /**
   * If the file does not exist yet it will be created with this mode.
   * Value can be a number (e.g. `0o700`) or an octal string (e.g. `"700"`).
   */
  mode?: string | number;
};

/** Supported checksum algorithms for {@link FSJetpack.inspect} and {@link FSJetpack.inspectTree}. */
export type Checksum = 'md5' | 'sha1' | 'sha256' | 'sha512';

/** Options for {@link FSJetpack.inspect}. */
export type InspectOptions = {
  /** If specified, computes a checksum of the file using this algorithm. Ignored for directories. */
  checksum?: Checksum;
  /** If `true`, includes the unix file mode in the result. */
  mode?: boolean;
  /** If `true`, includes `accessTime`, `modifyTime`, `changeTime`, and `birthTime` in the result. */
  times?: boolean;
  /** If `true`, includes the absolute path in the result. */
  absolutePath?: boolean;
  /**
   * How to handle symlinks.
   * - `"report"` (default) -- reports the symlink itself.
   * - `"follow"` -- follows the symlink and inspects the target.
   */
  symlinks?: 'report' | 'follow';
};

/** Options for {@link FSJetpack.inspectTree}. */
export type InspectTreeOptions = {
  /** If specified, computes checksums for every node in the tree. Directory checksums are derived from their children. */
  checksum?: Checksum;
  /** If `true`, each node includes a `relativePath` anchored to the inspected root. */
  relativePath?: boolean;
  /** If `true`, includes `accessTime`, `modifyTime`, `changeTime`, and `birthTime` on every node. */
  times?: boolean;
  /**
   * How to handle symlinks.
   * - `"report"` (default) -- reports the symlink itself.
   * - `"follow"` -- follows the symlink and inspects the target.
   */
  symlinks?: 'report' | 'follow';
};

/**
 * A single node in the tree returned by {@link FSJetpack.inspectTree}.
 * Extends {@link InspectResult} with optional children and relative path.
 */
export type InspectTreeResult = {
  /** Relative path from the root of the inspected tree. Present only when `relativePath` option is `true`. */
  relativePath?: string;
  /** Child nodes. Present only for directories. */
  children?: InspectTreeResult[];
} & InspectResult;

/**
 * Data that can be written to a file. Objects and arrays are serialized as JSON.
 */
export type WritableData =
  | string
  | Record<string, unknown>
  | unknown[]
  | Buffer;

/** Options for {@link FSJetpack.rename}. */
export type RenameOptions = {
  /** If `true`, overwrites the destination if it already exists. Defaults to `false`. */
  overwrite?: boolean;
};

/**
 * The fs-jetpack API object. Every instance carries its own internal
 * Current Working Directory (CWD) and resolves all paths relative to it.
 *
 * @example
 * ```ts
 * import jetpack from "@rcsf/fs-jetpack";
 *
 * // Default instance uses process.cwd()
 * jetpack.write("hello.txt", "world");
 *
 * // Create a scoped instance with a different CWD
 * const src = jetpack.cwd("path/to/source");
 * const files = src.find({ matching: "*.ts" });
 * ```
 */
export type FSJetpack = {
  /**
   * Returns the internal CWD path when called with no arguments.
   * When called with path parts, creates a new jetpack instance
   * whose CWD is resolved from the current one.
   *
   * @example
   * ```ts
   * jetpack.cwd();                    // "/current/working/dir"
   * const sub = jetpack.cwd("src");   // new instance at "/current/working/dir/src"
   * ```
   */
  cwd: {
    (): string;
    (...pathParts: string[]): FSJetpack;
  };

  /**
   * Resolves given path parts against this instance's CWD and returns the absolute path.
   * @param pathParts - Path segments to resolve.
   */
  path(...pathParts: string[]): string;

  /**
   * Appends data to a file. Creates the file and any missing parent directories if needed.
   * @param path - Path to the file.
   * @param data - String or Buffer to append.
   * @param options - Optional settings (e.g. file mode).
   */
  append(path: string, data: AppendData, options?: AppendOptions): void;

  /** Async version of {@link FSJetpack.append}. */
  appendAsync(
    path: string,
    data: AppendData,
    options?: AppendOptions,
  ): Promise<void>;

  /**
   * Copies a file or directory (recursively). Creates missing parent directories at the destination.
   * @param from - Source path.
   * @param to - Destination path.
   * @param options - Overwrite behavior, glob matching, case sensitivity.
   */
  copy(from: string, to: string, options?: CopyOptions): void;

  /** Async version of {@link FSJetpack.copy}. */
  copyAsync(from: string, to: string, options?: CopyOptions): Promise<void>;

  /**
   * Creates a readable stream. Alias for `fs.createReadStream` resolved against this instance's CWD.
   * @param path - Path to the file.
   * @param options - Options passed to `fs.createReadStream`.
   */
  createReadStream(path: string, options?: any): fs.ReadStream;

  /**
   * Creates a writable stream. Alias for `fs.createWriteStream` resolved against this instance's CWD.
   * @param path - Path to the file.
   * @param options - Options passed to `fs.createWriteStream`.
   */
  createWriteStream(path: string, options?: any): fs.WriteStream;

  /**
   * Ensures a directory exists and meets the given criteria.
   * Creates any missing parent directories. Returns a new jetpack instance scoped to that directory.
   * @param path - Path to the directory.
   * @param criteria - Optional criteria (empty, mode).
   */
  dir(path: string, criteria?: DirCriteria): FSJetpack;

  /** Async version of {@link FSJetpack.dir}. */
  dirAsync(path: string, criteria?: DirCriteria): Promise<FSJetpack>;

  /**
   * Checks whether something exists at the given path.
   * Returns `false`, `"file"`, `"dir"`, or `"other"` instead of a simple boolean.
   * @param path - Path to check.
   */
  exists(path: string): ExistsResult;

  /** Async version of {@link FSJetpack.exists}. */
  existsAsync(path: string): Promise<ExistsResult>;

  /**
   * Ensures a file exists and meets the given criteria.
   * Creates the file and any missing parent directories if needed.
   * @param path - Path to the file.
   * @param criteria - Optional criteria (content, mode, jsonIndent).
   */
  file(path: string, criteria?: FileCriteria): FSJetpack;

  /** Async version of {@link FSJetpack.file}. */
  fileAsync(path: string, criteria?: FileCriteria): Promise<FSJetpack>;

  /**
   * Finds files (and optionally directories) matching glob patterns.
   * Returned paths are relative to this instance's CWD.
   * @param options - Search options including `matching` globs.
   */
  find(options?: FindOptions): string[];

  /**
   * Finds files starting from a specific path.
   * @param startPath - Directory to start searching in.
   * @param options - Search options including `matching` globs.
   */
  find(startPath: string, options?: FindOptions): string[];

  /** Async version of {@link FSJetpack.find}. */
  findAsync(options?: FindOptions): Promise<string[]>;

  /** Async version of {@link FSJetpack.find} with a start path. */
  findAsync(startPath: string, options?: FindOptions): Promise<string[]>;

  /**
   * Inspects a file or directory (replacement for `fs.stat`).
   * Returns `undefined` if the path does not exist.
   * @param path - Path to inspect.
   * @param options - Which extra fields to include (checksum, mode, times, etc.).
   */
  inspect(path: string, options?: InspectOptions): InspectResult | undefined;

  /** Async version of {@link FSJetpack.inspect}. */
  inspectAsync(
    path: string,
    options?: InspectOptions,
  ): Promise<InspectResult | undefined>;

  /**
   * Recursively inspects a directory tree, returning a nested structure of inspect results.
   * Returns `undefined` if the path does not exist.
   * @param path - Root path to inspect.
   * @param options - Which extra fields to include (checksum, times, relativePath, etc.).
   */
  inspectTree(
    path: string,
    options?: InspectTreeOptions,
  ): InspectTreeResult | undefined;

  /** Async version of {@link FSJetpack.inspectTree}. */
  inspectTreeAsync(
    path: string,
    options?: InspectTreeOptions,
  ): Promise<InspectTreeResult | undefined>;

  /**
   * Lists the contents of a directory (like `fs.readdir`).
   * Returns `undefined` if the path does not exist.
   * @param path - Path to list. Defaults to this instance's CWD.
   */
  list(path?: string): string[] | undefined;

  /** Async version of {@link FSJetpack.list}. */
  listAsync(path?: string): Promise<string[] | undefined>;

  /**
   * Moves a file or directory to a new location. Creates missing parent directories at the destination.
   * @param from - Source path.
   * @param to - Destination path.
   * @param options - Overwrite behavior.
   */
  move(from: string, to: string, options?: MoveOptions): void;

  /** Async version of {@link FSJetpack.move}. */
  moveAsync(from: string, to: string, options?: MoveOptions): Promise<void>;

  /**
   * Reads the contents of a file. Returns `undefined` if the file does not exist.
   * @param path - Path to the file.
   */
  read(path: string): string | undefined;

  /**
   * Reads a file as a UTF-8 string.
   * @param path - Path to the file.
   * @param returnAs - `"utf8"` to return a string.
   */
  read(path: string, returnAs: 'utf8'): string | undefined;

  /**
   * Reads a file as a Buffer.
   * @param path - Path to the file.
   * @param returnAs - `"buffer"` to return a Buffer.
   */
  read(path: string, returnAs: 'buffer'): Buffer | undefined;

  /**
   * Reads a file as parsed JSON.
   * @param path - Path to the file.
   * @param returnAs - `"json"` or `"jsonWithDates"` (the latter auto-parses ISO date strings into Date objects).
   */
  read(path: string, returnAs: 'json' | 'jsonWithDates'): any | undefined;

  /** Async version of {@link FSJetpack.read}. */
  readAsync(path: string): Promise<string | undefined>;
  /** Async version of {@link FSJetpack.read} returning a UTF-8 string. */
  readAsync(path: string, returnAs: 'utf8'): Promise<string | undefined>;
  /** Async version of {@link FSJetpack.read} returning a Buffer. */
  readAsync(path: string, returnAs: 'buffer'): Promise<Buffer | undefined>;
  /** Async version of {@link FSJetpack.read} returning parsed JSON. */
  readAsync(
    path: string,
    returnAs: 'json' | 'jsonWithDates',
  ): Promise<any | undefined>;

  /**
   * Deletes a file or directory (including non-empty directories).
   * Does nothing if the path does not exist.
   * @param path - Path to remove. Defaults to this instance's CWD.
   */
  remove(path?: string): void;

  /** Async version of {@link FSJetpack.remove}. */
  removeAsync(path?: string): Promise<void>;

  /**
   * Renames a file or directory in place (same parent directory).
   * @param path - Path to the item to rename.
   * @param newName - New filename (not a full path).
   * @param options - Overwrite behavior.
   */
  rename(path: string, newName: string, options?: RenameOptions): void;

  /** Async version of {@link FSJetpack.rename}. */
  renameAsync(
    path: string,
    newName: string,
    options?: RenameOptions,
  ): Promise<void>;

  /**
   * Creates a symbolic link.
   * @param symlinkValue - The target the symlink should point to.
   * @param path - Where the symlink should be created.
   */
  symlink(symlinkValue: string, path: string): void;

  /** Async version of {@link FSJetpack.symlink}. */
  symlinkAsync(symlinkValue: string, path: string): Promise<void>;

  /**
   * Creates a temporary directory with a random, unique name.
   * Returns a new jetpack instance scoped to the created directory.
   * @param options - Prefix and base path for the temporary directory.
   */
  tmpDir(options?: TmpDirOptions): FSJetpack;

  /** Async version of {@link FSJetpack.tmpDir}. */
  tmpDirAsync(options?: TmpDirOptions): Promise<FSJetpack>;

  /**
   * Writes data to a file. Creates any missing parent directories.
   * Objects and arrays are automatically serialized as JSON.
   * @param path - Path to the file.
   * @param data - Data to write (string, Buffer, object, or array).
   * @param options - Mode, atomic writing, JSON indentation.
   */
  write(path: string, data: WritableData, options?: WriteOptions): void;

  /** Async version of {@link FSJetpack.write}. */
  writeAsync(
    path: string,
    data: WritableData,
    options?: WriteOptions,
  ): Promise<void>;
};

/**
 * Creates a new fs-jetpack instance with the given CWD.
 * If no path is provided, defaults to `process.cwd()`.
 *
 * @param cwdPath - The initial working directory for the new instance.
 * @returns A fully configured {@link FSJetpack} instance.
 */
const jetpackContext = (cwdPath?: string): FSJetpack => {
  const getCwdPath = (): string => cwdPath || process.cwd();

  const cwd = (...args: string[]): string | FSJetpack => {
    // Return current CWD if no arguments specified...
    if (args.length === 0) {
      return getCwdPath();
    }

    // ...create new CWD context otherwise
    const pathParts = [getCwdPath(), ...args];
    return jetpackContext(path.resolve(...pathParts));
  };

  // Resolves path to inner CWD path of this jetpack instance
  const resolvePath = (p: string): string => path.resolve(getCwdPath(), p);

  const getPath = (...parts: string[]): string => path.resolve(getCwdPath(), ...parts);

  const normalizeOptions = (options?: any): any => {
    const options_ = options || {};
    options_.cwd = getCwdPath();
    return options_;
  };

  // API
  const api: FSJetpack = {
    cwd: cwd as FSJetpack['cwd'],
    path: getPath,

    append(p: string, data: AppendData, options?: AppendOptions): void {
      append.validateInput('append', p, data, options);
      append.sync(resolvePath(p), data, options);
    },
    async appendAsync(
      p: string,
      data: AppendData,
      options?: AppendOptions,
    ): Promise<void> {
      append.validateInput('appendAsync', p, data, options);
      await append.async(resolvePath(p), data, options);
    },

    copy(from: string, to: string, options?: CopyOptions): void {
      copy.validateInput('copy', from, to, options);
      copy.sync(resolvePath(from), resolvePath(to), options);
    },
    async copyAsync(
      from: string,
      to: string,
      options?: CopyOptions,
    ): Promise<void> {
      copy.validateInput('copyAsync', from, to, options);
      await copy.async(resolvePath(from), resolvePath(to), options);
    },

    createWriteStream(p: string, options?: any) {
      return streams.createWriteStream(resolvePath(p), options);
    },
    createReadStream(p: string, options?: any) {
      return streams.createReadStream(resolvePath(p), options);
    },

    dir(p: string, criteria?: DirCriteria): FSJetpack {
      dir.validateInput('dir', p, criteria);
      const normalizedPath = resolvePath(p);
      dir.sync(normalizedPath, criteria);
      return cwd(normalizedPath) as FSJetpack;
    },
    async dirAsync(p: string, criteria?: DirCriteria): Promise<FSJetpack> {
      dir.validateInput('dirAsync', p, criteria);
      const normalizedPath = resolvePath(p);
      await dir.async(normalizedPath, criteria);
      return cwd(normalizedPath) as FSJetpack;
    },

    exists(p: string): ExistsResult {
      exists.validateInput('exists', p);
      return exists.sync(resolvePath(p));
    },
    async existsAsync(p: string): Promise<ExistsResult> {
      exists.validateInput('existsAsync', p);
      return exists.async(resolvePath(p));
    },

    file(p: string, criteria?: FileCriteria): FSJetpack {
      file.validateInput('file', p, criteria);
      file.sync(resolvePath(p), criteria);
      return api;
    },
    async fileAsync(p: string, criteria?: FileCriteria): Promise<FSJetpack> {
      file.validateInput('fileAsync', p, criteria);
      await file.async(resolvePath(p), criteria);
      return api;
    },

    find(startPath?: string | FindOptions, options?: FindOptions): string[] {
      // StartPath is optional parameter, if not specified move rest of params
      // to proper places and default startPath to CWD.
      let resolvedPath: string;
      if (typeof startPath === 'object' || (startPath === undefined && options === undefined)) {
        options = startPath;
        resolvedPath = '.';
      } else {
        resolvedPath = startPath!;
      }

      find.validateInput('find', resolvedPath, options);
      return find.sync(
        resolvePath(resolvedPath),
        normalizeOptions(options),
      );
    },
    async findAsync(
      startPath?: string | FindOptions,
      options?: FindOptions,
    ): Promise<string[]> {
      // StartPath is optional parameter, if not specified move rest of params
      // to proper places and default startPath to CWD.
      let resolvedPath: string;
      if (typeof startPath === 'object' || (startPath === undefined && options === undefined)) {
        options = startPath;
        resolvedPath = '.';
      } else {
        resolvedPath = startPath!;
      }

      find.validateInput('findAsync', resolvedPath, options);
      return find.async(
        resolvePath(resolvedPath),
        normalizeOptions(options),
      );
    },

    inspect(
      p: string,
      fieldsToInclude?: InspectOptions,
    ): InspectResult | undefined {
      inspectMod.validateInput('inspect', p, fieldsToInclude);
      return inspectMod.sync(resolvePath(p), fieldsToInclude);
    },
    async inspectAsync(
      p: string,
      fieldsToInclude?: InspectOptions,
    ): Promise<InspectResult | undefined> {
      inspectMod.validateInput('inspectAsync', p, fieldsToInclude);
      return inspectMod.async(resolvePath(p), fieldsToInclude);
    },

    inspectTree(
      p: string,
      options?: InspectTreeOptions,
    ): InspectTreeResult | undefined {
      inspectTree.validateInput('inspectTree', p, options);
      return inspectTree.sync(resolvePath(p), options);
    },
    async inspectTreeAsync(
      p: string,
      options?: InspectTreeOptions,
    ): Promise<InspectTreeResult | undefined> {
      inspectTree.validateInput('inspectTreeAsync', p, options);
      return inspectTree.async(resolvePath(p), options);
    },

    list(p?: string): string[] | undefined {
      list.validateInput('list', p);
      return list.sync(resolvePath(p || '.'));
    },
    async listAsync(p?: string): Promise<string[] | undefined> {
      list.validateInput('listAsync', p);
      return list.async(resolvePath(p || '.'));
    },

    move(from: string, to: string, options?: MoveOptions): void {
      move.validateInput('move', from, to, options);
      move.sync(resolvePath(from), resolvePath(to), options);
    },
    async moveAsync(
      from: string,
      to: string,
      options?: MoveOptions,
    ): Promise<void> {
      move.validateInput('moveAsync', from, to, options);
      await move.async(resolvePath(from), resolvePath(to), options);
    },

    read(p: string, returnAs?: string): any {
      read.validateInput('read', p, returnAs);
      return read.sync(resolvePath(p), returnAs as any);
    },
    async readAsync(p: string, returnAs?: string): Promise<any> {
      read.validateInput('readAsync', p, returnAs);
      return read.async(resolvePath(p), returnAs as any);
    },

    remove(p?: string): void {
      remove.validateInput('remove', p);
      // If path not specified defaults to CWD
      remove.sync(resolvePath(p || '.'));
    },
    async removeAsync(p?: string): Promise<void> {
      remove.validateInput('removeAsync', p);
      // If path not specified defaults to CWD
      await remove.async(resolvePath(p || '.'));
    },

    rename(p: string, newName: string, options?: RenameOptions): void {
      rename.validateInput('rename', p, newName, options);
      rename.sync(resolvePath(p), newName, options);
    },
    async renameAsync(
      p: string,
      newName: string,
      options?: RenameOptions,
    ): Promise<void> {
      rename.validateInput('renameAsync', p, newName, options);
      await rename.async(resolvePath(p), newName, options);
    },

    symlink(symlinkValue: string, p: string): void {
      symlink.validateInput('symlink', symlinkValue, p);
      symlink.sync(symlinkValue, resolvePath(p));
    },
    async symlinkAsync(symlinkValue: string, p: string): Promise<void> {
      symlink.validateInput('symlinkAsync', symlinkValue, p);
      await symlink.async(symlinkValue, resolvePath(p));
    },

    tmpDir(options?: TmpDirOptions): FSJetpack {
      tmpDir.validateInput('tmpDir', options);
      const pathOfCreatedDirectory = tmpDir.sync(getCwdPath(), options);
      return cwd(pathOfCreatedDirectory) as FSJetpack;
    },
    async tmpDirAsync(options?: TmpDirOptions): Promise<FSJetpack> {
      tmpDir.validateInput('tmpDirAsync', options);
      const pathOfCreatedDirectory = await tmpDir.async(getCwdPath(), options);
      return cwd(pathOfCreatedDirectory) as FSJetpack;
    },

    write(p: string, data: WritableData, options?: WriteOptions): void {
      write.validateInput('write', p, data, options);
      write.sync(resolvePath(p), data, options);
    },
    async writeAsync(
      p: string,
      data: WritableData,
      options?: WriteOptions,
    ): Promise<void> {
      write.validateInput('writeAsync', p, data, options);
      await write.async(resolvePath(p), data, options);
    },
  };

  if (utilInspect.custom !== undefined) {
    // Without this console.log(jetpack) throws obscure error. Details:
    // https://github.com/szwacz/fs-jetpack/issues/29
    // https://nodejs.org/api/util.html#util_custom_inspection_functions_on_objects
    (api as any)[utilInspect.custom] = () => `[fs-jetpack CWD: ${getCwdPath()}]`;
  }

  return api;
};

export default jetpackContext;

export {type InspectResult} from './inspect.js';
export {type FindOptions} from './find.js';
export {type MoveOptions} from './move.js';
export {type WriteOptions} from './write.js';

export {type CopyOptions} from './copy.js';
export {type FileCriteria} from './file.js';
export {type DirCriteria} from './dir.js';
export {type TmpDirOptions} from './tmp_dir.js';
