import { TIMER_STATE } from "./config/constants.js";

export class UI {
  constructor() {
    this.timer = document.getElementById("timer");
    this.sessionMode = document.getElementById("sessionMode");
    this.sessionCount = document.getElementById("sessionCount");
    this.todayFocusTime = document.getElementById("todayFocusTime");
    this.sessionMessage = document.getElementById("sessionMessage");
    this.sessionMessageTimeoutId = null;

    this.startBtn = document.getElementById("startBtn");
    this.pauseBtn = document.getElementById("pauseBtn");
    this.endBtn = document.getElementById("endBtn");

    this.trackTitle = document.getElementById("trackTitle");

    this.prevBtn = document.getElementById("prevBtn");
    this.playPauseBtn = document.getElementById("playPauseBtn");
    this.nextBtn = document.getElementById("nextBtn");

    this.volumeSlider = document.getElementById("volumeSlider");
    this.volumeValue = document.getElementById("volumeValue");

    this.settingsBtn = document.getElementById("settingsBtn");
    this.settingsPanel = document.getElementById("settingsPanel");

    this.focusDurationInput =
      document.getElementById("focusDurationInput");

    this.breakDurationInput =
      document.getElementById("breakDurationInput");

    this.autoStartBreakInput =
      document.getElementById("autoStartBreakInput");

    this.autoStartFocusInput =
      document.getElementById("autoStartFocusInput");

    this.saveSettingsBtn =
      document.getElementById("saveSettingsBtn");

    this.closeSettingsBtn =
      document.getElementById("closeSettingsBtn");

    this.statsBtn = document.getElementById("statsBtn");
    this.statsPanel = document.getElementById("statsPanel");
    this.statsList = document.getElementById("statsList");
    this.closeStatsBtn = document.getElementById("closeStatsBtn");  

    this.weeklyChart = document.getElementById("weeklyChart");

    this.setupUtilityPanels();
  }

  updateTimer(seconds) {
    this.timer.textContent = this.formatTime(seconds);
  }

  updateSessionMode(type) {
    this.sessionMode.textContent = type.toUpperCase();
  }

  updateSessionCount(count) {
    this.sessionCount.textContent = `Session ${count}`;
  }

  updateSessionMessage(message) {
    if (!this.sessionMessage) {
      return;
    }

    if (this.sessionMessageTimeoutId !== null) {
      clearTimeout(this.sessionMessageTimeoutId);
      this.sessionMessageTimeoutId = null;
    }

    this.sessionMessage.textContent = message;

    if (message === "") {
      return;
    }

    this.sessionMessageTimeoutId = setTimeout(() => {
      this.sessionMessage.textContent = "";
      this.sessionMessageTimeoutId = null;
    }, 3000);
  }

  updateTodayFocusTime(seconds) {
    this.todayFocusTime.textContent = `Today ${this.formatTime(seconds)}`;
  }

  updateTrackTitle(title) {
    this.trackTitle.textContent = title;
  }

  updatePlayerControlsEnabled(enabled) {
    this.prevBtn.disabled = !enabled;
    this.playPauseBtn.disabled = !enabled;
    this.nextBtn.disabled = !enabled;

    if (!enabled) {
      this.playPauseBtn.textContent = "재생";
    }
  }

  updateVolume(volume) {
    this.volumeSlider.value = volume;
    this.volumeValue.textContent = volume;

    this.volumeSlider.style.setProperty(
      "--volume-percent",
      `${volume}%`
    );
  }

  updateTimerControls(state) {
    if (state === TIMER_STATE.RUNNING) {
      this.startBtn.textContent = "실행 중";
      this.startBtn.disabled = true;

      this.pauseBtn.textContent = "일시정지";
      this.pauseBtn.disabled = false;

      return;
    }

    if (state === TIMER_STATE.PAUSED) {
      this.startBtn.textContent = "계속";
      this.startBtn.disabled = false;

      this.pauseBtn.textContent = "일시정지";
      this.pauseBtn.disabled = true;

      return;
    }

    this.startBtn.textContent = "시작";
    this.startBtn.disabled = false;

    this.pauseBtn.textContent = "일시정지";
    this.pauseBtn.disabled = true;
  }


  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  }

  openSettings(settings) {
    this.focusDurationInput.value =
      settings.focusDuration / 60;

    this.breakDurationInput.value =
      settings.breakDuration / 60;

    this.autoStartBreakInput.checked =
      settings.autoStartBreak;

    this.autoStartFocusInput.checked =
      settings.autoStartFocus;

    this.closeStats();
    this.settingsPanel.hidden = false;
    this.settingsBtn.setAttribute("aria-expanded", "true");
    this.closeSettingsBtn.focus();
  }

  closeSettings() {
    this.settingsPanel.hidden = true;
    this.settingsBtn.setAttribute("aria-expanded", "false");
  }

  openStats(records) {
    this.statsList.innerHTML = "";

    records.forEach((record) => {
      const item = document.createElement("div");

      item.className = "stats-item";

      item.innerHTML = `
        <span>${record.date}</span>
        <span>${this.formatTime(record.totalFocusTime)}</span>
        <span>${record.completedSessions} sessions</span>
      `;

      this.statsList.appendChild(item);
    });

    this.closeSettings();
    this.statsPanel.hidden = false;
    this.statsBtn.setAttribute("aria-expanded", "true");
    this.closeStatsBtn.focus();
  }

  closeStats() {
    this.statsPanel.hidden = true;
    this.statsBtn.setAttribute("aria-expanded", "false");
  }

  setupUtilityPanels() {
    [this.settingsPanel, this.statsPanel].forEach((panel) => {
      panel.addEventListener("click", (event) => {
        if (event.target !== panel) return;

        if (panel === this.settingsPanel) {
          this.closeSettings();
          return;
        }

        this.closeStats();
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;

      if (!this.settingsPanel.hidden) {
        this.closeSettings();
        this.settingsBtn.focus();
        return;
      }

      if (!this.statsPanel.hidden) {
        this.closeStats();
        this.statsBtn.focus();
      }
    });
  }

  renderWeeklyChart(records) {
    this.weeklyChart.innerHTML = "";

    records.forEach((record) => {
      const item = document.createElement("div");
      item.className = "chart-item";
      item.classList.toggle("today", record.isToday);

      const focusTime = this.formatTime(record.totalFocusTime);
      const tooltipText = `${record.date} · 집중 ${focusTime} · ${record.completedSessions} sessions`;

      item.tabIndex = 0;
      item.setAttribute("aria-label", tooltipText);

      const barWrapper = document.createElement("div");
      barWrapper.className = "chart-bar-wrapper";

      const bar = document.createElement("div");
      bar.className = "chart-bar";
      bar.style.height = `${record.heightPercent}%`;

      const label = document.createElement("span");
      label.className = "chart-label";
      label.textContent = record.isToday
        ? `${record.date.slice(8)} 오늘`
        : record.date.slice(8);

      const tooltip = document.createElement("div");
      tooltip.className = "chart-tooltip";
      tooltip.setAttribute("aria-hidden", "true");

      const tooltipDate = document.createElement("strong");
      tooltipDate.textContent = record.date;

      const tooltipFocusTime = document.createElement("span");
      tooltipFocusTime.textContent = `집중 ${focusTime}`;

      const tooltipSessions = document.createElement("span");
      tooltipSessions.textContent = `${record.completedSessions} sessions`;

      tooltip.appendChild(tooltipDate);
      tooltip.appendChild(tooltipFocusTime);
      tooltip.appendChild(tooltipSessions);

      barWrapper.appendChild(bar);
      item.appendChild(tooltip);
      item.appendChild(barWrapper);
      item.appendChild(label);

      this.weeklyChart.appendChild(item);
    });
  }
}
