const path = require("node:path");
const { readFile, writeFile } = require("node:fs/promises");

const projectRoot = path.resolve(__dirname, "..");
const filePaths = {
  packageJson: path.join(projectRoot, "package.json"),
  packageLock: path.join(projectRoot, "package-lock.json"),
  indexHtml: path.join(projectRoot, "index.html"),
  tauriConfig: path.join(projectRoot, "src-tauri", "tauri.conf.json"),
  cargoToml: path.join(projectRoot, "src-tauri", "Cargo.toml"),
  cargoLock: path.join(projectRoot, "src-tauri", "Cargo.lock"),
};
const releaseTypes = new Set(["patch", "minor", "major"]);
const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function parseVersion(version) {
  const match = semverPattern.exec(version);

  if (!match) {
    throw new Error(`올바른 Semantic Version이 아닙니다: ${version}`);
  }

  return match.slice(1).map(Number);
}

function incrementVersion(version, releaseType) {
  if (!releaseTypes.has(releaseType)) {
    throw new Error(`지원하지 않는 버전 증가 유형입니다: ${releaseType}`);
  }

  let [major, minor, patch] = parseVersion(version);

  if (releaseType === "major") {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (releaseType === "minor") {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }

  if (![major, minor, patch].every(Number.isSafeInteger)) {
    throw new Error("버전 숫자가 JavaScript의 안전한 정수 범위를 벗어났습니다.");
  }

  return `${major}.${minor}.${patch}`;
}

function formatJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function getIndexAssetVersion(content) {
  const match = content.match(
    /<script type="module" src="\.\/js\/app\.js\?v=([^"]+)"><\/script>/
  );

  if (!match) {
    throw new Error("index.html의 app.js asset version을 찾을 수 없습니다.");
  }

  return match[1];
}

function setIndexAssetVersion(content, nextVersion) {
  return content.replace(
    /(<script type="module" src="\.\/js\/app\.js\?v=)[^"]+("><\/script>)/,
    `$1${nextVersion}$2`
  );
}

function getCargoPackageVersion(content, fileName) {
  const packageSection = content.match(/\[package\]([\s\S]*?)(?=\r?\n\[|$)/);
  const versionMatch = packageSection?.[1].match(
    /^version\s*=\s*"([^"]+)"\s*$/m
  );

  if (!versionMatch) {
    throw new Error(`${fileName}의 package version을 찾을 수 없습니다.`);
  }

  return versionMatch[1];
}

function setCargoPackageVersion(content, nextVersion, fileName) {
  const packageSectionPattern = /\[package\]([\s\S]*?)(?=\r?\n\[|$)/;
  const packageSection = content.match(packageSectionPattern);

  if (!packageSection) {
    throw new Error(`${fileName}의 [package] 섹션을 찾을 수 없습니다.`);
  }

  const updatedSection = packageSection[0].replace(
    /^version\s*=\s*"[^"]+"\s*$/m,
    `version = "${nextVersion}"`
  );

  if (updatedSection === packageSection[0]) {
    throw new Error(`${fileName}의 package version을 변경하지 못했습니다.`);
  }

  return content.replace(packageSectionPattern, updatedSection);
}

function getCargoLockAppVersion(content) {
  const matches = [
    ...content.matchAll(
      /\[\[package\]\]\r?\nname = "app"\r?\nversion = "([^"]+)"/g
    ),
  ];

  if (matches.length !== 1) {
    throw new Error("Cargo.lock의 app package version을 정확히 찾지 못했습니다.");
  }

  return matches[0][1];
}

function setCargoLockAppVersion(content, nextVersion) {
  return content.replace(
    /(\[\[package\]\]\r?\nname = "app"\r?\nversion = ")[^"]+("\r?\n)/,
    `$1${nextVersion}$2`
  );
}

async function loadVersionFiles() {
  const entries = await Promise.all(
    Object.entries(filePaths).map(async ([key, filePath]) => [
      key,
      await readFile(filePath, "utf8"),
    ])
  );

  return Object.fromEntries(entries);
}

function prepareVersionUpdate(contents, releaseType) {
  const packageJson = JSON.parse(contents.packageJson);
  const packageLock = JSON.parse(contents.packageLock);
  const tauriConfig = JSON.parse(contents.tauriConfig);
  const currentVersion = packageJson.version;

  parseVersion(currentVersion);

  const synchronizedVersions = {
    "package-lock.json": packageLock.version,
    "package-lock.json packages[\"\"]": packageLock.packages?.[""]?.version,
    "index.html asset version": getIndexAssetVersion(contents.indexHtml),
    "src-tauri/tauri.conf.json": tauriConfig.version,
    "src-tauri/Cargo.toml": getCargoPackageVersion(
      contents.cargoToml,
      "Cargo.toml"
    ),
    "src-tauri/Cargo.lock": getCargoLockAppVersion(contents.cargoLock),
  };

  for (const [fileName, version] of Object.entries(synchronizedVersions)) {
    if (version !== currentVersion) {
      throw new Error(
        `버전 불일치: package.json=${currentVersion}, ${fileName}=${version}`
      );
    }
  }

  const nextVersion = incrementVersion(currentVersion, releaseType);

  packageJson.version = nextVersion;
  packageLock.version = nextVersion;
  packageLock.packages[""].version = nextVersion;
  tauriConfig.version = nextVersion;

  return {
    currentVersion,
    nextVersion,
    updatedContents: {
      packageJson: formatJson(packageJson),
      packageLock: formatJson(packageLock),
      indexHtml: setIndexAssetVersion(contents.indexHtml, nextVersion),
      tauriConfig: formatJson(tauriConfig),
      cargoToml: setCargoPackageVersion(
        contents.cargoToml,
        nextVersion,
        "Cargo.toml"
      ),
      cargoLock: setCargoLockAppVersion(contents.cargoLock, nextVersion),
    },
  };
}

async function writeVersionFiles(originalContents, updatedContents) {
  const writtenKeys = [];

  try {
    for (const key of Object.keys(filePaths)) {
      await writeFile(filePaths[key], updatedContents[key], "utf8");
      writtenKeys.push(key);
    }
  } catch (error) {
    await Promise.allSettled(
      writtenKeys.map((key) =>
        writeFile(filePaths[key], originalContents[key], "utf8")
      )
    );
    throw error;
  }
}

async function run() {
  const releaseType = process.argv[2];

  if (!releaseTypes.has(releaseType)) {
    throw new Error("사용법: node scripts/version.js <patch|minor|major>");
  }

  const originalContents = await loadVersionFiles();
  const { currentVersion, nextVersion, updatedContents } =
    prepareVersionUpdate(originalContents, releaseType);

  await writeVersionFiles(originalContents, updatedContents);

  console.log(`버전 증가 완료: ${currentVersion} → ${nextVersion}`);
  console.log("동기화: package.json, package-lock.json, index.html, tauri.conf.json, Cargo.toml, Cargo.lock");
}

if (require.main === module) {
  run().catch((error) => {
    console.error("버전 증가에 실패했습니다.");
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  incrementVersion,
  parseVersion,
  prepareVersionUpdate,
};
