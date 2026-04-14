import {
  prepareJetpackTestDir,
  prepareFiles,
  startTimer,
  waitAWhile,
  showMemoryUsage,
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

  let timer = startTimer("jetpack.inspectTree()");
  const tree = dirJet.inspectTree(".", { checksum: "md5" });
  timer();
  console.log("md5", tree?.md5);
  showMemoryUsage();

  await waitAWhile();

  timer = startTimer("jetpack.inspectTreeAsync()");
  const treeAsync = await dirJet.inspectTreeAsync(".", { checksum: "md5" });
  timer();
  console.log("md5", treeAsync?.md5);
  showMemoryUsage();

  await cleanAfterTest();
};

const testConfigs: TestConfig[] = [
  { files: 10_000, filesPerNestedDir: 1000, size: 1000 },
  { files: 1000, filesPerNestedDir: 50, size: 10_000_000 },
];

const runNext = async (): Promise<void> => {
  for (const config of testConfigs) {
    await test(config);
  }
};

runNext().catch(console.error);
