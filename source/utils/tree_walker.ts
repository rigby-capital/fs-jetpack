import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import * as inspect from "../inspect.js";

/** Filesystem entry type classification. */
export type ItemType = "dir" | "file" | "symlink" | "other";

/** Represents a filesystem entry with at minimum a name and type. */
export type FileItem = {
  name: string;
  type: ItemType;
  [key: string]: unknown;
};

/** Options controlling what metadata is collected during file inspection. */
export type InspectOptions = {
  checksum?: string;
  mode?: boolean;
  times?: boolean;
  absolutePath?: boolean;
  symlinks?: "report" | "follow";
};

/** Options controlling directory tree walking behavior. */
export type WalkOptions = {
  maxLevelsDeep?: number;
  inspectOptions?: InspectOptions;
  symlinks?: "report" | "follow";
};

/** Callback invoked for each filesystem entry encountered during a walk. */
export type WalkCallback = (path: string, item: FileItem | undefined) => void;

/** Callback invoked when an async walk completes or encounters an error. */
export type DoneCallback = (error?: Error | NodeJS.ErrnoException) => void;

/** Determines the {@link ItemType} of a filesystem entry from its dirent or stats object. */
const fileType = (dirent: fs.Dirent | fs.Stats): ItemType => {
  if (dirent.isDirectory()) {
    return "dir";
  }

  if (dirent.isFile()) {
    return "file";
  }

  if (dirent.isSymbolicLink()) {
    return "symlink";
  }

  return "other";
};

// ---------------------------------------------------------
// SYNC
// ---------------------------------------------------------

/**
 * Synchronously walks a directory tree, invoking the callback for each entry.
 * Defaults to unlimited depth if `maxLevelsDeep` is not set.
 */
const initialWalkSync = (
  walkPath: string,
  options: WalkOptions,
  callback: WalkCallback,
): void => {
  if (options.maxLevelsDeep === undefined) {
    options.maxLevelsDeep = Infinity;
  }

  const performInspectOnEachNode = options.inspectOptions !== undefined;
  if (options.symlinks) {
    if (options.inspectOptions === undefined) {
      options.inspectOptions = { symlinks: options.symlinks };
    } else {
      options.inspectOptions.symlinks = options.symlinks;
    }
  }

  const walkSync = (dirPath: string, currentLevel: number): void => {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const direntItem of entries) {
      const withFileTypesNotSupported = typeof direntItem === "string";

      const fileItemPath: string = withFileTypesNotSupported
        ? path.join(dirPath, direntItem as unknown as string)
        : path.join(dirPath, direntItem.name);

      let fileItem: FileItem | undefined;
      if (performInspectOnEachNode) {
        fileItem = inspect.sync(fileItemPath, options.inspectOptions) as
        | FileItem
        | undefined;
      } else if (withFileTypesNotSupported) {
        // New "withFileTypes" API not supported, need to do extra inspect
        // on each node, to know if this is a directory or a file.
        const inspectObject = inspect.sync(
          fileItemPath,
          options.inspectOptions,
        ) as FileItem | undefined;
        if (inspectObject) {
          fileItem = { name: inspectObject.name, type: inspectObject.type };
        }
      } else {
        const type = fileType(direntItem);
        if (type === "symlink" && options.symlinks === "follow") {
          const symlinkPointsTo = fs.statSync(fileItemPath);
          fileItem = {
            name: direntItem.name,
            type: fileType(symlinkPointsTo),
          };
        } else {
          fileItem = { name: direntItem.name, type };
        }
      }

      if (fileItem !== undefined) {
        callback(fileItemPath, fileItem);
        if (fileItem.type === "dir" && currentLevel < options.maxLevelsDeep!) {
          walkSync(fileItemPath, currentLevel + 1);
        }
      }
    }
  };

  const item = inspect.sync(walkPath, options.inspectOptions) as
    | FileItem
    | undefined;
  if (item) {
    if (performInspectOnEachNode) {
      callback(walkPath, item);
    } else {
      // Return simplified object, not full inspect object
      callback(walkPath, { name: item.name, type: item.type });
    }

    if (item.type === "dir") {
      walkSync(walkPath, 1);
    }
  } else {
    callback(walkPath, undefined);
  }
};

// ---------------------------------------------------------
// ASYNC
// ---------------------------------------------------------

/** Maximum number of concurrent filesystem operations during async walk. */
const maxConcurrentOperations = 5;

/**
 * Asynchronously walks a directory tree with bounded concurrency,
 * invoking the callback for each entry and doneCallback on completion or error.
 */
const initialWalkAsync = (
  walkPath: string,
  options: WalkOptions,
  callback: WalkCallback,
  doneCallback: DoneCallback,
): void => {
  if (options.maxLevelsDeep === undefined) {
    options.maxLevelsDeep = Infinity;
  }

  const performInspectOnEachNode = options.inspectOptions !== undefined;
  if (options.symlinks) {
    if (options.inspectOptions === undefined) {
      options.inspectOptions = { symlinks: options.symlinks };
    } else {
      options.inspectOptions.symlinks = options.symlinks;
    }
  }

  const concurrentOperationsQueue: Array<() => void> = [];
  let nowDoingConcurrentOperations = 0;

  const checkConcurrentOperations = (): void => {
    if (
      concurrentOperationsQueue.length === 0 &&
      nowDoingConcurrentOperations === 0
    ) {
      doneCallback();
    } else if (
      concurrentOperationsQueue.length > 0 &&
      nowDoingConcurrentOperations < maxConcurrentOperations
    ) {
      const operation = concurrentOperationsQueue.pop()!;
      nowDoingConcurrentOperations += 1;
      operation();
    }
  };

  const whenConcurrencySlotAvailable = (operation: () => void): void => {
    concurrentOperationsQueue.push(operation);
    checkConcurrentOperations();
  };

  const concurrentOperationDone = (): void => {
    nowDoingConcurrentOperations -= 1;
    checkConcurrentOperations();
  };

  const walkAsync = (dirPath: string, currentLevel: number): void => {
    const goDeeperIfDir = (fileItemPath: string, fileItem: FileItem): void => {
      if (fileItem.type === "dir" && currentLevel < options.maxLevelsDeep!) {
        walkAsync(fileItemPath, currentLevel + 1);
      }
    };

    whenConcurrencySlotAvailable(() => {
      fsp
        .readdir(dirPath, { withFileTypes: true })
        .then((files) => {
          for (const direntItem of files) {
            const withFileTypesNotSupported = typeof direntItem === "string";

            let fileItemPath: string;
            if (withFileTypesNotSupported) {
              fileItemPath = path.join(
                dirPath,
                direntItem as unknown as string,
              );
            } else {
              fileItemPath = path.join(dirPath, direntItem.name);
            }

            if (performInspectOnEachNode || withFileTypesNotSupported) {
              whenConcurrencySlotAvailable(() => {
                inspect
                  .async(fileItemPath, options.inspectOptions)
                  .then((fileItem: FileItem | undefined) => {
                    if (fileItem !== undefined) {
                      if (performInspectOnEachNode) {
                        callback(fileItemPath, fileItem);
                      } else {
                        callback(fileItemPath, {
                          name: fileItem.name,
                          type: fileItem.type,
                        });
                      }

                      goDeeperIfDir(fileItemPath, fileItem);
                    }

                    concurrentOperationDone();
                  })
                  .catch((error: Error) => {
                    doneCallback(error);
                  });
              });
            } else {
              const type = fileType(direntItem);
              if (type === "symlink" && options.symlinks === "follow") {
                whenConcurrencySlotAvailable(() => {
                  fsp
                    .stat(fileItemPath)
                    .then((symlinkPointsTo) => {
                      const fileItem: FileItem = {
                        name: direntItem.name,
                        type: fileType(symlinkPointsTo),
                      };
                      callback(fileItemPath, fileItem);
                      goDeeperIfDir(fileItemPath, fileItem);
                      concurrentOperationDone();
                    })
                    .catch((error: Error) => {
                      doneCallback(error);
                    });
                });
              } else {
                const fileItem: FileItem = { name: direntItem.name, type };
                callback(fileItemPath, fileItem);
                goDeeperIfDir(fileItemPath, fileItem);
              }
            }
          }

          concurrentOperationDone();
        })
        .catch((error: Error) => {
          doneCallback(error);
        });
    });
  };

  inspect
    .async(walkPath, options.inspectOptions)
    .then((item: FileItem | undefined) => {
      if (item) {
        if (performInspectOnEachNode) {
          callback(walkPath, item);
        } else {
          // Return simplified object, not full inspect object
          callback(walkPath, { name: item.name, type: item.type });
        }

        if (item.type === "dir") {
          walkAsync(walkPath, 1);
        } else {
          doneCallback();
        }
      } else {
        callback(walkPath, undefined);
        doneCallback();
      }
    })
    .catch((error: Error) => {
      doneCallback(error);
    });
};

// ---------------------------------------------------------
// API
// ---------------------------------------------------------

export { initialWalkSync as sync, initialWalkAsync as async };
