import path from "node:path";
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
  FormatHandler,
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
const createJetpackFile = (
  absolutePath: string,
  formats?: Map<string, FormatHandler>,
): JetpackFile => {
  /** Returns the file extension without the leading dot, or empty string. */
  const getExtension = (): string => {
    const ext = path.extname(absolutePath);
    return ext.length > 0 ? ext.slice(1) : "";
  };

  /** Looks up a registered format handler for this file's extension. */
  const getFormatHandler = (): FormatHandler | undefined => {
    if (!formats) {
      return undefined;
    }

    const ext = getExtension();
    return ext ? formats.get(ext) : undefined;
  };

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
      read.validateInput("read", absolutePath, returnAs);

      // If no explicit returnAs and a format handler is registered, use it
      if (returnAs === undefined) {
        const handler = getFormatHandler();
        if (handler) {
          const raw = read.sync(absolutePath, "utf8") as string | undefined;
          if (raw === undefined) {
            throwEnoent(absolutePath);
          }

          return handler.decode(raw);
        }
      }

      const result = read.sync(absolutePath, returnAs as any);
      if (result === undefined) {
        throwEnoent(absolutePath);
      }

      return result;
    },
    async readAsync(returnAs?: string): Promise<any> {
      read.validateInput("readAsync", absolutePath, returnAs);

      // If no explicit returnAs and a format handler is registered, use it
      if (returnAs === undefined) {
        const handler = getFormatHandler();
        if (handler) {
          const raw = await read.async(absolutePath, "utf8") as string | undefined;
          if (raw === undefined) {
            throwEnoent(absolutePath);
          }

          return handler.decode(raw);
        }
      }

      const result = await read.async(absolutePath, returnAs as any);
      if (result === undefined) {
        throwEnoent(absolutePath);
      }

      return result;
    },

    // ----- write -----

    write(data: WritableData, options?: WriteOptions): void {
      write.validateInput("write", absolutePath, data, options);

      // If data is an object/array and a format handler is registered, use it
      const handler = getFormatHandler();
      if (handler && typeof data === "object" && data !== null && !Buffer.isBuffer(data)) {
        const encoded = handler.encode(data, options);
        write.sync(absolutePath, encoded as any, options);
        return;
      }

      write.sync(absolutePath, data, options);
    },
    async writeAsync(
      data: WritableData,
      options?: WriteOptions,
    ): Promise<void> {
      write.validateInput("writeAsync", absolutePath, data, options);

      // If data is an object/array and a format handler is registered, use it
      const handler = getFormatHandler();
      if (handler && typeof data === "object" && data !== null && !Buffer.isBuffer(data)) {
        const encoded = handler.encode(data, options);
        await write.async(absolutePath, encoded as any, options);
        return;
      }

      await write.async(absolutePath, data, options);
    },

    // ----- append -----

    append(data: AppendData, options?: AppendOptions): void {
      append.validateInput("append", absolutePath, data, options);
      append.sync(absolutePath, data, options);
    },
    async appendAsync(
      data: AppendData,
      options?: AppendOptions,
    ): Promise<void> {
      append.validateInput("appendAsync", absolutePath, data, options);
      await append.async(absolutePath, data, options);
    },

    // ----- copy -----

    copy(to: string, options?: CopyOptions): void {
      copy.validateInput("copy", absolutePath, to, options);
      copy.sync(absolutePath, to, options);
    },
    async copyAsync(to: string, options?: CopyOptions): Promise<void> {
      copy.validateInput("copyAsync", absolutePath, to, options);
      await copy.async(absolutePath, to, options);
    },

    // ----- move -----

    move(to: string, options?: MoveOptions): void {
      move.validateInput("move", absolutePath, to, options);
      move.sync(absolutePath, to, options);
    },
    async moveAsync(to: string, options?: MoveOptions): Promise<void> {
      move.validateInput("moveAsync", absolutePath, to, options);
      await move.async(absolutePath, to, options);
    },

    // ----- rename -----

    rename(newName: string, options?: RenameOptions): void {
      rename.validateInput("rename", absolutePath, newName, options);
      rename.sync(absolutePath, newName, options);
    },
    async renameAsync(
      newName: string,
      options?: RenameOptions,
    ): Promise<void> {
      rename.validateInput("renameAsync", absolutePath, newName, options);
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
      inspectMod.validateInput("inspect", absolutePath, options);
      const result = inspectMod.sync(absolutePath, options);
      if (result === undefined) {
        throwEnoent(absolutePath);
      }

      return result;
    },
    async inspectAsync(options?: InspectOptions): Promise<InspectResult> {
      inspectMod.validateInput("inspectAsync", absolutePath, options);
      const result = await inspectMod.async(absolutePath, options);
      if (result === undefined) {
        throwEnoent(absolutePath);
      }

      return result;
    },

    // ----- symlink -----

    symlink(target: string): void {
      symlink.validateInput("symlink", target, absolutePath);
      symlink.sync(target, absolutePath);
    },
    async symlinkAsync(target: string): Promise<void> {
      symlink.validateInput("symlinkAsync", target, absolutePath);
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
