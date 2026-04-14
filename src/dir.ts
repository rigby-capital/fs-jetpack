import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import {isErrnoException} from './utils/errors.js';
import * as modeUtil from './utils/mode.js';
import * as validate from './utils/validate.js';
import * as remove from './remove.js';

/** Criteria for ensuring a directory exists with specific properties. */
export type DirCriteria = {
  /** If true, all contents of the directory will be deleted. */
  empty?: boolean;
  /** Desired file mode (permissions) for the directory. */
  mode?: string | number;
};

/** Validates arguments for dir/dirAsync methods. */
const validateInput = (
  methodName: string,
  dirPath: string,
  criteria?: DirCriteria,
): void => {
  const methodSignature = `${methodName}(path, [criteria])`;
  validate.argument(methodSignature, 'path', dirPath, ['string']);
  validate.options(
    methodSignature,
    'criteria',
    criteria as Record<string, unknown> | undefined,
    {
      empty: ['boolean'],
      mode: ['string', 'number'],
    },
  );
};

/** Returns criteria with defaults applied (empty defaults to false, mode is normalized). */
const getCriteriaDefaults = (passedCriteria?: DirCriteria): DirCriteria => {
  const criteria: DirCriteria = passedCriteria || {};
  if (typeof criteria.empty !== 'boolean') {
    criteria.empty = false;
  }

  if (criteria.mode !== undefined) {
    criteria.mode = modeUtil.normalizeFileMode(criteria.mode);
  }

  return criteria;
};

/** Creates an error indicating the path exists but is not a directory. */
const generatePathOccupiedByNotDirectoryError = (dirPath: string): Error => new Error(
  `Path ${dirPath} exists but is not a directory. Halting jetpack.dir() call for safety reasons.`,
);

// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------

/** Checks if the path exists and is a directory. Throws if it exists but is not a directory. */
const checkWhatAlreadyOccupiesPathSync = (
  dirPath: string,
): fs.Stats | undefined => {
  let stat: fs.Stats | undefined;

  try {
    stat = fs.statSync(dirPath);
  } catch (error: unknown) {
    // Detection if path already exists
    if (!isErrnoException(error) || error.code !== 'ENOENT') {
      throw error;
    }
  }

  if (stat && !stat.isDirectory()) {
    throw generatePathOccupiedByNotDirectoryError(dirPath);
  }

  return stat;
};

/** Recursively creates a directory and any missing parent directories. */
const createBrandNewDirectorySync = (
  dirPath: string,
  options_?: {mode?: string | number},
): void => {
  const options = options_ || {};

  try {
    fs.mkdirSync(dirPath, options.mode as fs.Mode | undefined);
  } catch (error: unknown) {
    if (isErrnoException(error) && error.code === 'ENOENT') {
      // Parent directory doesn't exist. Need to create it first.
      createBrandNewDirectorySync(path.dirname(dirPath), options);
      // Now retry creating this directory.
      fs.mkdirSync(dirPath, options.mode as fs.Mode | undefined);
    } else if (isErrnoException(error) && error.code === 'EEXIST') {
      // The path already exists. We're fine.
    } else {
      throw error;
    }
  }
};

/** Ensures an existing directory matches the criteria (mode, emptiness). */
const checkExistingDirectoryFulfillsCriteriaSync = (
  dirPath: string,
  stat: fs.Stats,
  criteria: DirCriteria,
): void => {
  const checkMode = (): void => {
    const mode = modeUtil.normalizeFileMode(stat.mode);
    if (criteria.mode !== undefined && criteria.mode !== mode) {
      fs.chmodSync(dirPath, criteria.mode as fs.Mode);
    }
  };

  const checkEmptiness = (): void => {
    if (criteria.empty) {
      // Delete everything inside this directory
      const list = fs.readdirSync(dirPath);
      list.forEach((filename: string) => {
        remove.sync(path.resolve(dirPath, filename));
      });
    }
  };

  checkMode();
  checkEmptiness();
};

/** Ensures a directory exists at the given path and matches the criteria. Creates it if needed. */
const dirSync = (dirPath: string, passedCriteria?: DirCriteria): void => {
  const criteria = getCriteriaDefaults(passedCriteria);
  const stat = checkWhatAlreadyOccupiesPathSync(dirPath);
  if (stat) {
    checkExistingDirectoryFulfillsCriteriaSync(dirPath, stat, criteria);
  } else {
    createBrandNewDirectorySync(dirPath, criteria);
  }
};

// ---------------------------------------------------------
// Async
// ---------------------------------------------------------

/** Async version of checkWhatAlreadyOccupiesPathSync. */
const checkWhatAlreadyOccupiesPathAsync = async (
  dirPath: string,
): Promise<fs.Stats | undefined> => {
  try {
    const stat = await fsp.stat(dirPath);
    if (stat.isDirectory()) {
      return stat;
    }

    throw generatePathOccupiedByNotDirectoryError(dirPath);
  } catch (error: unknown) {
    if (isErrnoException(error) && error.code === 'ENOENT') {
      // Path doesn't exist
      return undefined;
    }

    throw error;
  }
};

// Delete all files and directories inside given directory
/** Removes all contents of a directory without removing the directory itself. */
const emptyAsync = async (dirPath: string): Promise<void> => {
  const list = await fsp.readdir(dirPath);
  for (const filename of list) {
    const subPath = path.resolve(dirPath, filename);
    await remove.async(subPath);
  }
};

/** Async version of checkExistingDirectoryFulfillsCriteriaSync. */
const checkExistingDirectoryFulfillsCriteriaAsync = async (
  dirPath: string,
  stat: fs.Stats,
  criteria: DirCriteria,
): Promise<void> => {
  const mode = modeUtil.normalizeFileMode(stat.mode);
  if (criteria.mode !== undefined && criteria.mode !== mode) {
    await fsp.chmod(dirPath, criteria.mode as fs.Mode);
  }

  if (criteria.empty) {
    await emptyAsync(dirPath);
  }
};

/** Recursively creates a directory and any missing parent directories (async). */
const createBrandNewDirectoryAsync = async (
  dirPath: string,
  options_?: {mode?: string | number},
): Promise<void> => {
  const options = options_ || {};

  try {
    await fsp.mkdir(dirPath, options.mode as fs.Mode | undefined);
  } catch (error: unknown) {
    if (isErrnoException(error) && error.code === 'ENOENT') {
      // Parent directory doesn't exist. Need to create it first.
      await createBrandNewDirectoryAsync(path.dirname(dirPath), options);
      // Now retry creating this directory.
      try {
        await fsp.mkdir(dirPath, options.mode as fs.Mode | undefined);
      } catch (error_: unknown) {
        if (!isErrnoException(error_) || error_.code !== 'EEXIST') {
          throw error_;
        }
        // Hmm, something other have already created the directory?
        // No problem for us.
      }
    } else if (isErrnoException(error) && error.code === 'EEXIST') {
      // The path already exists. We're fine.
    } else {
      throw error;
    }
  }
};

/** Async version of dirSync. Ensures a directory exists and matches criteria. */
const dirAsync = async (
  dirPath: string,
  passedCriteria?: DirCriteria,
): Promise<void> => {
  const criteria = getCriteriaDefaults(passedCriteria);
  const stat = await checkWhatAlreadyOccupiesPathAsync(dirPath);
  await (stat === undefined
    ? createBrandNewDirectoryAsync(dirPath, criteria)
    : checkExistingDirectoryFulfillsCriteriaAsync(dirPath, stat, criteria));
};

// ---------------------------------------------------------
// API
// ---------------------------------------------------------

export {
  validateInput,
  dirSync as sync,
  createBrandNewDirectorySync as createSync,
  dirAsync as async,
  createBrandNewDirectoryAsync as createAsync,
};
