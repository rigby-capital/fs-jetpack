# @rcsf/fs-jetpack

[![CI](https://github.com/rigby-capital/fs-jetpack/actions/workflows/test.yml/badge.svg)](https://github.com/rigby-capital/fs-jetpack/actions/workflows/test.yml)
[![npm](https://img.shields.io/npm/v/@rcsf/fs-jetpack)](https://www.npmjs.com/package/@rcsf/fs-jetpack)
[![license](https://img.shields.io/npm/l/@rcsf/fs-jetpack)](./LICENSE)
[![Node.js](https://img.shields.io/node/v/@rcsf/fs-jetpack)](https://nodejs.org)

A maintained successor of [`fs-jetpack`](https://github.com/szwacz/fs-jetpack) by Jakub Szwacz.

API for your everyday file system manipulations, much more convenient than [fs](http://nodejs.org/api/fs.html) or [fs-extra](https://github.com/jprichardson/node-fs-extra). You will especially appreciate it as a scripting/tooling library and for your build pipelines.

## What changed from the original

- ESM-only (no CommonJS)
- Requires Node.js >= 22
- Source rewritten in TypeScript with full JSDoc
- Named exports for all API methods
- Uses `node:fs/promises` internally (no custom promisify layer)
- Uses `async/await` throughout
- Tested with Node.js built-in test runner (`node:test`)
- Linted with XO

## Installation

```
npm install @rcsf/fs-jetpack
```

## Usage

```ts
// Default import (classic style)
import jetpack from "@rcsf/fs-jetpack";

// Named imports (pick what you need)
import { read, write, copy, find } from "@rcsf/fs-jetpack";

// Factory function for custom CWD
import { createJetpack } from "@rcsf/fs-jetpack";
const src = createJetpack("/path/to/source");

// Types are exported directly
import type { FSJetpack, InspectResult, CopyOptions } from "@rcsf/fs-jetpack";
```

# Table of Contents

[Key Concepts](#key-concepts)

**API:**
[append](#appendpath-data-options)
[copy](#copyfrom-to-options)
[createReadStream](#createreadstreampath-options)
[createWriteStream](#createwritestreampath-options)
[cwd](#cwdpath)
[dir](#dirpath-criteria)
[exists](#existspath)
[file](#filepath-criteria)
[find](#findpath-searchoptions)
[inspect](#inspectpath-options)
[inspectTree](#inspecttreepath-options)
[list](#listpath)
[move](#movefrom-to-options)
[path](#pathparts)
[read](#readpath-returnas)
[remove](#removepath)
[rename](#renamepath-newname-options)
[symlink](#symlinksymlinkvalue-path)
[tmpDir](#tmpdiroptions)
[write](#writepath-data-options)

# Key Concepts

### Why not use more than one CWD?

You can create many fs-jetpack objects with different internal working directories (which are independent from `process.cwd()`) and work on directories in a little more object-oriented manner.

```ts
const src = jetpack.cwd("path/to/source");
const dest = jetpack.cwd("/some/different/path/to/destination");
src.copy("foo.txt", dest.path("bar.txt"));
```

### JSON is a first class citizen

You can write JavaScript object directly to disk and it will be transformed into JSON automatically.

```ts
const obj = { greet: "Hello World!" };
jetpack.write("file.json", obj);
```

Then you can get your object back just by telling `read` method that it's a JSON.

```ts
const obj = jetpack.read("file.json", "json");
```

### Automatic handling of ENOENT errors

Everyone who has a lot to do with file system probably is sick of seeing error _"ENOENT, no such file or directory"_. Fs-jetpack tries to recover from this.

- For write/creation operations, if any of parent directories doesn't exist jetpack will just create them as well (like `mkdir -p` works).
- For read/inspect operations, if file or directory doesn't exist `undefined` is returned instead of throwing.

### Sync & async harmony

API has the same set of synchronous and asynchronous methods. All async methods are promise based.

The naming convention is `methodAsync()` and `method()` (sync). **If you don't see the word "Async", this method returns value immediately, if you do, promise is returned.**

```ts
// Synchronous call
const data = jetpack.read("file.txt");
console.log(data);

// Asynchronous call
const data = await jetpack.readAsync("file.txt");
console.log(data);
```

## All API methods cooperate nicely with each other

Let's say you want to create folder structure as demonstrated in comment below. Piece of cake!

```ts
// .
// |- greets
//    |- greet.txt
//    |- greet.json
// |- greets-i18n
//    |- polish.txt

jetpack
  .dir("greets")
  .file("greet.txt", { content: "Hello world!" })
  .file("greet.json", { content: { greet: "Hello world!" } })
  .cwd("..")
  .dir("greets-i18n")
  .file("polish.txt", { content: "Witaj świecie!" });
```

Need to copy whole directory of files, but first perform some transformations on each file?

```ts
const src = jetpack.cwd("path/to/source/folder");
const dst = jetpack.cwd("path/to/destination");

for (const path of src.find({ matching: "*" })) {
  const content = src.read(path);
  const transformedContent = transformTheFileHoweverYouWant(content);
  dst.write(path, transformedContent);
}
```

Need to delete all temporary and log files inside `my_folder` tree?

```ts
for (const path of jetpack.find("my_folder", {
  matching: ["*.tmp", "*.log"],
})) {
  jetpack.remove(path);
}
```

Need to perform temporary data transformations?

```ts
const dir = jetpack.tmpDir();
dir.write("data.txt", myData);
// Perform some operations on the data and when you're done
// and don't need the folder any longer just call...
dir.remove();
```

## Upgrading from fs-jetpack

If you are upgrading from the original `fs-jetpack` package:

1. Change `require('fs-jetpack')` to `import jetpack from '@rcsf/fs-jetpack'`
2. Ensure your project uses ESM (`"type": "module"` in package.json)
3. Ensure you are running Node.js >= 22

The API surface is identical -- all methods work the same way.

# API

## append(path, data, [options])

asynchronous: **appendAsync(path, data, [options])**

Appends given data to the end of file. If file or any parent directory doesn't exist it will be created.

**arguments:**
`path` the path to file.
`data` data to append (can be `String` or `Buffer`).
`options` (optional) `Object` with possible fields:

- `mode` if the file doesn't exist yet, will be created with given mode. Value could be number (eg. `0o700`) or string (eg. `'700'`).

**returns:**
Nothing.

## copy(from, to, [options])

asynchronous: **copyAsync(from, to, [options])**

Copies given file or directory (with everything inside).

**arguments:**
`from` path to location you want to copy.
`to` path to destination location, where the copy should be placed.
`options` (optional) additional options for customization. Is an `Object` with possible fields:

- `overwrite` (default: `false`) Whether to overwrite destination path when it already exists. Can be `Boolean` or `Function`. If `false`, an error will be thrown if it already exists. If `true`, the overwrite will be performed (for directories, this overwrite consists of a recursive merge - i.e. only files that already exist in the destination directory will be overwritten). If a function was provided, every time there is a file conflict while copying the function will be invoked with [inspect](#inspectpath-options) objects of both: source and destination file and overwrites the file only if `true` has been returned from the function (see example below). In async mode, the overwrite function can also return a promise, so you can perform multi step processes to determine if file should be overwritten or not (see example below).
- `matching` if defined will actually copy **only** items matching any of specified glob patterns and omit everything else ([all possible globs are described further in this readme](#matching-patterns)).
- `ignoreCase` (default `false`) whether or not case should be ignored when processing glob patterns passed through the `matching` option.

**returns:**
Nothing.

**examples:**

```ts
// Copies a file (and replaces it if one already exists in 'foo' directory)
jetpack.copy("file.txt", "foo/file.txt", { overwrite: true });

// Copies files from folder foo_1 to foo_final, but overwrites in
// foo_final only files which are newer in foo_1.
jetpack.copy("foo_1", "foo_final", {
  overwrite: (srcInspectData, destInspectData) => {
    return srcInspectData.modifyTime > destInspectData.modifyTime;
  },
});

// Copies only '.md' files from 'foo' (and subdirectories of 'foo') to 'bar'.
jetpack.copy("foo", "bar", { matching: "*.md" });
```

## createReadStream(path, [options])

Just an alias to vanilla [fs.createReadStream](http://nodejs.org/api/fs.html#fs_fs_createreadstream_path_options).

## createWriteStream(path, [options])

Just an alias to vanilla [fs.createWriteStream](http://nodejs.org/api/fs.html#fs_fs_createwritestream_path_options).

## cwd([path...])

Returns Current Working Directory (CWD) for this instance of jetpack, or creates new jetpack object with given path as its internal CWD.

**Note:** fs-jetpack never changes value of `process.cwd()`, the CWD we are talking about here is internal value inside every jetpack instance.

**arguments:**
`path...` (optional) path (or many path parts) to become new CWD. Could be absolute, or relative. If relative path given new CWD will be resolved basing on current CWD of this jetpack instance.

**returns:**
If `path` not specified, returns CWD path of this jetpack object. For main instance of fs-jetpack it is always `process.cwd()`.
If `path` specified, returns new jetpack object (totally the same thing as main jetpack). The new object resolves paths according to its internal CWD, not the global one (`process.cwd()`).

## dir(path, [criteria])

asynchronous: **dirAsync(path, [criteria])**

Ensures that directory on given path exists and meets given criteria. If any criterium is not met it will be after this call. If any parent directory in `path` doesn't exist it will be created (like `mkdir -p`).

**arguments:**
`path` path to directory to examine.
`criteria` (optional) criteria to be met by the directory. Is an `Object` with possible fields:

- `empty` (default: `false`) whether directory should be empty (no other files or directories inside). If set to `true` and directory contains any files or subdirectories all of them will be deleted.
- `mode` ensures directory has specified mode. If not set and directory already exists, current mode will be preserved. Value could be number (eg. `0o700`) or string (eg. `'700'`).

**returns:**
New CWD context with directory specified in `path` as CWD.

## exists(path)

asynchronous: **existsAsync(path)**

Checks whether something exists on given `path`. This method returns values more specific than `true/false` to protect from errors like "I was expecting directory, but it was a file".

**returns:**

- `false` if path doesn't exist.
- `"dir"` if path is a directory.
- `"file"` if path is a file.
- `"other"` if none of the above.

## file(path, [criteria])

asynchronous: **fileAsync(path, [criteria])**

Ensures that file exists and meets given criteria. If any criterium is not met it will be after this call. If any parent directory in `path` doesn't exist it will be created (like `mkdir -p`).

**arguments:**
`path` path to file to examine.
`criteria` (optional) criteria to be met by the file. Is an `Object` with possible fields:

- `content` sets file content. Can be `String`, `Buffer`, `Object` or `Array`. If `Object` or `Array` given to this parameter data will be written as JSON.
- `jsonIndent` (defaults to 2) if writing JSON data this tells how many spaces should one indentation have.
- `mode` ensures file has specified mode. If not set and file already exists, current mode will be preserved. Value could be number (eg. `0o700`) or string (eg. `'700'`).

**returns:**
Jetpack object you called this method on (self).

## find([path], searchOptions)

asynchronous: **findAsync([path], searchOptions)**

Finds in directory specified by `path` all files fulfilling `searchOptions`. Returned paths are relative to current CWD of jetpack instance.

**arguments:**
`path` (optional, defaults to `'.'`) path to start search in (all subdirectories will be searched).
`searchOptions` is an `Object` with possible fields:

- `matching` (default `"*"`) glob patterns of files you want to find ([all possible globs are described further in this readme](#matching-patterns)).
- `filter` (default `undefined`) function that is called on each matched path with [inspect object](#inspectpath-options) of that path as an argument. Return `true` or `false` to indicate whether given path should stay on list or should be filtered out.
- `files` (default `true`) whether or not should search for files.
- `directories` (default `false`) whether or not should search for directories.
- `recursive` (default `true`) whether the whole directory tree should be searched recursively, or only one-level of given directory (excluding it's subdirectories).
- `ignoreCase` (`false` otherwise) whether or not case should be ignored when processing glob patterns passed through the `matching` option.

**returns:**
`Array` of found paths.

## inspect(path, [options])

asynchronous: **inspectAsync(path, [options])**

Inspects given path (replacement for `fs.stat`). Returned object by default contains only very basic, not platform-dependent properties, you can enable more properties through options object.

**arguments:**
`path` path to inspect.
`options` (optional). Possible values:

- `checksum` if specified will return checksum of inspected file. Possible values are strings `'md5'`, `'sha1'`, `'sha256'` or `'sha512'`. If given path is a directory this field is ignored.
- `mode` (default `false`) if set to `true` will add file mode (unix file permissions) value.
- `times` (default `false`) if set to `true` will add atime, mtime and ctime fields (here called `accessTime`, `modifyTime`, `changeTime` and `birthTime`).
- `absolutePath` (default `false`) if set to `true` will add absolute path to this resource.
- `symlinks` (default `'report'`) if a given path is a symlink by default `inspect` will report that symlink (not follow it). You can flip this behaviour by setting this option to `'follow'`.

**returns:**
`undefined` if given path doesn't exist.
Otherwise `Object` of structure:

```ts
{
  name: 'my_dir',
  type: 'file', // possible values: 'file', 'dir', 'symlink'
  size: 123, // size in bytes, this is returned only for files
  // if checksum option was specified:
  md5: '900150983cd24fb0d6963f7d28e17f72',
  // if mode option was set to true:
  mode: 33204,
  // if times option was set to true:
  accessTime: Date,
  modifyTime: Date,
  changeTime: Date,
  birthTime: Date,
}
```

## inspectTree(path, [options])

asynchronous: **inspectTreeAsync(path, [options])**

Calls [inspect](#inspectpath-options) recursively on given path so it creates tree of all directories and sub-directories inside it.

**arguments:**
`path` the starting path to inspect.
`options` (optional). Possible values:

- `checksum` if specified will also calculate checksum of every item in the tree. Possible values are strings `'md5'`, `'sha1'`, `'sha256'` or `'sha512'`. Checksums for directories are calculated as checksum of all children' checksums plus their filenames.
- `times` (default `false`) if set to `true` will add atime, mtime and ctime fields to each tree node.
- `relativePath` if set to `true` every tree node will have relative path anchored to root inspected folder.
- `symlinks` (default `'report'`) if a given path is a symlink by default `inspectTree` will report that symlink (not follow it). You can flip this behaviour by setting this option to `'follow'`.

**returns:**
`undefined` if given path doesn't exist.
Otherwise tree of inspect objects.

## list([path])

asynchronous: **listAsync(path)**

Lists the contents of directory. Equivalent of `fs.readdir`.

**arguments:**
`path` (optional) path to directory you would like to list. If not specified defaults to CWD.

**returns:**
Array of file names inside given path, or `undefined` if given path doesn't exist.

## move(from, to, [options])

asynchronous: **moveAsync(from, to, [options])**

Moves given path to new location.

**arguments:**
`from` path to directory or file you want to move.
`to` path where the thing should be moved.
`options` (optional) additional options for customization. Is an `Object` with possible fields:

- `overwrite` (default: `false`) Whether to overwrite destination path when it already exists. If `true`, the overwrite will be performed.

**returns:**
Nothing.

## path(parts...)

Returns path resolved to internal CWD of this jetpack object.

**arguments:**
`parts` strings to join and resolve as path (as many as you like).

**returns:**
Resolved path as string.

## read(path, [returnAs])

asynchronous: **readAsync(path, [returnAs])**

Reads content of file.

**arguments:**
`path` path to file.
`returnAs` (optional) how the content of file should be returned. Is a string with possible values:

- `'utf8'` (default) content will be returned as UTF-8 String.
- `'buffer'` content will be returned as a Buffer.
- `'json'` content will be returned as parsed JSON object.
- `'jsonWithDates'` content will be returned as parsed JSON object, and date strings in [ISO format](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString) will be automatically turned into Date objects.

**returns:**
File content in specified format, or `undefined` if file doesn't exist.

## remove([path])

asynchronous: **removeAsync([path])**

Deletes given path, no matter what it is (file, directory or non-empty directory). If path already doesn't exist terminates gracefully without throwing, so you can use it as 'ensure path doesn't exist'.

**arguments:**
`path` (optional) path to file or directory you want to remove. If not specified the remove action will be performed on current working directory (CWD).

**returns:**
Nothing.

## rename(path, newName, [options])

asynchronous: **renameAsync(path, newName, [options])**

Renames given file or directory.

**arguments:**
`path` path to thing you want to change name of.
`newName` new name for this thing (not full path, just a name).
`options` (optional) additional options for customization. Is an `Object` with possible fields:

- `overwrite` (default: `false`) Whether to overwrite destination path when it already exists. If `true`, the overwrite will be performed.

**returns:**
Nothing.

## symlink(symlinkValue, path)

asynchronous: **symlinkAsync(symlinkValue, path)**

Creates symbolic link.

**arguments:**
`symlinkValue` path where symbolic link should point.
`path` path where symbolic link should be put.

**returns:**
Nothing.

## tmpDir([options])

asynchronous: **tmpDirAsync([options])**

Creates temporary directory with random, unique name.

**arguments:**
`options` (optional) `Object` with possible fields:

- `prefix` prefix to be added to created random directory name. Defaults to none.
- `basePath` the path where temporary directory should be created. Defaults to [os.tmpdir](https://nodejs.org/api/os.html#os_os_tmpdir).

**returns:**
New CWD context with temporary directory specified in `path` as CWD.

## write(path, data, [options])

asynchronous: **writeAsync(path, data, [options])**

Writes data to file. If any parent directory in `path` doesn't exist it will be created (like `mkdir -p`).

**arguments:**
`path` path to file.
`data` data to be written. This could be `String`, `Buffer`, `Object` or `Array` (if last two used, the data will be outputted into file as JSON).
`options` (optional) `Object` with possible fields:

- `mode` file will be created with given mode. Value could be number (eg. `0o700`) or string (eg. `'700'`).
- `atomic` (default `false`) if set to `true` the file will be written using strategy which is much more resistant to data loss.
- `jsonIndent` (defaults to 2) if writing JSON data this tells how many spaces should one indentation have.

**returns:**
Nothing.

# Matching patterns

API methods [copy](#copyfrom-to-options) and [find](#findpath-searchoptions) have `matching` option. Those are all the possible tokens to use there:

- `*` - Matches 0 or more characters in a single path portion.
- `?` - Matches 1 character.
- `!` - Used as the first character in pattern will invert the matching logic (match everything what **is not** matched by tokens further in this pattern).
- `[...]` - Matches a range of characters, similar to a RegExp range. If the first character of the range is `!` or `^` then it matches any character not in the range.
- `@(pattern|pat*|pat?ern)` - Matches exactly one of the patterns provided.
- `+(pattern|pat*|pat?ern)` - Matches one or more occurrences of the patterns provided.
- `?(pattern|pat*|pat?ern)` - Matches zero or one occurrence of the patterns provided.
- `*(pattern|pat*|pat?ern)` - Matches zero or more occurrences of the patterns provided.
- `!(pattern|pat*|pat?ern)` - Matches anything that does not match any of the patterns provided.
- `**` - If a "globstar" is alone in a path portion, then it matches zero or more directories and subdirectories.

Glob matching is powered by [minimatch](https://github.com/isaacs/minimatch).

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for the full release history.
