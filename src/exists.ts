import fs from 'node:fs';
import fsp from 'node:fs/promises';
import {isErrnoException} from './utils/errors.js';
import * as validate from './utils/validate.js';

/** Result of an existence check: `false` if not found, or the type of filesystem entry. */
type ExistsResult = false | 'dir' | 'file' | 'other';

/** Validates arguments for the exists method. */
const validateInput = (methodName: string, path: string): void => {
  const methodSignature = `${methodName}(path)`;
  validate.argument(methodSignature, 'path', path, ['string']);
};

// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------

/** Checks synchronously whether a path exists and returns its type, or `false` if not found. */
const existsSync = (path: string): ExistsResult => {
  try {
    const stat = fs.statSync(path);
    if (stat.isDirectory()) {
      return 'dir';
    }

    if (stat.isFile()) {
      return 'file';
    }

    return 'other';
  } catch (error: unknown) {
    if (!isErrnoException(error) || error.code !== 'ENOENT') {
      throw error;
    }
  }

  return false;
};

// ---------------------------------------------------------
// Async
// ---------------------------------------------------------

/** Checks asynchronously whether a path exists and returns its type, or `false` if not found. */
const existsAsync = async (path: string): Promise<ExistsResult> => {
  try {
    const stat = await fsp.stat(path);
    if (stat.isDirectory()) {
      return 'dir';
    }

    if (stat.isFile()) {
      return 'file';
    }

    return 'other';
  } catch (error: unknown) {
    if (isErrnoException(error) && error.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
};

// ---------------------------------------------------------
// API
// ---------------------------------------------------------

export {validateInput, existsSync as sync, existsAsync as async};
