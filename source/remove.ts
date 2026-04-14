import fs from 'node:fs';
import fsp from 'node:fs/promises';
import * as validate from './utils/validate.js';

/** Validates arguments for the remove method. */
const validateInput = (methodName: string, path: string | undefined): void => {
  const methodSignature = `${methodName}([path])`;
  validate.argument(methodSignature, 'path', path, ['string', 'undefined']);
};

// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------

/** Removes a file or directory synchronously, including all contents recursively. */
const removeSync = (path: string): void => {
  fs.rmSync(path, {
    recursive: true,
    force: true,
    maxRetries: 3,
  });
};

// ---------------------------------------------------------
// Async
// ---------------------------------------------------------

/** Removes a file or directory asynchronously, including all contents recursively. */
const removeAsync = async (path: string): Promise<void> => {
  await fsp.rm(path, {
    recursive: true,
    force: true,
    maxRetries: 3,
  });
};

// ---------------------------------------------------------
// API
// ---------------------------------------------------------

export {validateInput, removeSync as sync, removeAsync as async};
