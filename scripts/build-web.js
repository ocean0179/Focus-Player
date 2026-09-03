const path = require("node:path");
const {
  access,
  cp,
  mkdir,
  rm,
} = require("node:fs/promises");

const projectRoot = path.resolve(__dirname, "..");
const distDirectory = path.join(projectRoot, "dist");
const staticEntries = [
  "index.html",
  "css",
  "js",
  "data",
  "assets",
];

function assertSafeDistPath() {
  const isDirectChild = path.dirname(distDirectory) === projectRoot;
  const hasExpectedName = path.basename(distDirectory) === "dist";

  if (!isDirectChild || !hasExpectedName) {
    throw new Error(`안전하지 않은 dist 경로입니다: ${distDirectory}`);
  }
}

async function validateSources() {
  await Promise.all(
    staticEntries.map(async (entry) => {
      const sourcePath = path.join(projectRoot, entry);

      try {
        await access(sourcePath);
      } catch {
        throw new Error(`필수 웹 자산을 찾을 수 없습니다: ${entry}`);
      }
    })
  );
}

async function copyStaticEntry(entry) {
  const sourcePath = path.join(projectRoot, entry);
  const destinationPath = path.join(distDirectory, entry);

  await cp(sourcePath, destinationPath, {
    recursive: true,
    force: true,
  });

  console.log(`복사 완료: ${entry}`);
}

async function buildWeb() {
  assertSafeDistPath();
  await validateSources();

  await rm(distDirectory, { recursive: true, force: true });
  await mkdir(distDirectory);

  for (const entry of staticEntries) {
    await copyStaticEntry(entry);
  }

  await access(path.join(distDirectory, "index.html"));
  console.log(`웹 배포 파일 준비 완료: ${distDirectory}`);
}

buildWeb().catch((error) => {
  console.error("웹 배포 파일 준비에 실패했습니다.");
  console.error(error.message);
  process.exitCode = 1;
});
