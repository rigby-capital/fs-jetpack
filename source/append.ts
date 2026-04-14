import fs from 'node:fs';
import fsp from 'node:fs/promises';
import {isErrnoException} from './utils/errors.js';
import * as validate from './utils/validate.js';
import * as writeModule from './write.js';

/** Options for the append operation. */
type AppendOptions = {
  mode?: string | number;
};

/** Validates arguments for the append method. */
const validateInput = (
  methodName: string,
  path: string,
  data: string | Buffer,
  options?: AppendOptions,
): void => {
  const methodSignature = `${methodName}(path, data, [options])`;
  validate.argument(methodSignature, 'path', path, ['string']);
  validate.argument(methodSignature, 'data', data, ['string', 'buffer']);
  validate.options(methodSignature, 'options', options, {
    mode: ['string', 'number'],
  });
};

// ---------------------------------------------------------
// SYNC
// ---------------------------------------------------------

/** Appends data to a file synchronously. Creates the file and parent directories if they don't exist. */
const appendSync = (
  path: string,
  data: string | Buffer,
  options?: AppendOptions,
): void => {
  try {
    fs.appendFileSync(path, data, options);
  } catch (error: unknown) {
    if (isErrnoException(error) && error.code === 'ENOENT') {
      // Parent directory doesn't exist, so just pass the task to `write`,
      // which will create the folder and file.
      writeModule.sync(path, data, options);
    } else {
      throw error;
    }
  }
};

// ---------------------------------------------------------
// ASYNC
// ---------------------------------------------------------

/** Appends data to a file asynchronously. Creates the file and parent directories if they don't exist. */
const appendAsync = async (
  path: string,
  data: string | Buffer,
  options?: AppendOptions,
): Promise<void> => {
  try {
    await fsp.appendFile(path, data, options);
  } catch (error: unknown) {
    if (isErrnoException(error) && error.code === 'ENOENT') {
      // Parent directory doesn't exist, so just pass the task to `write`,
      // which will create the folder and file.
      await writeModule.async(path, data, options);
    } else {
      throw error;
    }
  }
};

// ---------------------------------------------------------
// API
// ---------------------------------------------------------

export {validateInput, appendSync as sync, appendAsync as async};
