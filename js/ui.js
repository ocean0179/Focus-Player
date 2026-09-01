import { TIMER_STATE } from "./config/constants.js";

export class UI {
  constructor() {
    this.timer = document.getElementById("timer");
    this.sessionMode = document.getElementById("sessionMode");
    this.sessionCount = document.getElementById("sessionCount");
    this.todayFocusTime = document.getElementById("todayFocusTime");

    this.startBtn = document.getElementById("startBtn");
    this.pauseBtn = document.getElementById("pauseBtn");
    this.endBtn = document.getElementById("endBtn");

    this.trackTitle = document.getElementById("trackTitle");

    this.prevBtn = document.getElementById("prevBtn");
    this.playPauseBtn = document.getElementById("playPauseBtn");
    this.nextBtn = document.getElementById("nextBtn");

    this.volumeSlider = document.getElementById("volumeSlider");
    this.volumeValue = document.getElementById("volumeValue");

    this.playlistButtons = document.querySelectorAll(
      "[data-playlist]"
    );

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
    const messageElement = document.getElementById("sessionMessage");

    if (!messageElement) {
      return;
    }

    messageElement.textContent = message;
  }

  updateTodayFocusTime(seconds) {
    this.todayFocusTime.textContent = `Today ${this.formatTime(seconds)}`;
  }

  updateTrackTitle(title) {
    this.trackTitle.textContent = title;
  }

  updatePlaylistSelection(selectedKey) {
    this.playlistButtons.forEach((button) => {
      const isSelected =
        button.dataset.playlist === selectedKey;

      button.classList.toggle("selected", isSelected);
    });
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

    this.settingsPanel.hidden = false;
  }

  closeSettings() {
    this.settingsPanel.hidden = true;
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

    this.statsPanel.hidden = false;
  }

  closeStats() {
    this.statsPanel.hidden = true;
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
