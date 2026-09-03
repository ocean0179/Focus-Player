const UPDATE_CHECK_DELAY_MS = 1200;

function getTauriCore() {
  const core = window.__TAURI__?.core;

  if (
    typeof core?.invoke !== "function" ||
    typeof core?.Channel !== "function"
  ) {
    return null;
  }

  return core;
}

function createUpdate(core, metadata) {
  return {
    ...metadata,
    async close() {
      await core.invoke("plugin:resources|close", {
        rid: metadata.rid,
      });
    },
    async downloadAndInstall(onEvent) {
      const channel = new core.Channel();
      channel.onmessage = onEvent;

      await core.invoke("plugin:updater|download_and_install", {
        onEvent: channel,
        rid: metadata.rid,
      });
    },
  };
}

async function checkForUpdate(core) {
  const metadata = await core.invoke("plugin:updater|check", {});
  return metadata ? createUpdate(core, metadata) : null;
}

async function relaunch(core) {
  await core.invoke("plugin:process|restart");
}

export function initializeUpdater(updateUI) {
  const core = getTauriCore();

  if (!core) {
    return false;
  }

  let pendingUpdate = null;
  let isInstalling = false;

  updateUI.onLater = async () => {
    if (isInstalling) {
      return;
    }

    updateUI.close();

    try {
      await pendingUpdate?.close();
    } catch (error) {
      console.warn("업데이트 리소스를 정리하지 못했습니다.", error);
    } finally {
      pendingUpdate = null;
    }
  };

  updateUI.onInstall = async () => {
    if (!pendingUpdate || isInstalling) {
      return;
    }

    isInstalling = true;
    updateUI.setInstalling();

    try {
      await pendingUpdate.downloadAndInstall((event) => {
        updateUI.updateProgress(event);
      });

      updateUI.setRestarting();
      await relaunch(core);
    } catch (error) {
      console.error("업데이트를 설치하지 못했습니다.", error);
      isInstalling = false;
      updateUI.showInstallError();
    }
  };

  window.setTimeout(async () => {
    try {
      pendingUpdate = await checkForUpdate(core);

      if (pendingUpdate) {
        updateUI.open(
          pendingUpdate.currentVersion,
          pendingUpdate.version
        );
      }
    } catch (error) {
      console.warn("업데이트 확인을 건너뜁니다.", error);
    }
  }, UPDATE_CHECK_DELAY_MS);

  return true;
}
