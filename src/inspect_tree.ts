import crypto from 'node:crypto';
import path from 'node:path';
import * as inspect from './inspect.js';
import * as validate from './utils/validate.js';
import * as treeWalker from './utils/tree_walker.js';
import type {InspectResult, InspectOptions} from './inspect.js';
import type {FileItem} from './utils/tree_walker.js';

/** Options for the inspectTree operation. */
type InspectTreeOptions = {
  /** Hash algorithm to compute for files and directories (e.g. "md5", "sha256"). */
  checksum?: string;
  /** If true, include a relative path from the tree root on each node. */
  relativePath?: boolean;
  /** If true, include access, modify, change, and birth timestamps. */
  times?: boolean;
  /** How to handle symlinks: "report" returns symlink info, "follow" resolves the target. */
  symlinks?: 'report' | 'follow';
};

/** Result of inspecting a directory tree. Extends InspectResult with children and relativePath. */
type InspectTreeResult = {
  /** Child entries if this node is a directory. */
  children?: InspectTreeResult[];
  /** Path relative to the tree root, if requested. */
  relativePath?: string;
} & InspectResult;

/** Validates arguments passed to inspectTree methods. */
const validateInput = (
  methodName: string,
  treePath: string,
  options?: InspectTreeOptions,
): void => {
  const methodSignature = `${methodName}(path, [options])`;
  validate.argument(methodSignature, 'path', treePath, ['string']);
  validate.options(
    methodSignature,
    'options',
    options as Record<string, unknown> | undefined,
    {
      checksum: ['string'],
      relativePath: ['boolean'],
      times: ['boolean'],
      symlinks: ['string'],
    },
  );

  if (
    options?.checksum !== undefined &&
    !inspect.supportedChecksumAlgorithms.includes(options.checksum)
  ) {
    throw new Error(
      `Argument "options.checksum" passed to ${methodSignature} must have one of values: ${inspect.supportedChecksumAlgorithms.join(
        ', ',
      )}`,
    );
  }

  if (
    options?.symlinks !== undefined &&
    !inspect.symlinkOptions.includes(options.symlinks)
  ) {
    throw new Error(
      `Argument "options.symlinks" passed to ${methodSignature} must have one of values: ${inspect.symlinkOptions.join(
        ', ',
      )}`,
    );
  }
};

/** Computes the relative path of a node within the tree based on its parent. */
const relativePathInTree = (
  parentInspectObject: InspectTreeResult | undefined,
  inspectObject: InspectTreeResult,
): string => {
  if (parentInspectObject === undefined) {
    return '.';
  }

  return parentInspectObject.relativePath + '/' + inspectObject.name;
};

/** Computes a directory checksum by hashing the names and checksums of all its children. */
const checksumOfDir = (
  inspectList: InspectTreeResult[],
  algo: string,
): string => {
  const hash = crypto.createHash(algo);
  for (const inspectObject of inspectList) {
    hash.update(inspectObject.name + (inspectObject[algo] as string));
  }

  return hash.digest('hex');
};

/**
 * Recursively computes relative paths, total sizes, and checksums for directory nodes.
 * Sorts children with directories first, then alphabetically.
 */
const calculateTreeDependentProperties = (
  parentInspectObject: InspectTreeResult | undefined,
  inspectObject: InspectTreeResult,
  options: InspectTreeOptions,
): void => {
  if (options.relativePath) {
    inspectObject.relativePath = relativePathInTree(
      parentInspectObject,
      inspectObject,
    );
  }

  if (inspectObject.type === 'dir') {
    for (const childInspectObject of inspectObject.children!) {
      calculateTreeDependentProperties(
        inspectObject,
        childInspectObject,
        options,
      );
    }

    inspectObject.size = 0;
    inspectObject.children!.sort((a, b) => {
      if (a.type === 'dir' && b.type === 'file') {
        return -1;
      }

      if (a.type === 'file' && b.type === 'dir') {
        return 1;
      }

      return a.name.localeCompare(b.name);
    });
    for (const child of inspectObject.children!) {
      inspectObject.size += child.size || 0;
    }

    if (options.checksum) {
      inspectObject[options.checksum] = checksumOfDir(
        inspectObject.children!,
        options.checksum,
      );
    }
  }
};

/** Traverses the tree to find the parent node for a given path chain. */
const findParentInTree = (
  treeNode: InspectTreeResult,
  pathChain: string[],
  _item: InspectTreeResult,
): InspectTreeResult => {
  const name = pathChain[0];
  if (pathChain.length > 1) {
    const itemInTreeForPathChain = treeNode.children!.find((child) => child.name === name);
    return findParentInTree(itemInTreeForPathChain!, pathChain.slice(1), _item);
  }

  return treeNode;
};

// ---------------------------------------------------------
// Sync
// ---------------------------------------------------------

/** Inspects a directory tree synchronously. Returns undefined if the path doesn't exist. */
const inspectTreeSync = (
  treePath: string,
  options_?: InspectTreeOptions,
): InspectTreeResult | undefined => {
  const options = options_ || {};
  let tree: InspectTreeResult | undefined;

  treeWalker.sync(
    treePath,
    {inspectOptions: options as InspectOptions},
    (itemPath: string, item: FileItem | undefined) => {
      if (item) {
        const treeItem = item as InspectTreeResult;
        if (treeItem.type === 'dir') {
          treeItem.children = [];
        }

        const relativePath = path.relative(treePath, itemPath);
        if (relativePath === '') {
          tree = treeItem;
        } else {
          const parentItem = findParentInTree(
            tree!,
            relativePath.split(path.sep),
            treeItem,
          );
          parentItem.children!.push(treeItem);
        }
      }
    },
  );

  if (tree) {
    calculateTreeDependentProperties(undefined, tree, options);
  }

  return tree;
};

// ---------------------------------------------------------
// Async
// ---------------------------------------------------------

/** Inspects a directory tree asynchronously. Returns undefined if the path doesn't exist. */
const inspectTreeAsync = async (
  treePath: string,
  options_?: InspectTreeOptions,
): Promise<InspectTreeResult | undefined> => {
  const options = options_ || {};
  let tree: InspectTreeResult | undefined;

  return new Promise((resolve, reject) => {
    treeWalker.async(
      treePath,
      {inspectOptions: options as InspectOptions},
      (itemPath: string, item: FileItem | undefined) => {
        if (item) {
          const treeItem = item as InspectTreeResult;
          if (treeItem.type === 'dir') {
            treeItem.children = [];
          }

          const relativePath = path.relative(treePath, itemPath);
          if (relativePath === '') {
            tree = treeItem;
          } else {
            const parentItem = findParentInTree(
              tree!,
              relativePath.split(path.sep),
              treeItem,
            );
            parentItem.children!.push(treeItem);
          }
        }
      },
      (error?: Error | NodeJS.ErrnoException) => {
        if (error) {
          reject(error);
        } else {
          if (tree) {
            calculateTreeDependentProperties(undefined, tree, options);
          }

          resolve(tree);
        }
      },
    );
  });
};

// ---------------------------------------------------------
// API
// ---------------------------------------------------------

export {validateInput, inspectTreeSync as sync, inspectTreeAsync as async};
