import fs from 'node:fs';
import fsp from 'node:fs/promises';
import {isErrnoException} from './utils/errors.js';
import * as modeUtil from './utils/mode.js';
import * as validate from './utils/validate.js';
import * as write from './write.js';

/** Criteria for ensuring a file exists with specific properties. */
export type FileCriteria = {
  /** Desired content for the file. Objects/arrays are serialized as JSON. */
  content?: string | Buffer | Record<string, unknown> | unknown[];
  /** Number of spaces for JSON indentation when content is an object/array. */
  jsonIndent?: number;
  /** Desired file mode (permissions). */
  mode?: string | number;
};

/** Validates arguments for file/fileAsync methods. */
const validateInput = (
  methodName: string,
  filePath: string,
  criteria?: FileCriteria,
): void => {
  const methodSignature = `${methodName}(path, [criteria])`;
  validate.argument(methodSignature, 'path', filePath, ['string']);
  validate.options(
    methodSignature,
    'criteria',
    criteria as Record<string, unknown> | undefined,
    {
      content: ['string', 'buffer', 'object', 'array'],
      jsonIndent: ['number'],
      mode: ['string', 'number'],
    },
  );
};

/** Returns criteria with defaults applied (mode is normalized if provided). */
const getCriteriaDefaults = (passedCriteria?: FileCriteria): FileCriteria => {
  const criteria: FileCriteria = passedCriteria || {};
  if (criteria.mode !== undefined) {
    criteria.mode = modeUtil.normalizeFileMode(criteria.mode);
  }

  return criteria;
};

/** Creates an error indicating the path exists but is not a file. */
const generatePathOccupiedByNotFileError = (filePath: string): Error => new Error(
  `Path ${filePath} exists but is not a file. Halting jetpack.file() call for safety reasons.`,
);

// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------

/** Checks if the path exists and is a file. Throws if it exists but is not a file. */
const checkWhatAlreadyOccupiesPathSync = (
  filePath: string,
): fs.Stats | undefined => {
  let stat: fs.Stats | undefined;

  try {
    stat = fs.statSync(filePath);
  } catch (error: unknown) {
    // Detection if path exists
    if (!isErrnoException(error) || error.code !== 'ENOENT') {
      throw error;
    }
  }

  if (stat && !stat.isFile()) {
    throw generatePathOccupiedByNotFileError(filePath);
  }

  return stat;
};

/** Ensures an existing file matches the criteria (content, mode). */
const checkExistingFileFulfillsCriteriaSync = (
  filePath: string,
  stat: fs.Stats,
  criteria: FileCriteria,
): void => {
  const mode = modeUtil.normalizeFileMode(stat.mode);

  const checkContent = (): boolean => {
    if (criteria.content !== undefined) {
      write.sync(filePath, criteria.content, {
        mode,
        jsonIndent: criteria.jsonIndent,
      });
      return true;
    }

    return false;
  };

  const checkMode = (): void => {
    if (criteria.mode !== undefined && criteria.mode !== mode) {
      fs.chmodSync(filePath, criteria.mode as fs.Mode);
    }
  };

  const contentReplaced = checkContent();
  if (!contentReplaced) {
    checkMode();
  }
};

/** Creates a new file with the given criteria (content, mode). */
const createBrandNewFileSync = (
  filePath: string,
  criteria: FileCriteria,
): void => {
  let content: string | Buffer | Record<string, unknown> | unknown[] = '';
  if (criteria.content !== undefined) {
    content = criteria.content;
  }

  write.sync(filePath, content, {
    mode: criteria.mode,
    jsonIndent: criteria.jsonIndent,
  });
};

/** Ensures a file exists at the given path and matches the criteria. Creates it if needed. */
const fileSync = (filePath: string, passedCriteria?: FileCriteria): void => {
  const criteria = getCriteriaDefaults(passedCriteria);
  const stat = checkWhatAlreadyOccupiesPathSync(filePath);
  if (stat === undefined) {
    createBrandNewFileSync(filePath, criteria);
  } else {
    checkExistingFileFulfillsCriteriaSync(filePath, stat, criteria);
  }
};

// ---------------------------------------------------------
// Async
// ---------------------------------------------------------

/** Async version of checkWhatAlreadyOccupiesPathSync. */
const checkWhatAlreadyOccupiesPathAsync = async (
  filePath: string,
): Promise<fs.Stats | undefined> => {
  try {
    const stat = await fsp.stat(filePath);
    if (stat.isFile()) {
      return stat;
    }

    throw generatePathOccupiedByNotFileError(filePath);
  } catch (error: unknown) {
    if (isErrnoException(error) && error.code === 'ENOENT') {
      // Path doesn't exist.
      return undefined;
    }

    throw error;
  }
};

/** Async version of checkExistingFileFulfillsCriteriaSync. */
const checkExistingFileFulfillsCriteriaAsync = async (
  filePath: string,
  stat: fs.Stats,
  criteria: FileCriteria,
): Promise<void> => {
  const mode = modeUtil.normalizeFileMode(stat.mode);

  const checkContent = async (): Promise<boolean> => {
    if (criteria.content !== undefined) {
      await write.async(filePath, criteria.content, {
        mode,
        jsonIndent: criteria.jsonIndent,
      });
      return true;
    }

    return false;
  };

  const checkMode = async (): Promise<void> => {
    if (criteria.mode !== undefined && criteria.mode !== mode) {
      await fsp.chmod(filePath, criteria.mode as fs.Mode);
    }
  };

  const contentReplaced = await checkContent();
  if (!contentReplaced) {
    await checkMode();
  }
};

/** Creates a new file asynchronously with the given criteria (content, mode). */
const createBrandNewFileAsync = async (
  filePath: string,
  criteria: FileCriteria,
): Promise<void> => {
  let content: string | Buffer | Record<string, unknown> | unknown[] = '';
  if (criteria.content !== undefined) {
    content = criteria.content;
  }

  await write.async(filePath, content, {
    mode: criteria.mode,
    jsonIndent: criteria.jsonIndent,
  });
};

/** Async version of fileSync. Ensures a file exists and matches criteria. */
const fileAsync = async (
  filePath: string,
  passedCriteria?: FileCriteria,
): Promise<void> => {
  const criteria = getCriteriaDefaults(passedCriteria);
  const stat = await checkWhatAlreadyOccupiesPathAsync(filePath);
  await (stat === undefined
    ? createBrandNewFileAsync(filePath, criteria)
    : checkExistingFileFulfillsCriteriaAsync(filePath, stat, criteria));
};

// ---------------------------------------------------------
// API
// ---------------------------------------------------------

export {validateInput, fileSync as sync, fileAsync as async};
