import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import * as dir from './dir.js';
import * as exists from './exists.js';
import * as inspect from './inspect.js';
import * as write from './write.js';
import {isErrnoException} from './utils/errors.js';
import * as matcher from './utils/matcher.js';
import * as fileMode from './utils/mode.js';
import * as treeWalker from './utils/tree_walker.js';
import * as validate from './utils/validate.js';
import type {InspectResult, InspectOptions} from './inspect.js';
import type {FileItem} from './utils/tree_walker.js';

/** Options for the copy operation. */
export type CopyOptions = {
  /** Whether to overwrite existing files. Can be a boolean or a function for per-file decisions. */
  overwrite?: boolean | ((src: InspectResult, dest: InspectResult) => boolean);
  /** Glob pattern(s) to filter which files are copied. */
  matching?: string | string[];
  /** Whether glob matching should be case-insensitive. */
  ignoreCase?: boolean;
};

/** Resolved copy options with a compiled matching filter. */
type ParsedCopyOptions = {
  overwrite?: boolean | ((src: InspectResult, dest: InspectResult) => boolean);
  allowedToCopy: (
    srcPath: string,
    destPathOrItem: string | InspectResult,
    extra?: string,
  ) => boolean;
};

/** Internal context passed through the copy pipeline for a single item. */
type CopyContext = {
  srcPath: string;
  destPath: string;
  srcInspectData: InspectResult;
  opts: ParsedCopyOptions;
};

/** Validates arguments for copy/copyAsync methods. */
const validateInput = (
  methodName: string,
  from: string,
  to: string,
  options?: CopyOptions,
): void => {
  const methodSignature = `${methodName}(from, to, [options])`;
  validate.argument(methodSignature, 'from', from, ['string']);
  validate.argument(methodSignature, 'to', to, ['string']);
  validate.options(
    methodSignature,
    'options',
    options as Record<string, unknown> | undefined,
    {
      overwrite: ['boolean', 'function'],
      matching: ['string', 'array of string'],
      ignoreCase: ['boolean'],
    },
  );
};

/** Parses raw user options into resolved options with a compiled matcher. */
const parseOptions = (
  options: CopyOptions | undefined,
  from: string,
): ParsedCopyOptions => {
  const options_ = options || {};
  const parsedOptions: ParsedCopyOptions = {
    overwrite: options_.overwrite,
    allowedToCopy: () => true,
  };

  if (options_.ignoreCase === undefined) {
    options_.ignoreCase = false;
  }

  if (options_.matching) {
    parsedOptions.allowedToCopy = matcher.create(
      from,
      options_.matching,
      options_.ignoreCase,
    );
  }

  return parsedOptions;
};

/** Creates an ENOENT error indicating the source path doesn't exist. */
const generateNoSourceError = (srcPath: string): Error & {code?: string} => {
  const error: Error & {code?: string} = new Error(
    `Path to copy doesn't exist ${srcPath}`,
  );
  error.code = 'ENOENT';
  return error;
};

/** Creates an EEXIST error indicating the destination path already exists. */
const generateDestinationExistsError = (
  destPath: string,
): Error & {code?: string} => {
  const error: Error & {code?: string} = new Error(
    `Destination path already exists ${destPath}`,
  );
  error.code = 'EEXIST';
  return error;
};

const inspectOptions: InspectOptions = {
  mode: true,
  symlinks: 'report',
  times: true,
  absolutePath: true,
};

const shouldThrowDestinationExistsError = (context: CopyContext): boolean => (
  typeof context.opts.overwrite !== 'function' &&
  context.opts.overwrite !== true
);

// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------

/** Validates that the source exists and the destination doesn't conflict before copying. */
const checksBeforeCopyingSync = (
  from: string,
  to: string,
  options: ParsedCopyOptions,
): void => {
  if (!exists.sync(from)) {
    throw generateNoSourceError(from);
  }

  if (exists.sync(to) && !options.overwrite) {
    throw generateDestinationExistsError(to);
  }
};

/** Determines whether the destination can be overwritten based on the overwrite option. */
const canOverwriteItSync = (context: CopyContext): boolean => {
  if (typeof context.opts.overwrite === 'function') {
    const destInspectData = inspect.sync(context.destPath, inspectOptions);
    return context.opts.overwrite(context.srcInspectData, destInspectData!);
  }

  return context.opts.overwrite === true;
};

/**
 * Copies a single file synchronously, handling missing parent dirs and overwrite logic.
 */
const copyFileSync = (
  srcPath: string,
  destPath: string,
  mode: string,
  context: CopyContext,
): void => {
  const data = fs.readFileSync(srcPath);
  try {
    fs.writeFileSync(destPath, data, {
      mode,
      flag: 'wx',
    });
  } catch (error: unknown) {
    if (isErrnoException(error) && error.code === 'ENOENT') {
      write.sync(destPath, data, {mode});
    } else if (isErrnoException(error) && error.code === 'EEXIST') {
      if (canOverwriteItSync(context)) {
        fs.writeFileSync(destPath, data, {mode});
      } else if (shouldThrowDestinationExistsError(context)) {
        throw generateDestinationExistsError(context.destPath);
      }
    } else {
      throw error;
    }
  }
};

/** Copies a symlink synchronously, removing any existing entry at the destination. */
const copySymlinkSync = (from: string, to: string): void => {
  const symlinkPointsAt = fs.readlinkSync(from);
  try {
    fs.symlinkSync(symlinkPointsAt, to);
  } catch (error: unknown) {
    // There is already file/symlink with this name on destination location.
    // Must erase it manually, otherwise system won't allow us to place symlink there.
    if (isErrnoException(error) && error.code === 'EEXIST') {
      fs.unlinkSync(to);
      // Retry...
      fs.symlinkSync(symlinkPointsAt, to);
    } else {
      throw error;
    }
  }
};

/** Dispatches the sync copy of a single item (file, dir, or symlink) based on its type. */
const copyItemSync = (
  srcPath: string,
  srcInspectData: InspectResult,
  destPath: string,
  options: ParsedCopyOptions,
): void => {
  const context: CopyContext = {
    srcPath,
    destPath,
    srcInspectData,
    opts: options,
  };
  const mode = fileMode.normalizeFileMode(srcInspectData.mode!);
  switch (srcInspectData.type) {
    case 'dir': {
      dir.createSync(destPath, {mode});

      break;
    }

    case 'file': {
      copyFileSync(srcPath, destPath, mode, context);

      break;
    }

    case 'symlink': {
      copySymlinkSync(srcPath, destPath);

      break;
    }
    // No default
  }
};

/** Synchronously copies a file or directory tree from `from` to `to`. */
const copySync = (from: string, to: string, options?: CopyOptions): void => {
  const options_ = parseOptions(options, from);

  checksBeforeCopyingSync(from, to, options_);

  treeWalker.sync(
    from,
    {inspectOptions},
    (srcPath: string, srcInspectData: FileItem | undefined) => {
      if (srcInspectData) {
        const rel = path.relative(from, srcPath);
        const destPath = path.resolve(to, rel);
        if (options_.allowedToCopy(srcPath, destPath, undefined)) {
          copyItemSync(
            srcPath,
            srcInspectData as InspectResult,
            destPath,
            options_,
          );
        }
      }
    },
  );
};

// ---------------------------------------------------------
// Async
// ---------------------------------------------------------

/** Async version of checksBeforeCopyingSync. */
const checksBeforeCopyingAsync = async (
  from: string,
  to: string,
  options: ParsedCopyOptions,
): Promise<void> => {
  const srcPathExists = await exists.async(from);
  if (!srcPathExists) {
    throw generateNoSourceError(from);
  }

  const destPathExists = await exists.async(to);
  if (destPathExists && !options.overwrite) {
    throw generateDestinationExistsError(to);
  }
};

/** Async version of canOverwriteItSync. */
const canOverwriteItAsync = async (context: CopyContext): Promise<boolean> => {
  if (typeof context.opts.overwrite === 'function') {
    const destInspectData = await inspect.async(
      context.destPath,
      inspectOptions,
    );
    return context.opts.overwrite(context.srcInspectData, destInspectData!);
  }

  return context.opts.overwrite === true;
};

/**
 * Copies a single file asynchronously using streams, handling missing parent dirs
 * and overwrite logic via retries.
 */
const copyFileAsync = async (
  srcPath: string,
  destPath: string,
  mode: string,
  context: CopyContext,
  runOptions?: {overwrite?: boolean},
): Promise<void> => new Promise((resolve, reject) => {
  const runOptions_ = runOptions || {};

  let flags = 'wx';
  if (runOptions_.overwrite) {
    flags = 'w';
  }

  const readStream = fs.createReadStream(srcPath);
  const writeStream = fs.createWriteStream(destPath, {
    mode: Number.parseInt(mode, 8),
    flags,
  });

  readStream.on('error', reject);

  writeStream.on('error', (error: NodeJS.ErrnoException) => {
    // Force read stream to close, since write stream errored
    // read stream serves us no purpose.
    readStream.resume();

    if (error.code === 'ENOENT') {
      // Some parent directory doesn't exist. Create it and retry.
      dir
        .createAsync(path.dirname(destPath))
        .then(() => {
          copyFileAsync(srcPath, destPath, mode, context).then(
            resolve,
            reject,
          );
        })
        .catch(reject);
    } else if (error.code === 'EEXIST') {
      canOverwriteItAsync(context)
        .then((canOverwrite) => {
          if (canOverwrite) {
            copyFileAsync(srcPath, destPath, mode, context, {
              overwrite: true,
            }).then(resolve, reject);
          } else if (shouldThrowDestinationExistsError(context)) {
            reject(generateDestinationExistsError(destPath));
          } else {
            resolve();
          }
        })
        .catch(reject);
    } else {
      reject(error);
    }
  });

  writeStream.on('finish', resolve);

  readStream.pipe(writeStream);
});

/** Copies a symlink asynchronously, removing any existing entry at the destination. */
const copySymlinkAsync = async (from: string, to: string): Promise<void> => {
  const symlinkPointsAt = await fsp.readlink(from);
  try {
    await fsp.symlink(symlinkPointsAt, to);
  } catch (error: unknown) {
    if (isErrnoException(error) && error.code === 'EEXIST') {
      // There is already file/symlink with this name on destination location.
      // Must erase it manually, otherwise system won't allow us to place symlink there.
      await fsp.unlink(to);
      // Retry...
      await fsp.symlink(symlinkPointsAt, to);
    } else {
      throw error;
    }
  }
};

/** Dispatches the async copy of a single item (file, dir, or symlink) based on its type. */
const copyItemAsync = async (
  srcPath: string,
  srcInspectData: InspectResult,
  destPath: string,
  options: ParsedCopyOptions,
): Promise<void> => {
  const context: CopyContext = {
    srcPath,
    destPath,
    srcInspectData,
    opts: options,
  };
  const mode = fileMode.normalizeFileMode(srcInspectData.mode!);
  switch (srcInspectData.type) {
    case 'dir': {
      return dir.createAsync(destPath, {mode});
    }

    case 'file': {
      return copyFileAsync(srcPath, destPath, mode, context);
    }

    case 'symlink': {
      return copySymlinkAsync(srcPath, destPath);
    }
    // No default
  }

  // Ha! This is none of supported file system entities. What now?
  // Just continuing without actually copying sounds sane.
};

/** Asynchronously copies a file or directory tree from `from` to `to`. */
const copyAsync = async (
  from: string,
  to: string,
  options?: CopyOptions,
): Promise<void> => new Promise((resolve, reject) => {
  const options_ = parseOptions(options, from);

  checksBeforeCopyingAsync(from, to, options_)
    .then(() => {
      let allFilesDelivered = false;
      let filesInProgress = 0;

      treeWalker.async(
        from,
        {inspectOptions},
        (srcPath: string, item: FileItem | undefined) => {
          if (item) {
            const rel = path.relative(from, srcPath);
            const destPath = path.resolve(to, rel);
            if (options_.allowedToCopy(srcPath, destPath, undefined)) {
              filesInProgress += 1;
              copyItemAsync(
                srcPath,
                item as InspectResult,
                destPath,
                options_,
              )
                .then(() => {
                  filesInProgress -= 1;
                  if (allFilesDelivered && filesInProgress === 0) {
                    resolve();
                  }
                })
                .catch(reject);
            }
          }
        },
        (error?: Error | NodeJS.ErrnoException) => {
          if (error) {
            reject(error);
          } else {
            allFilesDelivered = true;
            if (allFilesDelivered && filesInProgress === 0) {
              resolve();
            }
          }
        },
      );
    })
    .catch(reject);
});

// ---------------------------------------------------------
// API
// ---------------------------------------------------------

export {validateInput, copySync as sync, copyAsync as async};
