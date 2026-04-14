import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import {isErrnoException} from './utils/errors.js';
import * as validate from './utils/validate.js';
import * as dir from './dir.js';

/** Options for the write operation. */
export type WriteOptions = {
  /** File mode (permissions). Can be a number (e.g. 0o700) or octal string (e.g. "700"). */
  mode?: string | number;
  /** If true, writes atomically via a temporary file to prevent data loss. */
  atomic?: boolean;
  /** Number of spaces for JSON indentation. Defaults to 2. */
  jsonIndent?: number;
};

/** Validates arguments passed to write methods. */
const validateInput = (
  methodName: string,
  filePath: string,
  data: string | Buffer | Record<string, unknown> | unknown[],
  options?: WriteOptions,
): void => {
  const methodSignature = `${methodName}(path, data, [options])`;
  validate.argument(methodSignature, 'path', filePath, ['string']);
  validate.argument(methodSignature, 'data', data, [
    'string',
    'buffer',
    'object',
    'array',
  ]);
  validate.options(
    methodSignature,
    'options',
    options as Record<string, unknown> | undefined,
    {
      mode: ['string', 'number'],
      atomic: ['boolean'],
      jsonIndent: ['number'],
    },
  );
};

// Temporary file extensions used for atomic file overwriting.
const newExt = '.__new__';

/** Converts objects/arrays to JSON strings; passes strings and Buffers through unchanged. */
const serializeToJsonMaybe = (
  data: string | Buffer | Record<string, unknown> | unknown[],
  jsonIndent?: number,
): string | Buffer => {
  let indent = jsonIndent;
  if (typeof indent !== 'number') {
    indent = 2;
  }

  if (typeof data === 'object' && !Buffer.isBuffer(data) && data !== null) {
    return JSON.stringify(data, null, indent);
  }

  return data;
};

// ---------------------------------------------------------
// SYNC
// ---------------------------------------------------------

/** Writes data to a file synchronously, creating parent directories if needed. */
const writeFileSync = (
  filePath: string,
  data: string | Buffer,
  options?: {mode?: string | number},
): void => {
  try {
    fs.writeFileSync(filePath, data, options);
  } catch (error: unknown) {
    if (isErrnoException(error) && error.code === 'ENOENT') {
      // Means parent directory doesn't exist, so create it and try again.
      dir.createSync(path.dirname(filePath));
      fs.writeFileSync(filePath, data, options);
    } else {
      throw error;
    }
  }
};

/** Writes data atomically by writing to a temp file first, then renaming. */
const writeAtomicSync = (
  filePath: string,
  data: string | Buffer,
  options?: {mode?: string | number},
): void => {
  // We are assuming there is file on given path, and we don't want
  // to touch it until we are sure our data has been saved correctly,
  // so write the data into temporary file...
  writeFileSync(filePath + newExt, data, options);
  // ...next rename temp file to replace real path.
  fs.renameSync(filePath + newExt, filePath);
};

/** Writes data synchronously, serializing objects to JSON and optionally using atomic writes. */
const writeSync = (
  filePath: string,
  data: string | Buffer | Record<string, unknown> | unknown[],
  options?: WriteOptions,
): void => {
  const options_ = options || {};
  const processedData = serializeToJsonMaybe(data, options_.jsonIndent);

  let writeStrategy = writeFileSync;
  if (options_.atomic) {
    writeStrategy = writeAtomicSync;
  }

  writeStrategy(filePath, processedData, {mode: options_.mode});
};

// ---------------------------------------------------------
// ASYNC
// ---------------------------------------------------------

/** Writes data to a file asynchronously, creating parent directories if needed. */
const writeFileAsync = async (
  filePath: string,
  data: string | Buffer,
  options?: {mode?: string | number},
): Promise<void> => {
  try {
    await fsp.writeFile(filePath, data, options);
  } catch (error: unknown) {
    if (isErrnoException(error) && error.code === 'ENOENT') {
      // Parent directory doesn't exist, so create it and try again.
      await dir.createAsync(path.dirname(filePath));
      await fsp.writeFile(filePath, data, options);
    } else {
      throw error;
    }
  }
};

/** Writes data atomically (async) by writing to a temp file first, then renaming. */
const writeAtomicAsync = async (
  filePath: string,
  data: string | Buffer,
  options?: {mode?: string | number},
): Promise<void> => {
  // We are assuming there is file on given path, and we don't want
  // to touch it until we are sure our data has been saved correctly,
  // so write the data into temporary file...
  await writeFileAsync(filePath + newExt, data, options);
  // ...next rename temp file to real path.
  await fsp.rename(filePath + newExt, filePath);
};

/** Writes data asynchronously, serializing objects to JSON and optionally using atomic writes. */
const writeAsync = async (
  filePath: string,
  data: string | Buffer | Record<string, unknown> | unknown[],
  options?: WriteOptions,
): Promise<void> => {
  const options_ = options || {};
  const processedData = serializeToJsonMaybe(data, options_.jsonIndent);

  let writeStrategy = writeFileAsync;
  if (options_.atomic) {
    writeStrategy = writeAtomicAsync;
  }

  await writeStrategy(filePath, processedData, {mode: options_.mode});
};

// ---------------------------------------------------------
// API
// ---------------------------------------------------------

export {validateInput, writeSync as sync, writeAsync as async};
