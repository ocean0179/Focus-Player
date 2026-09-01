import { DEFAULT_SETTINGS } from "./config/defaults.js";
import { Timer } from "./timer.js";
import { SessionManager } from "./session.js";
import { UI } from "./ui.js";
import { YouTubePlayer } from "./player.js";
import { PlaylistManager } from "./playlistManager.js";
import { PlaylistUI } from "./playlistUI.js";
import { Storage } from "./storage.js";
import { TIMER_STATE } from "./config/constants.js";
import { extractYouTubeVideoId } from "./utils/youtube.js";

const ui = new UI();
const playlistUI = new PlaylistUI();
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
  currentPlaylistKey = null;
  Storage.removeLastPlaylist();
}

let managedPlaylistKey = currentPlaylistKey;

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
  if (currentPlaylistKey) {
    changePlaylist(currentPlaylistKey);
    return;
  }

  setNoPlaylistState();
};

player.initialize();

function changePlaylist(playlistKey) {
  const playlist = playlistManager.getPlaylist(playlistKey);

  if (!playlist) {
    setNoPlaylistState();
    return;
  }

  currentPlaylistKey = playlistKey;

  Storage.saveLastPlaylist(currentPlaylistKey);

  const videoIds = playlist.tracks.map(
    (track) => track.videoId
  );

  if (videoIds.length === 0) {
    player.clearPlaylist();
    ui.updateTrackTitle("플레이리스트에 곡이 없습니다.");
    ui.updatePlayerControlsEnabled(false);
    renderMainPlaylistSelector();
    return;
  }

  player.loadPlaylist(videoIds);

  ui.updateTrackTitle(playlist.tracks[0].title);
  ui.updatePlayerControlsEnabled(true);
  renderMainPlaylistSelector();
}

function setNoPlaylistState() {
  currentPlaylistKey = null;

  Storage.removeLastPlaylist();
  player.clearPlaylist();

  ui.updateTrackTitle("재생할 플레이리스트가 없습니다.");
  ui.updatePlayerControlsEnabled(false);

  renderMainPlaylistSelector();
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

function renderPlaylistManager() {
  const playlists = playlistManager.getAllPlaylists();

  if (!playlistManager.getPlaylist(managedPlaylistKey)) {
    managedPlaylistKey = Object.keys(playlists)[0] ?? null;
  }

  playlistUI.renderPlaylists(playlists, managedPlaylistKey);
  playlistUI.renderPlaylistDetails(
    playlistManager.getPlaylist(managedPlaylistKey)
  );
}

function renderMainPlaylistSelector() {
  playlistUI.renderMainPlaylistSelector(
    playlistManager.getAllPlaylists(),
    currentPlaylistKey
  );
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

playlistUI.onOpen = () => {
  managedPlaylistKey = playlistManager.getPlaylist(
    currentPlaylistKey
  )
    ? currentPlaylistKey
    : managedPlaylistKey;

  playlistUI.setMessage("");
  renderPlaylistManager();
  playlistUI.open();
};

playlistUI.onClose = () => {
  playlistUI.close();
};

playlistUI.onMainPlaylistSelect = (playlistKey) => {
  changePlaylist(playlistKey);
};

playlistUI.onCreatePlaylist = (name) => {
  if (name.trim() === "") {
    playlistUI.setMessage(
      "플레이리스트 이름을 입력하세요.",
      "error"
    );
    return;
  }

  try {
    managedPlaylistKey =
      playlistManager.createPlaylistFromName(name);

    playlistUI.clearCreateInput();

    if (!currentPlaylistKey) {
      changePlaylist(managedPlaylistKey);
    }

    renderPlaylistManager();
    renderMainPlaylistSelector();
    playlistUI.setMessage("플레이리스트를 생성했습니다.", "success");
  } catch (error) {
    playlistUI.setMessage(
      error.message.includes("already exists")
        ? "같은 이름의 플레이리스트가 이미 있습니다."
        : "플레이리스트를 생성하지 못했습니다.",
      "error"
    );
  }
};

playlistUI.onDeletePlaylist = () => {
  if (!managedPlaylistKey) {
    playlistUI.setMessage(
      "삭제할 플레이리스트를 선택하세요.",
      "error"
    );
    return;
  }

  const deletedKey = managedPlaylistKey;

  try {
    playlistManager.deletePlaylist(deletedKey);

    const remainingKeys = Object.keys(
      playlistManager.getAllPlaylists()
    );

    managedPlaylistKey = remainingKeys[0] ?? null;

    if (currentPlaylistKey === deletedKey) {
      if (managedPlaylistKey) {
        changePlaylist(managedPlaylistKey);
      } else {
        setNoPlaylistState();
      }
    } else {
      renderMainPlaylistSelector();
    }

    renderPlaylistManager();
    playlistUI.setMessage(
      "플레이리스트를 삭제했습니다.",
      "success"
    );
  } catch {
    playlistUI.setMessage(
      "플레이리스트를 삭제하지 못했습니다.",
      "error"
    );
  }
};

playlistUI.onSelectPlaylist = (playlistKey) => {
  if (!playlistManager.getPlaylist(playlistKey)) {
    playlistUI.setMessage(
      "플레이리스트를 찾을 수 없습니다.",
      "error"
    );
    return;
  }

  managedPlaylistKey = playlistKey;
  playlistUI.setMessage("");
  renderPlaylistManager();
};

playlistUI.onAddTrack = (url, title) => {
  if (!managedPlaylistKey) {
    playlistUI.setMessage("플레이리스트를 선택하세요.", "error");
    return;
  }

  const videoId = extractYouTubeVideoId(url);

  if (!videoId) {
    playlistUI.setMessage(
      "올바른 YouTube URL을 입력하세요.",
      "error"
    );
    return;
  }

  if (title.trim() === "") {
    playlistUI.setMessage("곡 제목을 입력하세요.", "error");
    return;
  }

  try {
    playlistManager.addTrack(managedPlaylistKey, {
      videoId,
      title,
    });

    playlistUI.clearTrackInputs();

    if (managedPlaylistKey === currentPlaylistKey) {
      changePlaylist(currentPlaylistKey);
    }

    renderPlaylistManager();
    renderMainPlaylistSelector();
    playlistUI.setMessage("곡을 추가했습니다.", "success");
  } catch {
    playlistUI.setMessage("곡을 추가하지 못했습니다.", "error");
  }
};

playlistUI.onRemoveTrack = (trackIndex) => {
  try {
    playlistManager.removeTrack(managedPlaylistKey, trackIndex);

    if (managedPlaylistKey === currentPlaylistKey) {
      changePlaylist(currentPlaylistKey);
    }

    renderPlaylistManager();
    renderMainPlaylistSelector();
    playlistUI.setMessage("곡을 삭제했습니다.", "success");
  } catch {
    playlistUI.setMessage("곡을 삭제하지 못했습니다.", "error");
  }
};

renderSession();
if (currentPlaylistKey) {
  changePlaylist(currentPlaylistKey);
} else {
  setNoPlaylistState();
}

