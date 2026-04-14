import path from "node:path";
import * as copy from "./copy.js";
import * as dirMod from "./dir.js";
import * as exists from "./exists.js";
import * as find from "./find.js";
import * as inspectMod from "./inspect.js";
import * as inspectTree from "./inspect_tree.js";
import * as list from "./list.js";
import * as move from "./move.js";
import * as remove from "./remove.js";
import * as rename from "./rename.js";
import * as tmpDir from "./tmp_dir.js";
import createJetpackFile from "./jetpack_file.js";
import type {
  ExistsResult,
  InspectOptions,
  InspectTreeOptions,
  InspectTreeResult,
  JetpackDir,
  JetpackFile,
  RenameOptions,
} from "./jetpack.js";
import type {InspectResult} from "./inspect.js";
import type {CopyOptions} from "./copy.js";
import type {MoveOptions} from "./move.js";
import type {DirCriteria} from "./dir.js";
import type {FindOptions} from "./find.js";
import type {TmpDirOptions} from "./tmp_dir.js";

/**
 * Creates a lazy {@link JetpackDir} handle for the given absolute path.
 * No I/O is performed until a method is called.
 *
 * Unlike the flat API (`jetpack.list(path)`) which returns `undefined`
 * for missing directories, the OOP handle's `list()`, `inspect()`, and
 * `inspectTree()` methods **throw** an ENOENT error (strict semantic).
 */
const createJetpackDir = (absolutePath: string): JetpackDir => {
  const self: JetpackDir = {
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

    // ----- child handles -----

    file(name: string): JetpackFile {
      return createJetpackFile(path.resolve(absolutePath, name));
    },

    dir(name: string): JetpackDir {
      return createJetpackDir(path.resolve(absolutePath, name));
    },

    // ----- list (strict: throws ENOENT) -----

    list(): string[] {
      const result = list.sync(absolutePath);
      if (result === undefined) {
        throwEnoent(absolutePath);
      }

      return result;
    },
    async listAsync(): Promise<string[]> {
      const result = await list.async(absolutePath);
      if (result === undefined) {
        throwEnoent(absolutePath);
      }

      return result;
    },

    // ----- find (already throws ENOENT internally) -----

    find(options?: FindOptions): string[] {
      const options_: FindOptions = {...options, cwd: absolutePath};
      return find.sync(absolutePath, options_);
    },
    async findAsync(options?: FindOptions): Promise<string[]> {
      const options_: FindOptions = {...options, cwd: absolutePath};
      return find.async(absolutePath, options_);
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

    ensure(criteria?: DirCriteria): JetpackDir {
      dirMod.sync(absolutePath, criteria);
      return self;
    },
    async ensureAsync(criteria?: DirCriteria): Promise<JetpackDir> {
      await dirMod.async(absolutePath, criteria);
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

    // ----- inspectTree (strict: throws ENOENT) -----

    inspectTree(options?: InspectTreeOptions): InspectTreeResult {
      const result = inspectTree.sync(absolutePath, options);
      if (result === undefined) {
        throwEnoent(absolutePath);
      }

      return result;
    },
    async inspectTreeAsync(
      options?: InspectTreeOptions,
    ): Promise<InspectTreeResult> {
      const result = await inspectTree.async(absolutePath, options);
      if (result === undefined) {
        throwEnoent(absolutePath);
      }

      return result;
    },

    // ----- tmpDir -----

    tmpDir(options?: TmpDirOptions): JetpackDir {
      const createdPath = tmpDir.sync(absolutePath, options);
      return createJetpackDir(createdPath);
    },
    async tmpDirAsync(options?: TmpDirOptions): Promise<JetpackDir> {
      const createdPath = await tmpDir.async(absolutePath, options);
      return createJetpackDir(createdPath);
    },
  };

  return self;
};

export default createJetpackDir;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Throws an ENOENT error for strict handle methods that must not
 * silently return undefined when a directory does not exist.
 */
function throwEnoent(dirPath: string): never {
  const error: NodeJS.ErrnoException = new Error(
    `ENOENT: no such file or directory, '${dirPath}'`,
  );
  error.code = "ENOENT";
  error.path = dirPath;
  throw error;
}
