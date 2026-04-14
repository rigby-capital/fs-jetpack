import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import {isErrnoException} from './utils/errors.js';
import * as validate from './utils/validate.js';

/** Options for the inspect operation. */
export type InspectOptions = {
  /** Hash algorithm to compute for files (e.g. "md5", "sha256"). */
  checksum?: string;
  /** If true, include the file mode (permissions) in results. */
  mode?: boolean;
  /** If true, include access, modify, change, and birth timestamps. */
  times?: boolean;
  /** If true, include the absolute path in results. */
  absolutePath?: boolean;
  /** How to handle symlinks: "report" returns symlink info, "follow" resolves the target. */
  symlinks?: 'report' | 'follow';
};

/** Result of inspecting a filesystem entry. */
export type InspectResult = {
  /** Basename of the file or directory. */
  name: string;
  /** Type of the filesystem entry. */
  type: 'file' | 'dir' | 'symlink' | 'other';
  /** File size in bytes (files only). */
  size?: number;
  /** Absolute path, if requested. */
  absolutePath?: string;
  /** MD5 checksum hex string, if requested. */
  md5?: string;
  /** SHA-1 checksum hex string, if requested. */
  sha1?: string;
  /** SHA-256 checksum hex string, if requested. */
  sha256?: string;
  /** SHA-512 checksum hex string, if requested. */
  sha512?: string;
  /** File mode (permissions bitmask), if requested. */
  mode?: number;
  /** Last access time, if requested. */
  accessTime?: Date;
  /** Last modification time, if requested. */
  modifyTime?: Date;
  /** Last status change time, if requested. */
  changeTime?: Date;
  /** Creation time, if requested. */
  birthTime?: Date;
  /** Symlink target path, if the entry is a symlink. */
  pointsAt?: string;
  [key: string]: unknown;
};

/** Checksum algorithms supported by the inspect operation. */
const supportedChecksumAlgorithms: string[] = [
  'md5',
  'sha1',
  'sha256',
  'sha512',
];

/** Valid values for the symlinks option. */
const symlinkOptions: string[] = ['report', 'follow'];

/** Validates arguments passed to inspect methods. */
const validateInput = (
  methodName: string,
  filePath: string,
  options?: InspectOptions,
): void => {
  const methodSignature = `${methodName}(path, [options])`;
  validate.argument(methodSignature, 'path', filePath, ['string']);
  validate.options(
    methodSignature,
    'options',
    options as Record<string, unknown> | undefined,
    {
      checksum: ['string'],
      mode: ['boolean'],
      times: ['boolean'],
      absolutePath: ['boolean'],
      symlinks: ['string'],
    },
  );

  if (
    options?.checksum !== undefined &&
    !supportedChecksumAlgorithms.includes(options.checksum)
  ) {
    throw new Error(
      `Argument "options.checksum" passed to ${methodSignature} must have one of values: ${supportedChecksumAlgorithms.join(
        ', ',
      )}`,
    );
  }

  if (
    options?.symlinks !== undefined &&
    !symlinkOptions.includes(options.symlinks)
  ) {
    throw new Error(
      `Argument "options.symlinks" passed to ${methodSignature} must have one of values: ${symlinkOptions.join(
        ', ',
      )}`,
    );
  }
};

/** Builds an InspectResult from a stat object, populating type, size, mode, and times. */
const createInspectObject = (
  filePath: string,
  options: InspectOptions,
  stat: fs.Stats,
): InspectResult => {
  const object: InspectResult = {
    name: path.basename(filePath),
    type: 'other',
  };

  if (stat.isFile()) {
    object.type = 'file';
    object.size = stat.size;
  } else if (stat.isDirectory()) {
    object.type = 'dir';
  } else if (stat.isSymbolicLink()) {
    object.type = 'symlink';
  } else {
    object.type = 'other';
  }

  if (options.mode) {
    object.mode = stat.mode;
  }

  if (options.times) {
    object.accessTime = stat.atime;
    object.modifyTime = stat.mtime;
    object.changeTime = stat.ctime;
    object.birthTime = stat.birthtime;
  }

  if (options.absolutePath) {
    object.absolutePath = filePath;
  }

  return object;
};

// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------

/** Computes a hex checksum of a file synchronously. */
const fileChecksum = (filePath: string, algo: string): string => {
  const hash = crypto.createHash(algo);
  const data = fs.readFileSync(filePath);
  hash.update(data);
  return hash.digest('hex');
};

/** Adds checksum (for files) or symlink target (for symlinks) to the inspect result synchronously. */
const addExtraFieldsSync = (
  filePath: string,
  inspectObject: InspectResult,
  options: InspectOptions,
): void => {
  if (inspectObject.type === 'file' && options.checksum) {
    inspectObject[options.checksum] = fileChecksum(filePath, options.checksum);
  } else if (inspectObject.type === 'symlink') {
    inspectObject.pointsAt = fs.readlinkSync(filePath);
  }
};

/** Inspects a filesystem entry synchronously. Returns undefined if the path doesn't exist. */
const inspectSync = (
  filePath: string,
  options?: InspectOptions,
): InspectResult | undefined => {
  const options_ = options || {};
  let statOperation: (p: fs.PathLike) => fs.Stats = fs.lstatSync;

  if (options_.symlinks === 'follow') {
    statOperation = fs.statSync;
  }

  let stat: fs.Stats;
  try {
    stat = statOperation(filePath);
  } catch (error: unknown) {
    // Detection if path exists
    if (isErrnoException(error) && error.code === 'ENOENT') {
      // Doesn't exist. Return undefined instead of throwing.
      return undefined;
    }

    throw error;
  }

  const inspectObject = createInspectObject(filePath, options_, stat);
  addExtraFieldsSync(filePath, inspectObject, options_);

  return inspectObject;
};

// ---------------------------------------------------------
// Async
// ---------------------------------------------------------

/** Computes a hex checksum of a file asynchronously using a read stream. */
const fileChecksumAsync = async (
  filePath: string,
  algo: string,
): Promise<string> => new Promise((resolve, reject) => {
  const hash = crypto.createHash(algo);
  const s = fs.createReadStream(filePath);
  s.on('data', (data: string | Buffer) => {
    hash.update(data);
  });
  s.on('end', () => {
    resolve(hash.digest('hex'));
  });
  s.on('error', reject);
});

/** Adds checksum (for files) or symlink target (for symlinks) to the inspect result asynchronously. */
const addExtraFieldsAsync = async (
  filePath: string,
  inspectObject: InspectResult,
  options: InspectOptions,
): Promise<InspectResult> => {
  if (inspectObject.type === 'file' && options.checksum) {
    const checksum = await fileChecksumAsync(filePath, options.checksum);
    inspectObject[options.checksum] = checksum;
    return inspectObject;
  }

  if (inspectObject.type === 'symlink') {
    const linkPath = await fsp.readlink(filePath);
    inspectObject.pointsAt = linkPath;
    return inspectObject;
  }

  return inspectObject;
};

/** Inspects a filesystem entry asynchronously. Returns undefined if the path doesn't exist. */
const inspectAsync = async (
  filePath: string,
  options?: InspectOptions,
): Promise<InspectResult | undefined> => {
  const options_ = options || {};
  let statOperation: (p: fs.PathLike) => Promise<fs.Stats> = fsp.lstat;

  if (options_.symlinks === 'follow') {
    statOperation = fsp.stat;
  }

  let stat: fs.Stats;
  try {
    stat = await statOperation(filePath);
  } catch (error: unknown) {
    // Detection if path exists
    if (isErrnoException(error) && error.code === 'ENOENT') {
      // Doesn't exist. Return undefined instead of throwing.
      return undefined;
    }

    throw error;
  }

  const inspectObject = createInspectObject(filePath, options_, stat);
  return addExtraFieldsAsync(filePath, inspectObject, options_);
};

// ---------------------------------------------------------
// API
// ---------------------------------------------------------

export {
  supportedChecksumAlgorithms,
  symlinkOptions,
  validateInput,
  inspectSync as sync,
  inspectAsync as async,
};
