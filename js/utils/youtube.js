const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
]);

const SHORT_YOUTUBE_HOSTS = new Set([
  "youtu.be",
  "www.youtu.be",
]);

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function extractYouTubeVideoId(input) {
  if (typeof input !== "string" || input.trim() === "") {
    return null;
  }

  let url;

  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return null;
  }

  const host = url.hostname.toLowerCase();
  let videoId = null;

  if (SHORT_YOUTUBE_HOSTS.has(host)) {
    videoId = getShortUrlVideoId(url.pathname);
  } else if (YOUTUBE_HOSTS.has(host)) {
    videoId = getYouTubeUrlVideoId(url);
  }

  return isValidVideoId(videoId) ? videoId : null;
}

function getYouTubeUrlVideoId(url) {
  const pathSegments = getPathSegments(url.pathname);

  if (pathSegments.length === 1 && pathSegments[0] === "watch") {
    return url.searchParams.get("v");
  }

  if (
    pathSegments.length === 2 &&
    (pathSegments[0] === "shorts" ||
      pathSegments[0] === "embed")
  ) {
    return pathSegments[1];
  }

  return null;
}

function getShortUrlVideoId(pathname) {
  const pathSegments = getPathSegments(pathname);

  return pathSegments.length === 1 ? pathSegments[0] : null;
}

function getPathSegments(pathname) {
  return pathname.split("/").filter(Boolean);
}

function isValidVideoId(videoId) {
  return (
    typeof videoId === "string" &&
    VIDEO_ID_PATTERN.test(videoId)
  );
}
