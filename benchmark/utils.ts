import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import jetpack from "../source/index.js";
import type { FSJetpack } from "../source/jetpack.js";

const execAsync = promisify(execFile);

/** Formats bytes into a human-readable string. */
const prettyBytes = (bytes: number): string => {
  const units = ["B", "kB", "MB", "GB"];
  let unitIndex = 0;
  let value = bytes;
  while (value >= 1000 && unitIndex < units.length - 1) {
    value /= 1000;
    unitIndex++;
  }

  return `${Math.round(value * 100) / 100} ${units[unitIndex]}`;
};

type CreationConfig = {
  files: number;
  size: number;
  filesPerNestedDir?: number;
};

const testDirPath = (): string => `${os.tmpdir()}/jetpack-benchmark`;

export const prepareJetpackTestDir = (): FSJetpack =>
  jetpack.dir(testDirPath(), { empty: true });

export const prepareFiles = async (
  initialDir: FSJetpack,
  creationConfig: CreationConfig,
): Promise<void> => {
  let dir = initialDir;
  let count = 0;
  let countFilesInThisDir = 0;
  const content = Buffer.alloc(creationConfig.size, "x");

  console.log(
    `Preparing ${creationConfig.files} test files (${prettyBytes(creationConfig.size)} each)...`,
  );

  while (count < creationConfig.files) {
    await dir.fileAsync(`${count}.txt`, { content });
    count++;
    countFilesInThisDir++;
    if (
      creationConfig.filesPerNestedDir &&
      countFilesInThisDir === creationConfig.filesPerNestedDir &&
      count < creationConfig.files
    ) {
      countFilesInThisDir = 0;
      dir = dir.cwd("subdir");
    }
  }
};

export const startTimer = (
  startMessage: string,
): (() => number) => {
  const start = Date.now();
  process.stdout.write(`${startMessage} ... `);

  return (): number => {
    const time = Date.now() - start;
    console.log(`${time}ms`);
    return time;
  };
};

export const waitAWhile = (): Promise<void> =>
  new Promise((resolve) => {
    console.log("Waiting 5s to allow hardware buffers be emptied...");
    setTimeout(resolve, 5000);
  });

export const exec = async (command: string): Promise<string> => {
  const { stdout } = await execAsync("sh", ["-c", command]);
  return stdout;
};

export const showMemoryUsage = (): void => {
  const used = process.memoryUsage();
  for (const [key, value] of Object.entries(used)) {
    console.log(`${key} ${Math.round((value / 1024 / 1024) * 100) / 100} MB`);
  }
};

export const cleanAfterTest = async (): Promise<void> => {
  console.log("Cleaning up after test...");
  await jetpack.removeAsync(testDirPath());
};
