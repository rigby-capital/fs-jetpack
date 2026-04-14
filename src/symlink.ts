import path from 'node:path';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import {isErrnoException} from './utils/errors.js';
import * as validate from './utils/validate.js';
import * as dir from './dir.js';

/** Validates arguments for the symlink method. */
const validateInput = (
  methodName: string,
  symlinkValue: string,
  symlinkPath: string,
): void => {
  const methodSignature = `${methodName}(symlinkValue, path)`;
  validate.argument(methodSignature, 'symlinkValue', symlinkValue, ['string']);
  validate.argument(methodSignature, 'path', symlinkPath, ['string']);
};

// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------

/** Creates a symbolic link synchronously. Creates parent directories if they don't exist. */
const symlinkSync = (symlinkValue: string, symlinkPath: string): void => {
  try {
    fs.symlinkSync(symlinkValue, symlinkPath);
  } catch (error: unknown) {
    if (isErrnoException(error) && error.code === 'ENOENT') {
      // Parent directories don't exist. Just create them and retry.
      dir.createSync(path.dirname(symlinkPath));
      fs.symlinkSync(symlinkValue, symlinkPath);
    } else {
      throw error;
    }
  }
};

// ---------------------------------------------------------
// Async
// ---------------------------------------------------------

/** Creates a symbolic link asynchronously. Creates parent directories if they don't exist. */
const symlinkAsync = async (
  symlinkValue: string,
  symlinkPath: string,
): Promise<void> => {
  try {
    await fsp.symlink(symlinkValue, symlinkPath);
  } catch (error: unknown) {
    if (isErrnoException(error) && error.code === 'ENOENT') {
      // Parent directories don't exist. Just create them and retry.
      await dir.createAsync(path.dirname(symlinkPath));
      await fsp.symlink(symlinkValue, symlinkPath);
    } else {
      throw error;
    }
  }
};

// ---------------------------------------------------------
// API
// ---------------------------------------------------------

export {validateInput, symlinkSync as sync, symlinkAsync as async};
