export class UpdateUI {
  constructor() {
    this.panel = document.getElementById("updatePanel");
    this.currentVersion = document.getElementById(
      "updateCurrentVersion"
    );
    this.nextVersion = document.getElementById("updateNextVersion");
    this.status = document.getElementById("updateStatus");
    this.installBtn = document.getElementById("installUpdateBtn");
    this.laterBtn = document.getElementById("laterUpdateBtn");

    this.onInstall = null;
    this.onLater = null;
    this.isInstalling = false;
    this.downloadedBytes = 0;
    this.contentLength = null;

    this.bindEvents();
  }

  bindEvents() {
    this.installBtn.addEventListener("click", () => {
      this.onInstall?.();
    });

    this.laterBtn.addEventListener("click", () => {
      this.onLater?.();
    });

    this.panel.addEventListener("click", (event) => {
      if (event.target === this.panel && !this.isInstalling) {
        this.onLater?.();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (
        event.key === "Escape" &&
        !this.panel.hidden &&
        !this.isInstalling
      ) {
        this.onLater?.();
      }
    });
  }

  open(currentVersion, nextVersion) {
    this.currentVersion.textContent = currentVersion;
    this.nextVersion.textContent = nextVersion;
    this.status.textContent = "";
    this.status.hidden = true;
    this.panel.hidden = false;
    this.installBtn.focus();
  }

  close() {
    this.panel.hidden = true;
  }

  setInstalling() {
    this.isInstalling = true;
    this.downloadedBytes = 0;
    this.contentLength = null;
    this.installBtn.disabled = true;
    this.laterBtn.disabled = true;
    this.status.hidden = false;
    this.status.textContent = "업데이트를 다운로드하고 있습니다...";
  }

  updateProgress(event) {
    if (event.event === "Started") {
      this.contentLength = event.data.contentLength ?? null;
      return;
    }

    if (event.event === "Progress") {
      this.downloadedBytes += event.data.chunkLength;

      if (this.contentLength > 0) {
        const percent = Math.min(
          100,
          Math.round((this.downloadedBytes / this.contentLength) * 100)
        );
        this.status.textContent = `업데이트 다운로드 중... ${percent}%`;
      }
      return;
    }

    if (event.event === "Finished") {
      this.status.textContent = "업데이트를 설치하고 있습니다...";
    }
  }

  setRestarting() {
    this.status.textContent = "업데이트를 적용하고 다시 시작합니다...";
  }

  showInstallError() {
    this.isInstalling = false;
    this.installBtn.disabled = false;
    this.laterBtn.disabled = false;
    this.status.hidden = false;
    this.status.textContent =
      "업데이트를 설치하지 못했습니다. 잠시 후 다시 시도해주세요.";
    this.installBtn.focus();
  }
}
