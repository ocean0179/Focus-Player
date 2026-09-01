import { DEFAULT_SETTINGS } from "./config/defaults.js";
import { Timer } from "./timer.js";
import { SessionManager } from "./session.js";
import { UI } from "./ui.js";
import { YouTubePlayer } from "./player.js";
import { PlaylistManager } from "./playlistManager.js";
import { Storage } from "./storage.js";
import { TIMER_STATE } from "./config/constants.js";

const ui = new UI();
const settings = Storage.loadSettings();
const playlistManager = new PlaylistManager();

const sessionManager = new SessionManager(settings);

const history = Storage.loadHistory();
const today = Storage.getToday();

if (!history.dailyHistory[today]) {
  history.dailyHistory[today] = {
    totalFocusTime: 0,
    completedSessions: 0,
  };
}

const timer = new Timer(sessionManager.getCurrentDuration());

let currentPlaylistKey = Storage.loadLastPlaylist();

if (!playlistManager.getPlaylist(currentPlaylistKey)) {
  currentPlaylistKey = "SWM";
}

const player = new YouTubePlayer(
  "youtubePlayer",
  settings.volume
);

ui.updateVolume(settings.volume);

player.onStateChange = (state) => {
  updateCurrentTrackTitle();

  if (state === YT.PlayerState.PLAYING) {
    ui.playPauseBtn.textContent = "일시정지";
    return;
  }

  if (
    state === YT.PlayerState.PAUSED ||
    state === YT.PlayerState.ENDED ||
    state === YT.PlayerState.CUED
  ) {
    ui.playPauseBtn.textContent = "재생";
  }
};

player.onReady = () => {
  changePlaylist(currentPlaylistKey);
};

player.initialize("l5EnBBrt284");

function changePlaylist(playlistKey) {
  const playlist = playlistManager.getPlaylist(playlistKey);

  if (!playlist) {
    return;
  }

  currentPlaylistKey = playlistKey;

  Storage.saveLastPlaylist(currentPlaylistKey);

  const videoIds = playlist.tracks.map(
    (track) => track.videoId
  );

  player.loadPlaylist(videoIds);

  ui.updateTrackTitle(playlist.tracks[0].title);
  ui.updatePlaylistSelection(currentPlaylistKey);
}

function updateCurrentTrackTitle() {
  const index = player.getPlaylistIndex();

  if (index < 0) {
    ui.updateTrackTitle("재생 중인 음악 없음");
    return;
  }

  const playlist = playlistManager.getPlaylist(
    currentPlaylistKey
  );
  const track = playlist?.tracks[index];

  if (!track) {
    ui.updateTrackTitle("알 수 없는 음악");
    return;
  }

  ui.updateTrackTitle(track.title);
}

function saveHistory() {
  Storage.saveHistory(history);
}

function renderSession() {
  ui.updateSessionMode(sessionManager.getCurrentType());
  ui.updateSessionCount(sessionManager.getSessionCount());
  ui.updateTimer(timer.getRemainingTime());
  ui.updateTodayFocusTime(
    history.dailyHistory[today].totalFocusTime
  );
}

function getRecentHistory(days = 7) {
  const records = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date();

    date.setDate(date.getDate() - i);

    const key = Storage.getDateKey(date);

    const record = history.dailyHistory[key] ?? {
      totalFocusTime: 0,
      completedSessions: 0,
    };

    records.push({
      date: key,
      totalFocusTime: record.totalFocusTime,
      completedSessions: record.completedSessions,
    });
  }

  return records;
}

function getWeeklyChartData(days = 7) {
  const records = getRecentHistory(days);

  const maxFocusTime = Math.max(
    ...records.map((record) => record.totalFocusTime),
    1
  );

  return records.map((record) => ({
    ...record,
    isToday: record.date === today,
    heightPercent:
      (record.totalFocusTime / maxFocusTime) * 100,
  }));
}

timer.onTick = (remainingTime) => {
  ui.updateTimer(remainingTime);

  if (
    sessionManager.getCurrentType() === "focus" &&
    timer.getState() === TIMER_STATE.RUNNING
  ) {
    history.dailyHistory[today].totalFocusTime += 1;

    ui.updateTodayFocusTime(history.dailyHistory[today].totalFocusTime);
  }
};

timer.onComplete = () => {
  const completedType = sessionManager.getCurrentType();

  if (completedType === "focus") {
    history.dailyHistory[today].completedSessions += 1;

    ui.updateSessionMessage(
      "집중 세션 완료. 휴식 시간입니다."
    );
  } else {
    ui.updateSessionMessage(
      "휴식 완료. 다음 집중 세션을 시작할 수 있습니다."
    );
  }

  saveHistory();

  sessionManager.moveToNextSession();

  timer.reset(sessionManager.getCurrentDuration());

  renderSession();
  ui.updateTimerControls(timer.getState());

  const nextType = sessionManager.getCurrentType();

  if (
    nextType === "break" &&
    settings.autoStartBreak
  ) {
    timer.start();
    ui.updateTimerControls(timer.getState());
    return;
  }

  if (
    nextType === "focus" &&
    settings.autoStartFocus
  ) {
    timer.start();
    ui.updateTimerControls(timer.getState());
  }
};

window.addEventListener("beforeunload", () => {
  saveHistory();
});

ui.startBtn.addEventListener("click", () => {
  timer.start();

  ui.updateSessionMessage("");

  ui.updateTimerControls(timer.getState());
});

ui.pauseBtn.addEventListener("click", () => {
  timer.pause();
  saveHistory();

  ui.updateTimerControls(timer.getState());
});

ui.endBtn.addEventListener("click", () => {
  timer.reset(sessionManager.getCurrentDuration());
  saveHistory();

  ui.updateTimerControls(timer.getState());
});

ui.volumeSlider.addEventListener("input", () => {
  const volume = Number(ui.volumeSlider.value);

  player.setVolume(volume);
  ui.updateVolume(volume);
});

ui.volumeSlider.addEventListener("change", () => {
  const volume = Number(ui.volumeSlider.value);

  settings.volume = volume;
  Storage.saveSettings(settings);
});

ui.playPauseBtn.addEventListener("click", () => {
  player.togglePlayPause();
});

ui.prevBtn.addEventListener("click", () => {
  player.previous();
});

ui.nextBtn.addEventListener("click", () => {
  player.next();
});

ui.playlistButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const playlistKey = button.dataset.playlist;

    console.log("Playlist clicked:", playlistKey);

    changePlaylist(playlistKey);
  });
});

ui.settingsBtn.addEventListener("click", () => {
  ui.openSettings(settings);
});

ui.closeSettingsBtn.addEventListener("click", () => {
  ui.closeSettings();
});

ui.saveSettingsBtn.addEventListener("click", () => {
  const focusMinutes =
    Number(ui.focusDurationInput.value);

  const breakMinutes =
    Number(ui.breakDurationInput.value);

  settings.focusDuration = focusMinutes * 60;
  settings.breakDuration = breakMinutes * 60;

  settings.autoStartBreak =
    ui.autoStartBreakInput.checked;

  settings.autoStartFocus =
    ui.autoStartFocusInput.checked;

  Storage.saveSettings(settings);

  sessionManager.settings = settings;

  timer.reset(sessionManager.getCurrentDuration());

  renderSession();

  ui.closeSettings();
});

ui.statsBtn.addEventListener("click", () => {
  const records = getRecentHistory();
  const chartData = getWeeklyChartData();

  ui.openStats(records);
  ui.renderWeeklyChart(chartData);
});

ui.closeStatsBtn.addEventListener("click", () => {
  ui.closeStats();
});

renderSession();

