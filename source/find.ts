import path from 'node:path';
import * as treeWalker from './utils/tree_walker.js';
import * as inspect from './inspect.js';
import * as matcher from './utils/matcher.js';
import * as validate from './utils/validate.js';
import type {InspectResult} from './inspect.js';
import type {FileItem} from './utils/tree_walker.js';

/** Options for the find operation. */
export type FindOptions = {
  /** Glob pattern(s) to match file/directory names against. Defaults to `"*"`. */
  matching?: string | string[];
  /** Optional filter function applied to each matched item. Can be async. */
  filter?: (item: InspectResult) => boolean | Promise<boolean>;
  /** If true, include files in results. Defaults to `true`. */
  files?: boolean;
  /** If true, include directories in results. Defaults to `false`. */
  directories?: boolean;
  /** If true, search recursively into subdirectories. Defaults to `true`. */
  recursive?: boolean;
  /** If true, glob matching is case-insensitive. Defaults to `false`. */
  ignoreCase?: boolean;
  /** Working directory for resolving relative paths in results. */
  cwd?: string;
};

/** Validates arguments passed to find methods. */
const validateInput = (
  methodName: string,
  findPath: string,
  options?: FindOptions,
): void => {
  const methodSignature = `${methodName}([path], options)`;
  validate.argument(methodSignature, 'path', findPath, ['string']);
  validate.options(
    methodSignature,
    'options',
    options as Record<string, unknown> | undefined,
    {
      matching: ['string', 'array of string'],
      filter: ['function'],
      files: ['boolean'],
      directories: ['boolean'],
      recursive: ['boolean'],
      ignoreCase: ['boolean'],
    },
  );
};

/** Fills in default values for unspecified find options. */
const normalizeOptions = (options?: FindOptions): FindOptions => {
  const options_: FindOptions = options || {};
  // Defaults:
  if (options_.matching === undefined) {
    options_.matching = '*';
  }

  if (options_.files === undefined) {
    options_.files = true;
  }

  if (options_.ignoreCase === undefined) {
    options_.ignoreCase = false;
  }

  if (options_.directories === undefined) {
    options_.directories = false;
  }

  if (options_.recursive === undefined) {
    options_.recursive = true;
  }

  return options_;
};

/** Converts absolute found paths to paths relative to cwd. */
const processFoundPaths = (foundPaths: string[], cwd: string): string[] => foundPaths.map((p) => path.relative(cwd, p));

/** Creates an ENOENT error for when the search path doesn't exist. */
const generatePathDoesntExistError = (
  findPath: string,
): Error & {code?: string} => {
  const error: Error & {code?: string} = new Error(
    `Path you want to find stuff in doesn't exist ${findPath}`,
  );
  error.code = 'ENOENT';
  return error;
};

/** Creates an ENOTDIR error for when the search path is not a directory. */
const generatePathNotDirectoryError = (
  findPath: string,
): Error & {code?: string} => {
  const error: Error & {code?: string} = new Error(
    `Path you want to find stuff in must be a directory ${findPath}`,
  );
  error.code = 'ENOTDIR';
  return error;
};

// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------

/** Walks the directory tree synchronously, collecting paths that match the options. */
const findSync = (findPath: string, options: FindOptions): string[] => {
  const foundAbsolutePaths: string[] = [];
  const matchesAnyOfGlobs = matcher.create(
    findPath,
    options.matching!,
    options.ignoreCase,
  );

  let maxLevelsDeep = Infinity;
  if (options.recursive === false) {
    maxLevelsDeep = 1;
  }

  treeWalker.sync(
    findPath,
    {
      maxLevelsDeep,
      symlinks: 'follow',
      inspectOptions: {times: true, absolutePath: true},
    },
    (itemPath: string, item: FileItem | undefined) => {
      if (item && itemPath !== findPath && matchesAnyOfGlobs(itemPath)) {
        const weHaveMatch =
          (item.type === 'file' && options.files === true) ||
          (item.type === 'dir' && options.directories === true);

        if (weHaveMatch) {
          if (options.filter) {
            const passedThroughFilter = options.filter(item as InspectResult);
            if (passedThroughFilter) {
              foundAbsolutePaths.push(itemPath);
            }
          } else {
            foundAbsolutePaths.push(itemPath);
          }
        }
      }
    },
  );

  foundAbsolutePaths.sort();

  return processFoundPaths(foundAbsolutePaths, options.cwd!);
};

/** Sync entry point: validates the path exists and is a directory, then runs findSync. */
const findSyncInit = (findPath: string, options?: FindOptions): string[] => {
  const entryPointInspect = inspect.sync(findPath, {symlinks: 'follow'});
  if (entryPointInspect === undefined) {
    throw generatePathDoesntExistError(findPath);
  } else if (entryPointInspect.type !== 'dir') {
    throw generatePathNotDirectoryError(findPath);
  }

  return findSync(findPath, normalizeOptions(options));
};

// ---------------------------------------------------------
// Async
// ---------------------------------------------------------

/**
 * Walks the directory tree asynchronously, collecting paths that match the options.
 * Supports both sync and async filter functions.
 */
const findAsync = async (
  findPath: string,
  options: FindOptions,
): Promise<string[]> => new Promise((resolve, reject) => {
  const foundAbsolutePaths: string[] = [];
  const matchesAnyOfGlobs = matcher.create(
    findPath,
    options.matching!,
    options.ignoreCase,
  );

  let maxLevelsDeep = Infinity;
  if (options.recursive === false) {
    maxLevelsDeep = 1;
  }

  let waitingForFiltersToFinish = 0;
  let treeWalkerDone = false;

  const maybeDone = (): void => {
    if (treeWalkerDone && waitingForFiltersToFinish === 0) {
      foundAbsolutePaths.sort();
      resolve(processFoundPaths(foundAbsolutePaths, options.cwd!));
    }
  };

  treeWalker.async(
    findPath,
    {
      maxLevelsDeep,
      symlinks: 'follow',
      inspectOptions: {times: true, absolutePath: true},
    },
    (itemPath: string, item: FileItem | undefined) => {
      if (item && itemPath !== findPath && matchesAnyOfGlobs(itemPath)) {
        const weHaveMatch =
          (item.type === 'file' && options.files === true) ||
          (item.type === 'dir' && options.directories === true);

        if (weHaveMatch) {
          if (options.filter) {
            const passedThroughFilter = options.filter(item as InspectResult);
            const isPromise =
              passedThroughFilter != null &&
              typeof (passedThroughFilter as Promise<boolean>).then ===
              'function';
            if (isPromise) {
              waitingForFiltersToFinish += 1;
              (passedThroughFilter as Promise<boolean>)
                .then((passedThroughFilterResult) => {
                  if (passedThroughFilterResult) {
                    foundAbsolutePaths.push(itemPath);
                  }

                  waitingForFiltersToFinish -= 1;
                  maybeDone();
                })
                .catch((error: Error) => {
                  reject(error);
                });
            } else if (passedThroughFilter) {
              foundAbsolutePaths.push(itemPath);
            }
          } else {
            foundAbsolutePaths.push(itemPath);
          }
        }
      }
    },
    (error?: Error | NodeJS.ErrnoException) => {
      if (error) {
        reject(error);
      } else {
        treeWalkerDone = true;
        maybeDone();
      }
    },
  );
});

/** Async entry point: validates the path exists and is a directory, then runs findAsync. */
const findAsyncInit = async (
  findPath: string,
  options?: FindOptions,
): Promise<string[]> => {
  const entryPointInspect = await inspect.async(findPath, {
    symlinks: 'follow',
  });
  if (entryPointInspect === undefined) {
    throw generatePathDoesntExistError(findPath);
  } else if (entryPointInspect.type !== 'dir') {
    throw generatePathNotDirectoryError(findPath);
  }

  return findAsync(findPath, normalizeOptions(options));
};

// ---------------------------------------------------------
// API
// ---------------------------------------------------------

export {validateInput, findSyncInit as sync, findAsyncInit as async};
