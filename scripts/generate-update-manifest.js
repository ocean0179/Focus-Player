const path = require("node:path");
const {
  access,
  copyFile,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} = require("node:fs/promises");
const {
  getGitHubAssetFileName,
  getGitHubReleaseBaseUrl,
  getReleaseTag,
} = require("./release-config.js");

const projectRoot = path.resolve(__dirname, "..");
const bundleRoot = path.join(projectRoot, "src-tauri", "target", "release", "bundle");
const nsisDirectory = path.join(bundleRoot, "nsis");
const releaseDirectory = path.join(projectRoot, "release");
const outputPath = path.join(releaseDirectory, "latest.json");

function getReleaseAssetUrl(baseUrl, fileName) {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  return `${normalizedBaseUrl}/${encodeURIComponent(fileName)}`;
}

function includesVersion(fileName, version) {
  const escapedVersion = version.replace(/\./g, "\\.");
  return new RegExp(`(^|[^0-9])${escapedVersion}([^0-9]|$)`).test(fileName);
}

async function findNsisArtifact(version) {
  const entries = await readdir(nsisDirectory, { withFileTypes: true });
  const candidates = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.toLowerCase().endsWith(".exe") &&
        includesVersion(entry.name, version)
    )
    .map((entry) => entry.name);

  if (candidates.length === 0) {
    throw new Error(
      `버전 ${version}의 NSIS installer를 찾을 수 없습니다: ${nsisDirectory}`
    );
  }

  if (candidates.length > 1) {
    throw new Error(
      `버전 ${version}의 NSIS installer가 여러 개입니다: ${candidates.join(", ")}`
    );
  }

  const installerPath = path.join(nsisDirectory, candidates[0]);
  const signaturePath = `${installerPath}.sig`;

  try {
    await access(signaturePath);
  } catch {
    throw new Error(`NSIS updater signature를 찾을 수 없습니다: ${signaturePath}`);
  }

  return {
    installerName: candidates[0],
    installerPath,
    signaturePath,
  };
}

function assertSafeReleasePath() {
  if (
    path.dirname(releaseDirectory) !== projectRoot ||
    path.basename(releaseDirectory) !== "release"
  ) {
    throw new Error(`안전하지 않은 release 경로입니다: ${releaseDirectory}`);
  }
}

async function createManifest() {
  const packageJson = JSON.parse(
    await readFile(path.join(projectRoot, "package.json"), "utf8")
  );
  const version = packageJson.version;
  const tag = getReleaseTag(version);
  const baseUrl =
    process.env.FOCUS_PLAYER_UPDATE_BASE_URL?.trim() ||
    getGitHubReleaseBaseUrl(version);

  let parsedBaseUrl;
  try {
    parsedBaseUrl = new URL(baseUrl);
  } catch {
    throw new Error("FOCUS_PLAYER_UPDATE_BASE_URL이 올바른 URL이 아닙니다.");
  }

  if (parsedBaseUrl.protocol !== "https:") {
    throw new Error("Updater asset URL은 HTTPS를 사용해야 합니다.");
  }

  const { installerName, installerPath, signaturePath } =
    await findNsisArtifact(version);
  const signature = (await readFile(signaturePath, "utf8")).trim();

  if (!signature) {
    throw new Error(`Updater signature가 비어 있습니다: ${signaturePath}`);
  }

  const releaseAssetName = getGitHubAssetFileName(installerName);
  const releaseSignatureName = `${releaseAssetName}.sig`;
  const releaseInstallerPath = path.join(releaseDirectory, releaseAssetName);
  const releaseSignaturePath = path.join(
    releaseDirectory,
    releaseSignatureName
  );

  const manifest = {
    version,
    notes: process.env.FOCUS_PLAYER_RELEASE_NOTES?.trim() || "",
    pub_date: new Date().toISOString(),
    platforms: {
      "windows-x86_64": {
        signature,
        url: getReleaseAssetUrl(baseUrl, releaseAssetName),
      },
    },
  };

  assertSafeReleasePath();
  await rm(releaseDirectory, { recursive: true, force: true });
  await mkdir(releaseDirectory, { recursive: true });
  await copyFile(installerPath, releaseInstallerPath);
  await copyFile(signaturePath, releaseSignaturePath);
  await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Updater manifest 생성 완료: ${outputPath}`);
  console.log(`Release tag: ${tag}`);
  console.log(`Release asset base URL: ${baseUrl}`);
  console.log(`Tauri NSIS artifact: ${installerPath}`);
  console.log(`GitHub release artifact: ${releaseInstallerPath}`);
  console.log(`GitHub release signature: ${releaseSignaturePath}`);
}

if (require.main === module) {
  createManifest().catch((error) => {
    console.error("Updater manifest 생성에 실패했습니다.");
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  createManifest,
  findNsisArtifact,
  getReleaseAssetUrl,
  includesVersion,
};
