import {
  prepareJetpackTestDir,
  prepareFiles,
  startTimer,
  waitAWhile,
  exec,
  cleanAfterTest,
} from "./utils.js";

const testDir = prepareJetpackTestDir();
const toCopyDir = testDir.dir("to-copy");

type TestConfig = {
  files: number;
  size: number;
};

const test = async (testConfig: TestConfig): Promise<void> => {
  console.log("");

  await prepareFiles(toCopyDir, testConfig);
  await waitAWhile();

  let timer = startTimer("jetpack.copy()");
  toCopyDir.copy(".", testDir.path("copied-jetpack-sync"));
  timer();

  await waitAWhile();

  timer = startTimer("jetpack.copyAsync()");
  await toCopyDir.copyAsync(".", testDir.path("copied-jetpack-async"));
  timer();

  await waitAWhile();

  timer = startTimer("Native cp -R");
  await exec(`cp -R ${toCopyDir.path()} ${testDir.path("copied-native")}`);
  timer();

  await cleanAfterTest();
};

const testConfigs: TestConfig[] = [
  { files: 10_000, size: 1000 },
  { files: 50, size: 10_000_000 },
];

const runNext = async (): Promise<void> => {
  for (const config of testConfigs) {
    await test(config);
  }
};

runNext().catch(console.error);
