import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import * as dir from './dir.js';
import {isErrnoException} from './utils/errors.js';
import * as validate from './utils/validate.js';

/** Options for creating a temporary directory. */
export type TmpDirOptions = {
  /** String prefix prepended to the random directory name. */
  prefix?: string;
  /** Base directory in which to create the temp dir. Defaults to `os.tmpdir()`. */
  basePath?: string;
};

/** Validates arguments passed to temporaryDir methods. */
const validateInput = (methodName: string, options?: TmpDirOptions): void => {
  const methodSignature = `${methodName}([options])`;
  validate.options(
    methodSignature,
    'options',
    options as Record<string, unknown> | undefined,
    {
      prefix: ['string'],
      basePath: ['string'],
    },
  );
};

/** Resolved options with all defaults applied. */
type ResolvedTemporaryDirOptions = {
  prefix: string;
  basePath: string;
};

/** Merges user options with defaults, resolving basePath relative to cwd. */
const getOptionsDefaults = (
  passedOptions: TmpDirOptions | undefined,
  cwdPath: string,
): ResolvedTemporaryDirOptions => {
  const input = passedOptions || {};
  const options: ResolvedTemporaryDirOptions = {
    prefix: '',
    basePath: os.tmpdir(),
  };
  if (typeof input.prefix === 'string') {
    options.prefix = input.prefix;
  }

  if (typeof input.basePath === 'string') {
    options.basePath = path.resolve(cwdPath, input.basePath);
  }

  return options;
};

const randomStringLength = 32;

// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------

/** Creates a temporary directory synchronously with a random name. Returns the created path. */
const temporaryDirSync = (
  cwdPath: string,
  passedOptions?: TmpDirOptions,
): string => {
  const options = getOptionsDefaults(passedOptions, cwdPath);
  const randomString = crypto
    .randomBytes(randomStringLength / 2)
    .toString('hex');
  const dirPath = path.join(options.basePath, options.prefix + randomString);
  // Let's assume everything will go well, do the directory fastest way possible
  try {
    fs.mkdirSync(dirPath);
  } catch (error: unknown) {
    // Something went wrong, try to recover by using more sophisticated approach
    if (isErrnoException(error) && error.code === 'ENOENT') {
      dir.sync(dirPath);
    } else {
      throw error;
    }
  }

  return dirPath;
};

// ---------------------------------------------------------
// Async
// ---------------------------------------------------------

/** Creates a temporary directory asynchronously with a random name. Returns the created path. */
const temporaryDirAsync = async (
  cwdPath: string,
  passedOptions?: TmpDirOptions,
): Promise<string> => {
  const options = getOptionsDefaults(passedOptions, cwdPath);
  const randomString = crypto
    .randomBytes(randomStringLength / 2)
    .toString('hex');
  const dirPath = path.join(options.basePath, options.prefix + randomString);
  // Let's assume everything will go well, do the directory fastest way possible
  try {
    await fsp.mkdir(dirPath);
  } catch (error: unknown) {
    // Something went wrong, try to recover by using more sophisticated approach
    if (isErrnoException(error) && error.code === 'ENOENT') {
      await dir.async(dirPath);
    } else {
      throw error;
    }
  }

  return dirPath;
};

// ---------------------------------------------------------
// API
// ---------------------------------------------------------

export {validateInput, temporaryDirSync as sync, temporaryDirAsync as async};
