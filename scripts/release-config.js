const GITHUB_OWNER = "ocean0179";
const GITHUB_REPOSITORY = "Focus-Player";

function getReleaseTag(version) {
  return `v${version}`;
}

function getGitHubReleaseBaseUrl(version) {
  return `https://github.com/${GITHUB_OWNER}/${GITHUB_REPOSITORY}/releases/download/${getReleaseTag(version)}`;
}

function getLatestManifestEndpoint() {
  return `https://github.com/${GITHUB_OWNER}/${GITHUB_REPOSITORY}/releases/latest/download/latest.json`;
}

function getGitHubAssetFileName(fileName) {
  return fileName.trim().replace(/\s+/g, ".");
}

module.exports = {
  GITHUB_OWNER,
  GITHUB_REPOSITORY,
  getGitHubReleaseBaseUrl,
  getGitHubAssetFileName,
  getLatestManifestEndpoint,
  getReleaseTag,
};
