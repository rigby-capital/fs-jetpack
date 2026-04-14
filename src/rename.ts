import path from 'node:path';
import * as validate from './utils/validate.js';
import * as moveModule from './move.js';

/** Options for the rename operation. */
type RenameOptions = {
  overwrite?: boolean;
};

/** Validates arguments for the rename method. Ensures newName is a filename, not a path. */
const validateInput = (
  methodName: string,
  filePath: string,
  newName: string,
  options?: RenameOptions,
): void => {
  const methodSignature = `${methodName}(path, newName, [options])`;
  validate.argument(methodSignature, 'path', filePath, ['string']);
  validate.argument(methodSignature, 'newName', newName, ['string']);
  validate.options(methodSignature, 'options', options, {
    overwrite: ['boolean'],
  });

  if (path.basename(newName) !== newName) {
    throw new Error(
      `Argument "newName" passed to ${methodSignature} should be a filename, not a path. Received "${newName}"`,
    );
  }
};

// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------

/** Renames a file or directory synchronously by moving it to a new name within the same parent directory. */
const renameSync = (
  filePath: string,
  newName: string,
  options?: RenameOptions,
): void => {
  const newPath = path.join(path.dirname(filePath), newName);
  moveModule.sync(filePath, newPath, options);
};

// ---------------------------------------------------------
// Async
// ---------------------------------------------------------

/** Renames a file or directory asynchronously by moving it to a new name within the same parent directory. */
const renameAsync = async (
  filePath: string,
  newName: string,
  options?: RenameOptions,
): Promise<void> => {
  const newPath = path.join(path.dirname(filePath), newName);
  await moveModule.async(filePath, newPath, options);
};

// ---------------------------------------------------------
// API
// ---------------------------------------------------------

export {validateInput, renameSync as sync, renameAsync as async};
