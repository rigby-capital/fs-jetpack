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
import * as validate from './utils/validate.js';
import createJetpackFile from './jetpack_file.js';
import createJetpackDir from './jetpack_dir.js';
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

// ---------------------------------------------------------------------------
// Format handler & plugin types (v7)
// ---------------------------------------------------------------------------

/**
 * A format handler that can encode and decode data for a specific file extension.
 * Registered via the {@link JetpackPlugin} system.
 */
export type FormatHandler = {
  /** Serialize data into a string or Buffer for writing. */
  encode(data: unknown, options?: unknown): string | Buffer;
  /** Deserialize raw file content (always UTF-8 string) into a structured value. */
  decode(raw: string, options?: unknown): unknown;
};

/**
 * A plugin that can be registered via {@link FSJetpack.use}.
 * Currently supports pluggable format handlers keyed by file extension.
 */
export type JetpackPlugin = {
  /** A descriptive name for this plugin (used for debugging/logging). */
  name: string;
  /** Map of file extension (without dot) to format handler. */
  formats?: Record<string, FormatHandler>;
};

// ---------------------------------------------------------------------------
// JetpackFile — lazy file reference (v7)
// ---------------------------------------------------------------------------

/**
 * A lazy reference to a file path. No I/O is performed on construction.
 * Created via `jetpack.file("path")` (without criteria).
 *
 * Unlike the flat API (`jetpack.read(path)`), OOP-style read/inspect methods
 * **throw** `ENOENT` if the file does not exist (strict handle semantic).
 *
 * @example
 * ```ts
 * const f = jetpack.file("config.json");
 * f.ensure();                         // creates if missing
 * const data = f.read("json");        // throws if not found
 * f.write({ key: "value" });
 * ```
 */
export type JetpackFile = {
  /** Returns the absolute path of this file reference. */
  path(): string;

  /** Checks whether the file exists. */
  exists(): ExistsResult;
  /** Async version of {@link JetpackFile.exists}. */
  existsAsync(): Promise<ExistsResult>;

  /**
    * Reads the file content. **Throws** `ENOENT` if the file does not exist.
    *
    * When called without `returnAs`, returns the content as a UTF-8 string
    * unless a format handler is registered for this file's extension, in
    * which case the handler's decoded value (type `unknown`) is returned.
    *
    * @param returnAs - Format to return: `"utf8"`, `"buffer"`, `"json"`, or `"jsonWithDates"`.
    */
  read(): unknown;
  read(returnAs: 'utf8'): string;
  read(returnAs: 'buffer'): Buffer;
  read(returnAs: 'json' | 'jsonWithDates'): unknown;
  /** Async version of {@link JetpackFile.read}. */
  readAsync(): Promise<unknown>;
  readAsync(returnAs: 'utf8'): Promise<string>;
  readAsync(returnAs: 'buffer'): Promise<Buffer>;
  readAsync(returnAs: 'json' | 'jsonWithDates'): Promise<unknown>;

  /**
   * Writes data to this file. Creates parent directories if needed.
   * @param data - Data to write (string, Buffer, object, or array).
   * @param options - Mode, atomic writing, JSON indentation.
   */
  write(data: WritableData, options?: WriteOptions): void;
  /** Async version of {@link JetpackFile.write}. */
  writeAsync(data: WritableData, options?: WriteOptions): Promise<void>;

  /**
   * Appends data to this file. Creates the file and parent directories if needed.
   * @param data - String or Buffer to append.
   * @param options - File mode for creation.
   */
  append(data: AppendData, options?: AppendOptions): void;
  /** Async version of {@link JetpackFile.append}. */
  appendAsync(data: AppendData, options?: AppendOptions): Promise<void>;

  /**
   * Copies this file to a new location.
   * @param to - Destination path.
   * @param options - Overwrite and matching options.
   */
  copy(to: string, options?: CopyOptions): void;
  /** Async version of {@link JetpackFile.copy}. */
  copyAsync(to: string, options?: CopyOptions): Promise<void>;

  /**
   * Moves this file to a new location.
   * @param to - Destination path.
   * @param options - Overwrite behavior.
   */
  move(to: string, options?: MoveOptions): void;
  /** Async version of {@link JetpackFile.move}. */
  moveAsync(to: string, options?: MoveOptions): Promise<void>;

  /**
   * Renames this file (same parent directory).
   * @param newName - New filename (not a full path).
   * @param options - Overwrite behavior.
   */
  rename(newName: string, options?: RenameOptions): void;
  /** Async version of {@link JetpackFile.rename}. */
  renameAsync(newName: string, options?: RenameOptions): Promise<void>;

  /** Deletes this file. Does nothing if it doesn't exist. */
  remove(): void;
  /** Async version of {@link JetpackFile.remove}. */
  removeAsync(): Promise<void>;

  /**
   * Ensures this file exists on disk. Creates parent directories if needed.
   * Returns `this` for fluent chaining.
   * @param criteria - Optional content, mode, and JSON indentation.
   */
  ensure(criteria?: FileCriteria): JetpackFile;
  /** Async version of {@link JetpackFile.ensure}. */
  ensureAsync(criteria?: FileCriteria): Promise<JetpackFile>;

  /**
   * Inspects this file. **Throws** `ENOENT` if the file does not exist.
   * @param options - Which extra fields to include.
   */
  inspect(options?: InspectOptions): InspectResult;
  /** Async version of {@link JetpackFile.inspect}. */
  inspectAsync(options?: InspectOptions): Promise<InspectResult>;

  /**
   * Creates a symbolic link pointing to the given target.
   * @param target - Path that the symlink should point to.
   */
  symlink(target: string): void;
  /** Async version of {@link JetpackFile.symlink}. */
  symlinkAsync(target: string): Promise<void>;

  /** Creates a readable stream for this file. */
  createReadStream(options?: any): fs.ReadStream;
  /** Creates a writable stream for this file. */
  createWriteStream(options?: any): fs.WriteStream;
};

// ---------------------------------------------------------------------------
// JetpackDir — lazy directory reference (v7)
// ---------------------------------------------------------------------------

/**
 * A lazy reference to a directory path. No I/O is performed on construction.
 * Created via `jetpack.dir("path")` (without criteria).
 *
 * Unlike the flat API, OOP-style methods that read directory state
 * **throw** `ENOENT` if the directory does not exist (strict handle semantic).
 *
 * @example
 * ```ts
 * const d = jetpack.dir("build");
 * d.ensure();                        // mkdir -p
 * const files = d.list();            // throws if not found
 * d.file("output.json").write(data);
 * ```
 */
export type JetpackDir = {
  /** Returns the absolute path of this directory reference. */
  path(): string;

  /** Checks whether the directory exists. */
  exists(): ExistsResult;
  /** Async version of {@link JetpackDir.exists}. */
  existsAsync(): Promise<ExistsResult>;

  /**
   * Creates a lazy file reference within this directory. No I/O.
   * @param name - Relative path to the file.
   */
  file(name: string): JetpackFile;

  /**
   * Creates a lazy directory reference within this directory. No I/O.
   * @param name - Relative path to the subdirectory.
   */
  dir(name: string): JetpackDir;

  /**
   * Lists the contents of this directory. **Throws** `ENOENT` if it doesn't exist.
   */
  list(): string[];
  /** Async version of {@link JetpackDir.list}. */
  listAsync(): Promise<string[]>;

  /**
   * Finds files and directories matching glob patterns. **Throws** if this directory doesn't exist.
   * @param options - Search options including `matching` globs.
   */
  find(options?: FindOptions): string[];
  /** Async version of {@link JetpackDir.find}. */
  findAsync(options?: FindOptions): Promise<string[]>;

  /**
   * Copies this directory to a new location.
   * @param to - Destination path.
   * @param options - Overwrite and matching options.
   */
  copy(to: string, options?: CopyOptions): void;
  /** Async version of {@link JetpackDir.copy}. */
  copyAsync(to: string, options?: CopyOptions): Promise<void>;

  /**
   * Moves this directory to a new location.
   * @param to - Destination path.
   * @param options - Overwrite behavior.
   */
  move(to: string, options?: MoveOptions): void;
  /** Async version of {@link JetpackDir.move}. */
  moveAsync(to: string, options?: MoveOptions): Promise<void>;

  /**
   * Renames this directory (same parent directory).
   * @param newName - New directory name (not a full path).
   * @param options - Overwrite behavior.
   */
  rename(newName: string, options?: RenameOptions): void;
  /** Async version of {@link JetpackDir.rename}. */
  renameAsync(newName: string, options?: RenameOptions): Promise<void>;

  /** Deletes this directory and everything inside it. Does nothing if it doesn't exist. */
  remove(): void;
  /** Async version of {@link JetpackDir.remove}. */
  removeAsync(): Promise<void>;

  /**
   * Ensures this directory exists on disk (`mkdir -p`). Returns `this` for fluent chaining.
   * @param criteria - Optional mode and empty settings.
   */
  ensure(criteria?: DirCriteria): JetpackDir;
  /** Async version of {@link JetpackDir.ensure}. */
  ensureAsync(criteria?: DirCriteria): Promise<JetpackDir>;

  /**
   * Inspects this directory. **Throws** `ENOENT` if it doesn't exist.
   * @param options - Which extra fields to include.
   */
  inspect(options?: InspectOptions): InspectResult;
  /** Async version of {@link JetpackDir.inspect}. */
  inspectAsync(options?: InspectOptions): Promise<InspectResult>;

  /**
   * Recursively inspects this directory tree. **Throws** `ENOENT` if it doesn't exist.
   * @param options - Which extra fields to include.
   */
  inspectTree(options?: InspectTreeOptions): InspectTreeResult;
  /** Async version of {@link JetpackDir.inspectTree}. */
  inspectTreeAsync(options?: InspectTreeOptions): Promise<InspectTreeResult>;

  /**
   * Creates a temporary directory inside this directory.
   * Returns a new {@link JetpackDir} scoped to the created directory.
   * @param options - Prefix and base path.
   */
  tmpDir(options?: TmpDirOptions): JetpackDir;
  /** Async version of {@link JetpackDir.tmpDir}. */
  tmpDirAsync(options?: TmpDirOptions): Promise<JetpackDir>;
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
   * @deprecated Use `dir()` instead. Will be removed in v8.
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
   * When called **without** criteria, returns a lazy {@link JetpackDir} reference (no I/O).
   * When called **with** criteria, ensures the directory exists and returns a new
   * {@link FSJetpack} instance scoped to that directory (v6 behavior).
   *
   * @param path - Path to the directory.
   */
  dir(path: string): JetpackDir;
  dir(path: string, criteria: DirCriteria | undefined): FSJetpack;

  /** Async version of {@link FSJetpack.dir} (with criteria). */
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
   * When called **without** criteria, returns a lazy {@link JetpackFile} reference (no I/O).
   * When called **with** criteria, ensures the file exists and returns this
   * {@link FSJetpack} instance (v6 behavior).
   *
   * @param path - Path to the file.
   */
  file(path: string): JetpackFile;
  file(path: string, criteria: FileCriteria | undefined): FSJetpack;

  /** Async version of {@link FSJetpack.file} (with criteria). */
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
    *
    * Without `returnAs`, the result may be a plugin-decoded value (`unknown`).
    * Pass `"utf8"` to always get a string.
    *
    * @param path - Path to the file.
    */
  read(path: string): unknown;

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
  readAsync(path: string): Promise<unknown>;
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

  /**
   * Registers a plugin on this instance. Mutates in place and returns `this`
   * for chaining. Child instances (from `dir()`, `tmpDir()`, `cwd()`) inherit
   * the parent's format handlers by shared reference.
   *
   * @example
   * ```ts
   * import JSON5 from "json5";
   * jetpack.use({
   *   name: "json5",
   *   formats: {
   *     json5: {
   *       encode: (data) => JSON5.stringify(data, undefined, 2),
   *       decode: (raw) => JSON5.parse(raw.toString()),
   *     },
   *   },
   * });
   * ```
   */
  use(plugin: JetpackPlugin): FSJetpack;
};

/**
 * Creates a new fs-jetpack instance with the given CWD.
 * If no path is provided, defaults to `process.cwd()`.
 *
 * @param cwdPath - The initial working directory for the new instance.
 * @returns A fully configured {@link FSJetpack} instance.
 */
const jetpackContext = (cwdPath?: string, formatHandlers?: Map<string, FormatHandler>): FSJetpack => {
  const getCwdPath = (): string => cwdPath || process.cwd();

  // Format handlers are shared by reference across child instances
  const formats = formatHandlers ?? new Map<string, FormatHandler>();

  const cwd = (...args: string[]): string | FSJetpack => {
    // Return current CWD if no arguments specified...
    if (args.length === 0) {
      return getCwdPath();
    }

    // ...create new CWD context otherwise, inheriting format handlers
    const pathParts = [getCwdPath(), ...args];
    return jetpackContext(path.resolve(...pathParts), formats);
  };

  // Resolves path to inner CWD path of this jetpack instance
  const resolvePath = (p: string): string => path.resolve(getCwdPath(), p);

  const getPath = (...parts: string[]): string => path.resolve(getCwdPath(), ...parts);

  /** Returns the file extension without the leading dot, or empty string. */
  const getExtension = (filePath: string): string => {
    const ext = path.extname(filePath);
    return ext.length > 0 ? ext.slice(1) : '';
  };

  /** Looks up a registered format handler for the given file path's extension. */
  const getFormatHandler = (filePath: string): FormatHandler | undefined => {
    const ext = getExtension(filePath);
    return ext ? formats.get(ext) : undefined;
  };

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

    dir(p: string, criteria?: DirCriteria): any {
      if (arguments.length < 2) {
        // Lazy JetpackDir reference — no I/O (v7)
        return createJetpackDir(resolvePath(p), formats);
      }

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

    file(p: string, criteria?: FileCriteria): any {
      if (arguments.length < 2) {
        // Lazy JetpackFile reference — no I/O (v7)
        return createJetpackFile(resolvePath(p), formats);
      }

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
      const resolvedPath = resolvePath(p);

      // If no explicit returnAs and a format handler is registered, use it
      if (returnAs === undefined) {
        const handler = getFormatHandler(resolvedPath);
        if (handler) {
          const raw = read.sync(resolvedPath, 'utf8') as string | undefined;
          if (raw === undefined) {
            return undefined;
          }

          return handler.decode(raw);
        }
      }

      return read.sync(resolvedPath, returnAs as any);
    },
    async readAsync(p: string, returnAs?: string): Promise<any> {
      read.validateInput('readAsync', p, returnAs);
      const resolvedPath = resolvePath(p);

      // If no explicit returnAs and a format handler is registered, use it
      if (returnAs === undefined) {
        const handler = getFormatHandler(resolvedPath);
        if (handler) {
          const raw = await read.async(resolvedPath, 'utf8') as string | undefined;
          if (raw === undefined) {
            return undefined;
          }

          return handler.decode(raw);
        }
      }

      return read.async(resolvedPath, returnAs as any);
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
      const resolvedPath = resolvePath(p);

      // If data is an object/array and a format handler is registered, use it
      const handler = getFormatHandler(resolvedPath);
      if (handler && typeof data === 'object' && data !== null && !Buffer.isBuffer(data)) {
        const encoded = handler.encode(data, options);
        write.sync(resolvedPath, encoded as any, options);
        return;
      }

      write.sync(resolvedPath, data, options);
    },
    async writeAsync(
      p: string,
      data: WritableData,
      options?: WriteOptions,
    ): Promise<void> {
      write.validateInput('writeAsync', p, data, options);
      const resolvedPath = resolvePath(p);

      // If data is an object/array and a format handler is registered, use it
      const handler = getFormatHandler(resolvedPath);
      if (handler && typeof data === 'object' && data !== null && !Buffer.isBuffer(data)) {
        const encoded = handler.encode(data, options);
        await write.async(resolvedPath, encoded as any, options);
        return;
      }

      await write.async(resolvedPath, data, options);
    },

    use(plugin: JetpackPlugin): FSJetpack {
      validate.argument('use', 'plugin', plugin, ['object']);
      validate.argument('use', 'plugin.name', plugin.name, ['string']);
      if (plugin.formats !== undefined) {
        validate.argument('use', 'plugin.formats', plugin.formats, ['object']);
        for (const [ext, handler] of Object.entries(plugin.formats)) {
          validate.argument('use', `plugin.formats.${ext}`, handler, ['object']);
          validate.argument('use', `plugin.formats.${ext}.encode`, handler.encode, ['function']);
          validate.argument('use', `plugin.formats.${ext}.decode`, handler.decode, ['function']);
          formats.set(ext, handler);
        }
      }

      return api;
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
