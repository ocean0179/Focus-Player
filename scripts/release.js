const path = require("node:path");
const { readFileSync } = require("node:fs");
const { spawnSync } = require("node:child_process");

const projectRoot = path.resolve(__dirname, "..");
const releaseType = process.argv[2];
const releaseTypes = new Set(["patch", "minor", "major"]);

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: "inherit",
    shell: false,
  });

  if (result.error) {
    throw result.error;
  }

  return result.status ?? 1;
}

function readCurrentVersion() {
  const packageJson = JSON.parse(
    readFileSync(path.join(projectRoot, "package.json"), "utf8")
  );

  return packageJson.version;
}

if (!releaseTypes.has(releaseType)) {
  console.error("사용법: node scripts/release.js <patch|minor|major>");
  process.exit(1);
}

console.log(`[1/3] ${releaseType} 버전 증가`);

const versionStatus = runCommand(process.execPath, [
  path.join(__dirname, "version.js"),
  releaseType,
]);

if (versionStatus !== 0) {
  console.error("Release 중단: 버전 증가 단계가 실패했습니다.");
  process.exit(versionStatus);
}

const nextVersion = readCurrentVersion();

console.log(`[2/3] Focus Player ${nextVersion} release build`);

const isWindows = process.platform === "win32";
const npmCommand = isWindows ? process.env.ComSpec : "npm";
const npmArguments = isWindows
  ? ["/d", "/s", "/c", "npm run build:app"]
  : ["run", "build:app"];
const buildStatus = runCommand(npmCommand, npmArguments);

if (buildStatus !== 0) {
  console.error(`Release build 실패: 버전 파일은 ${nextVersion}으로 증가한 상태입니다.`);
  process.exit(buildStatus);
}

console.log(`[3/3] Focus Player ${nextVersion} updater manifest 생성`);
const manifestStatus = runCommand(process.execPath, [
  path.join(__dirname, "generate-update-manifest.js"),
]);

if (manifestStatus !== 0) {
  console.error(
    `Release manifest 생성 실패: ${nextVersion} build와 updater artifact는 생성된 상태입니다.`
  );
  process.exit(manifestStatus);
}

console.log(`Release 완료: Focus Player ${nextVersion}`);
