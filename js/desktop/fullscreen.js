function getCurrentTauriWindow() {
  const windowApi = window.__TAURI__?.window;

  if (typeof windowApi?.getCurrentWindow !== "function") {
    return null;
  }

  return windowApi.getCurrentWindow();
}

export function initializeFullscreenShortcut() {
  const appWindow = getCurrentTauriWindow();

  if (!appWindow) {
    return;
  }

  let isToggling = false;

  window.addEventListener("keydown", async (event) => {
    if (event.key !== "F11" || event.repeat) {
      return;
    }

    event.preventDefault();

    if (isToggling) {
      return;
    }

    isToggling = true;

    try {
      const isFullscreen = await appWindow.isFullscreen();
      await appWindow.setFullscreen(!isFullscreen);
    } catch (error) {
      console.error("전체화면 상태를 변경하지 못했습니다.", error);
    } finally {
      isToggling = false;
    }
  });
}
