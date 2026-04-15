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
  FormatHandler,
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
const createJetpackDir = (
  absolutePath: string,
  formats?: Map<string, FormatHandler>,
): JetpackDir => {
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
      return createJetpackFile(path.resolve(absolutePath, name), formats);
    },

    dir(name: string): JetpackDir {
      return createJetpackDir(path.resolve(absolutePath, name), formats);
    },

    // ----- list (strict: throws ENOENT) -----

    list(): string[] {
      list.validateInput("list", absolutePath);
      const result = list.sync(absolutePath);
      if (result === undefined) {
        throwEnoent(absolutePath);
      }

      return result;
    },
    async listAsync(): Promise<string[]> {
      list.validateInput("listAsync", absolutePath);
      const result = await list.async(absolutePath);
      if (result === undefined) {
        throwEnoent(absolutePath);
      }

      return result;
    },

    // ----- find -----

    find(options?: FindOptions): string[] {
      find.validateInput("find", absolutePath, options);
      const options_: FindOptions = {...options, cwd: absolutePath};
      return find.sync(absolutePath, options_);
    },
    async findAsync(options?: FindOptions): Promise<string[]> {
      find.validateInput("findAsync", absolutePath, options);
      const options_: FindOptions = {...options, cwd: absolutePath};
      return find.async(absolutePath, options_);
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

    // ----- inspectTree (strict: throws ENOENT) -----

    inspectTree(options?: InspectTreeOptions): InspectTreeResult {
      inspectTree.validateInput("inspectTree", absolutePath, options);
      const result = inspectTree.sync(absolutePath, options);
      if (result === undefined) {
        throwEnoent(absolutePath);
      }

      return result;
    },
    async inspectTreeAsync(
      options?: InspectTreeOptions,
    ): Promise<InspectTreeResult> {
      inspectTree.validateInput("inspectTreeAsync", absolutePath, options);
      const result = await inspectTree.async(absolutePath, options);
      if (result === undefined) {
        throwEnoent(absolutePath);
      }

      return result;
    },

    // ----- tmpDir -----

    tmpDir(options?: TmpDirOptions): JetpackDir {
      tmpDir.validateInput("tmpDir", options);
      const createdPath = tmpDir.sync(absolutePath, options);
      return createJetpackDir(createdPath, formats);
    },
    async tmpDirAsync(options?: TmpDirOptions): Promise<JetpackDir> {
      tmpDir.validateInput("tmpDirAsync", options);
      const createdPath = await tmpDir.async(absolutePath, options);
      return createJetpackDir(createdPath, formats);
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
