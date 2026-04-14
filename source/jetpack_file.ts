import type fs from "node:fs";
import * as append from "./append.js";
import * as copy from "./copy.js";
import * as exists from "./exists.js";
import * as fileMod from "./file.js";
import * as inspectMod from "./inspect.js";
import * as move from "./move.js";
import * as read from "./read.js";
import * as remove from "./remove.js";
import * as rename from "./rename.js";
import * as streams from "./streams.js";
import * as symlink from "./symlink.js";
import * as write from "./write.js";
import type {
  AppendData,
  AppendOptions,
  ExistsResult,
  InspectOptions,
  JetpackFile,
  RenameOptions,
  WritableData,
} from "./jetpack.js";
import type {InspectResult} from "./inspect.js";
import type {WriteOptions} from "./write.js";
import type {CopyOptions} from "./copy.js";
import type {MoveOptions} from "./move.js";
import type {FileCriteria} from "./file.js";

/**
 * Creates a lazy {@link JetpackFile} handle for the given absolute path.
 * No I/O is performed until a method is called.
 *
 * Unlike the flat API (`jetpack.read(path)`) which returns `undefined`
 * for missing files, the OOP handle's `read()` and `inspect()` methods
 * **throw** an ENOENT error if the file does not exist (strict semantic).
 */
const createJetpackFile = (absolutePath: string): JetpackFile => {
  const self: JetpackFile = {
    path(): string {
      return absolutePath;
    },

    // ----- exists -----

    exists(): ExistsResult {
      return exists.sync(absolutePath);
    },
    async existsAsync(): Promise<ExistsResult> {
      return exists.async(absolutePath);
    },

    // ----- read (strict: throws ENOENT) -----

    read(returnAs?: string): any {
      const result = read.sync(absolutePath, returnAs as any);
      if (result === undefined) {
        throwEnoent(absolutePath);
      }

      return result;
    },
    async readAsync(returnAs?: string): Promise<any> {
      const result = await read.async(absolutePath, returnAs as any);
      if (result === undefined) {
        throwEnoent(absolutePath);
      }

      return result;
    },

    // ----- write -----

    write(data: WritableData, options?: WriteOptions): void {
      write.sync(absolutePath, data, options);
    },
    async writeAsync(
      data: WritableData,
      options?: WriteOptions,
    ): Promise<void> {
      await write.async(absolutePath, data, options);
    },

    // ----- append -----

    append(data: AppendData, options?: AppendOptions): void {
      append.sync(absolutePath, data, options);
    },
    async appendAsync(
      data: AppendData,
      options?: AppendOptions,
    ): Promise<void> {
      await append.async(absolutePath, data, options);
    },

    // ----- copy -----

    copy(to: string, options?: CopyOptions): void {
      copy.sync(absolutePath, to, options);
    },
    async copyAsync(to: string, options?: CopyOptions): Promise<void> {
      await copy.async(absolutePath, to, options);
    },

    // ----- move -----

    move(to: string, options?: MoveOptions): void {
      move.sync(absolutePath, to, options);
    },
    async moveAsync(to: string, options?: MoveOptions): Promise<void> {
      await move.async(absolutePath, to, options);
    },

    // ----- rename -----

    rename(newName: string, options?: RenameOptions): void {
      rename.sync(absolutePath, newName, options);
    },
    async renameAsync(
      newName: string,
      options?: RenameOptions,
    ): Promise<void> {
      await rename.async(absolutePath, newName, options);
    },

    // ----- remove -----

    remove(): void {
      remove.sync(absolutePath);
    },
    async removeAsync(): Promise<void> {
      await remove.async(absolutePath);
    },

    // ----- ensure -----

    ensure(criteria?: FileCriteria): JetpackFile {
      fileMod.sync(absolutePath, criteria);
      return self;
    },
    async ensureAsync(criteria?: FileCriteria): Promise<JetpackFile> {
      await fileMod.async(absolutePath, criteria);
      return self;
    },

    // ----- inspect (strict: throws ENOENT) -----

    inspect(options?: InspectOptions): InspectResult {
      const result = inspectMod.sync(absolutePath, options);
      if (result === undefined) {
        throwEnoent(absolutePath);
      }

      return result;
    },
    async inspectAsync(options?: InspectOptions): Promise<InspectResult> {
      const result = await inspectMod.async(absolutePath, options);
      if (result === undefined) {
        throwEnoent(absolutePath);
      }

      return result;
    },

    // ----- symlink -----

    symlink(target: string): void {
      symlink.sync(target, absolutePath);
    },
    async symlinkAsync(target: string): Promise<void> {
      await symlink.async(target, absolutePath);
    },

    // ----- streams -----

    createReadStream(options?: any): fs.ReadStream {
      return streams.createReadStream(absolutePath, options);
    },
    createWriteStream(options?: any): fs.WriteStream {
      return streams.createWriteStream(absolutePath, options);
    },
  };

  return self;
};

export default createJetpackFile;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Throws an ENOENT error for strict handle methods that must not
 * silently return undefined when a file does not exist.
 */
function throwEnoent(filePath: string): never {
  const error: NodeJS.ErrnoException = new Error(
    `ENOENT: no such file or directory, '${filePath}'`,
  );
  error.code = "ENOENT";
  error.path = filePath;
  throw error;
}
