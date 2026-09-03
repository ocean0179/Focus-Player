const path = require("node:path");
const { mkdir, readFile, writeFile } = require("node:fs/promises");
const {
  getGitHubReleaseBaseUrl,
  getReleaseTag,
} = require("./release-config.js");

const projectRoot = path.resolve(__dirname, "..");
const bundleRoot = path.join(projectRoot, "src-tauri", "target", "release", "bundle");
const outputPath = path.join(projectRoot, "release", "latest.json");

function getReleaseAssetUrl(baseUrl, fileName) {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  return `${normalizedBaseUrl}/${encodeURIComponent(fileName)}`;
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

  const installerName = `Focus Player_${version}_x64-setup.exe`;
  const installerPath = path.join(bundleRoot, "nsis", installerName);
  const signaturePath = `${installerPath}.sig`;
  const signature = (await readFile(signaturePath, "utf8")).trim();

  if (!signature) {
    throw new Error(`Updater signature가 비어 있습니다: ${signaturePath}`);
  }

  const manifest = {
    version,
    notes: process.env.FOCUS_PLAYER_RELEASE_NOTES?.trim() || "",
    pub_date: new Date().toISOString(),
    platforms: {
      "windows-x86_64": {
        signature,
        url: getReleaseAssetUrl(baseUrl, installerName),
      },
    },
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Updater manifest 생성 완료: ${outputPath}`);
  console.log(`Release tag: ${tag}`);
  console.log(`Release asset base URL: ${baseUrl}`);
  console.log(`Updater artifact: ${installerPath}`);
}

if (require.main === module) {
  createManifest().catch((error) => {
    console.error("Updater manifest 생성에 실패했습니다.");
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { createManifest, getReleaseAssetUrl };
