import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import {isErrnoException} from './utils/errors.js';
import * as validate from './utils/validate.js';
import * as copy from './copy.js';
import * as dir from './dir.js';
import * as exists from './exists.js';
import * as remove from './remove.js';

/** Options for the move operation. */
export type MoveOptions = {
  /** Whether to overwrite an existing file or directory at the destination. */
  overwrite?: boolean;
};

/** Validates arguments for move/moveAsync methods. */
const validateInput = (
  methodName: string,
  from: string,
  to: string,
  options?: MoveOptions,
): void => {
  const methodSignature = `${methodName}(from, to, [options])`;
  validate.argument(methodSignature, 'from', from, ['string']);
  validate.argument(methodSignature, 'to', to, ['string']);
  validate.options(
    methodSignature,
    'options',
    options as Record<string, unknown> | undefined,
    {
      overwrite: ['boolean'],
    },
  );
};

/** Returns the options object, defaulting to an empty object. */
const parseOptions = (options?: MoveOptions): MoveOptions => options || {};

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

/** Creates an ENOENT error indicating the source path doesn't exist. */
const generateSourceDoesntExistError = (
  srcPath: string,
): Error & {code?: string} => {
  const error: Error & {code?: string} = new Error(
    `Path to move doesn't exist ${srcPath}`,
  );
  error.code = 'ENOENT';
  return error;
};

// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------

/**
 * Synchronously moves a file or directory from `from` to `to`.
 * Falls back to copy+remove for cross-device moves.
 */
const moveSync = (from: string, to: string, options?: MoveOptions): void => {
  const options_ = parseOptions(options);

  if (exists.sync(to) !== false && options_.overwrite !== true) {
    throw generateDestinationExistsError(to);
  }

  // We now have permission to overwrite, since either `opts.overwrite` is true
  // or the destination does not exist (in which overwriting is irrelevant).

  try {
    // If destination is a file, `fs.renameSync` will overwrite it.
    fs.renameSync(from, to);
  } catch (error: unknown) {
    if (!isErrnoException(error)) {
      throw error;
    }

    switch (error.code) {
      case 'EISDIR':
      case 'EPERM': {
        // Looks like the destination path is a directory in the same device,
        // so we can remove it and call `fs.renameSync` again.
        remove.sync(to);
        fs.renameSync(from, to);

        break;
      }

      case 'EXDEV': {
        // The destination path is in another device.
        copy.sync(from, to, {overwrite: true});
        remove.sync(from);

        break;
      }

      case 'ENOENT': {
        // This can be caused by either the source not existing or one or more folders
        // in the destination path not existing.
        if (!exists.sync(from)) {
          throw generateSourceDoesntExistError(from);
        }

        // One or more directories in the destination path don't exist.
        dir.createSync(path.dirname(to));
        // Retry the attempt
        fs.renameSync(from, to);

        break;
      }

      default: {
        // We can't make sense of this error. Rethrow it.
        throw error;
      }
    }
  }
};

// ---------------------------------------------------------
// Async
// ---------------------------------------------------------

/** Ensures the parent directory of the destination path exists, creating it if needed. */
const ensureDestinationPathExistsAsync = async (to: string): Promise<void> => {
  const destDir = path.dirname(to);
  const dstExists = await exists.async(destDir);
  if (!dstExists) {
    await dir.createAsync(destDir);
  }
};

/**
 * Asynchronously moves a file or directory from `from` to `to`.
 * Falls back to copy+remove for cross-device moves.
 */
const moveAsync = async (
  from: string,
  to: string,
  options?: MoveOptions,
): Promise<void> => {
  const options_ = parseOptions(options);

  const destinationExists = await exists.async(to);
  if (destinationExists !== false && options_.overwrite !== true) {
    throw generateDestinationExistsError(to);
  }

  // We now have permission to overwrite, since either `opts.overwrite` is true
  // or the destination does not exist (in which overwriting is irrelevant).
  try {
    // If destination is a file, `fsp.rename` will overwrite it.
    await fsp.rename(from, to);
  } catch (error: unknown) {
    if (!isErrnoException(error)) {
      throw error;
    }

    switch (error.code) {
      case 'EISDIR':
      case 'EPERM': {
        // Looks like the destination path is a directory in the same device,
        // so we can remove it and call `fsp.rename` again.
        await remove.async(to);
        await fsp.rename(from, to);

        break;
      }

      case 'EXDEV': {
        // The destination path is in another device.
        await copy.async(from, to, {overwrite: true});
        await remove.async(from);

        break;
      }

      case 'ENOENT': {
        // This can be caused by either the source not existing or one or more folders
        // in the destination path not existing.
        const srcExists = await exists.async(from);
        if (!srcExists) {
          throw generateSourceDoesntExistError(from);
        }

        // One or more directories in the destination path don't exist.
        await ensureDestinationPathExistsAsync(to);
        // Retry the attempt
        await fsp.rename(from, to);

        break;
      }

      default: {
        // Something unknown. Rethrow original error.
        throw error;
      }
    }
  }
};

// ---------------------------------------------------------
// API
// ---------------------------------------------------------

export {validateInput, moveSync as sync, moveAsync as async};
