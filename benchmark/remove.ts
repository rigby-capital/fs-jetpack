import {
  prepareJetpackTestDir,
  prepareFiles,
  startTimer,
  waitAWhile,
  exec,
  cleanAfterTest,
} from "./utils.js";

const testDir = prepareJetpackTestDir();

type TestConfig = {
  files: number;
  size: number;
};

const test = async (testConfig: TestConfig): Promise<void> => {
  const dirJet = testDir.dir("to-be-removed-by-jetpack");
  const dirNative = testDir.dir("to-be-removed-by-native");

  console.log("");

  await prepareFiles(dirJet, testConfig);
  await prepareFiles(dirNative, testConfig);
  await waitAWhile();

  let timer = startTimer("jetpack.removeAsync()");
  await dirJet.removeAsync();
  timer();

  await waitAWhile();

  timer = startTimer("Native rm -rf");
  await exec(`rm -rf ${dirNative.path()}`);
  timer();

  await cleanAfterTest();
};

const testConfigs: TestConfig[] = [
  { files: 10_000, size: 1000 },
];

const runNext = async (): Promise<void> => {
  for (const config of testConfigs) {
    await test(config);
  }
};

runNext().catch(console.error);
