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
  filesPerNestedDir: number;
  size: number;
};

const test = async (testConfig: TestConfig): Promise<void> => {
  const dirJet = testDir.dir("some-tree");

  console.log("");

  await prepareFiles(dirJet, testConfig);
  await waitAWhile();

  let timer = startTimer("jetpack.find()");
  dirJet.find(".", { matching: "1*.txt" });
  timer();

  timer = startTimer("jetpack.findAsync()");
  await dirJet.findAsync(".", { matching: "1*.txt" });
  timer();

  timer = startTimer("native find");
  await exec(`find ${dirJet.path()} -name '1*.txt'`);
  timer();

  await cleanAfterTest();
};

const testConfigs: TestConfig[] = [
  { files: 10_000, filesPerNestedDir: 1000, size: 100 },
];

const runNext = async (): Promise<void> => {
  for (const config of testConfigs) {
    await test(config);
  }
};

runNext().catch(console.error);
