import fs from 'node:fs';
import fsp from 'node:fs/promises';
import {isErrnoException} from './utils/errors.js';
import * as validate from './utils/validate.js';

/** Validates arguments for the list method. */
const validateInput = (methodName: string, path: string | undefined): void => {
  const methodSignature = `${methodName}(path)`;
  validate.argument(methodSignature, 'path', path, ['string', 'undefined']);
};

// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------

/** Lists directory contents synchronously. Returns `undefined` if the path doesn't exist. */
const listSync = (path: string): string[] | undefined => {
  try {
    return fs.readdirSync(path);
  } catch (error: unknown) {
    if (isErrnoException(error) && error.code === 'ENOENT') {
      // Doesn't exist. Return undefined instead of throwing.
      return undefined;
    }

    throw error;
  }
};

// ---------------------------------------------------------
// Async
// ---------------------------------------------------------

/** Lists directory contents asynchronously. Returns `undefined` if the path doesn't exist. */
const listAsync = async (path: string): Promise<string[] | undefined> => {
  try {
    return await fsp.readdir(path);
  } catch (error: unknown) {
    if (isErrnoException(error) && error.code === 'ENOENT') {
      // Doesn't exist. Return undefined instead of throwing.
      return undefined;
    }

    throw error;
  }
};

// ---------------------------------------------------------
// API
// ---------------------------------------------------------

export {validateInput, listSync as sync, listAsync as async};
