export async function initializeAppVersion(element) {
  if (!element) {
    return false;
  }

  const getVersion = window.__TAURI__?.app?.getVersion;

  if (typeof getVersion !== "function") {
    element.textContent = "Focus Player · Web";
    return false;
  }

  try {
    const version = await getVersion();
    element.textContent = `Focus Player v${version}`;
    return true;
  } catch (error) {
    element.textContent = "Focus Player";
    console.warn("앱 버전을 불러오지 못했습니다.", error);
    return false;
  }
}
