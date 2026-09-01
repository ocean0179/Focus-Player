import { STORAGE_KEY } from "./config/constants.js";
import { DEFAULT_SETTINGS } from "./config/defaults.js";

export class Storage {
  static saveSettings(settings) {
    localStorage.setItem(
      STORAGE_KEY.SETTINGS,
      JSON.stringify(settings)
    );
  }

  static loadSettings() {
    const saved = localStorage.getItem(STORAGE_KEY.SETTINGS);

    if (!saved) {
      return { ...DEFAULT_SETTINGS };
    }

    try {
      return {
        ...DEFAULT_SETTINGS,
        ...JSON.parse(saved),
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  static saveHistory(history) {
    localStorage.setItem(
      STORAGE_KEY.HISTORY,
      JSON.stringify(history)
    );
  }

  static loadHistory() {
    const saved = localStorage.getItem(STORAGE_KEY.HISTORY);

    if (!saved) {
      return {
        dailyHistory: {},
      };
    }

    try {
      const history = JSON.parse(saved);

      return {
        dailyHistory: history.dailyHistory ?? {},
      };
    } catch {
      return {
        dailyHistory: {},
      };
    }
  }

  static saveLastPlaylist(playlistKey) {
    localStorage.setItem(
      STORAGE_KEY.LAST_PLAYLIST,
      playlistKey
    );
  }

  static loadLastPlaylist() {
    return (
      localStorage.getItem(STORAGE_KEY.LAST_PLAYLIST) ??
      "SWM"
    );
  }

  static saveUserPlaylists(playlists) {
    localStorage.setItem(
      STORAGE_KEY.USER_PLAYLISTS,
      JSON.stringify(playlists)
    );
  }

  static loadUserPlaylists(defaultPlaylists) {
    const fallback = this.clonePlaylists(defaultPlaylists);
    const saved = localStorage.getItem(
      STORAGE_KEY.USER_PLAYLISTS
    );

    if (!saved) {
      return fallback;
    }

    try {
      const playlists = JSON.parse(saved);

      if (!this.isValidPlaylistCollection(playlists)) {
        return fallback;
      }

      return this.clonePlaylists(playlists);
    } catch {
      return fallback;
    }
  }

  static clonePlaylists(playlists) {
    return JSON.parse(JSON.stringify(playlists));
  }

  static isValidPlaylistCollection(playlists) {
    if (
      !playlists ||
      typeof playlists !== "object" ||
      Array.isArray(playlists)
    ) {
      return false;
    }

    return Object.entries(playlists).every(
      ([key, playlist]) =>
        key.trim() !== "" &&
        playlist &&
        typeof playlist === "object" &&
        !Array.isArray(playlist) &&
        typeof playlist.name === "string" &&
        playlist.name.trim() !== "" &&
        Array.isArray(playlist.tracks) &&
        playlist.tracks.every(
          (track) =>
            track &&
            typeof track === "object" &&
            !Array.isArray(track) &&
            typeof track.videoId === "string" &&
            track.videoId.trim() !== "" &&
            typeof track.title === "string" &&
            track.title.trim() !== ""
        )
    );
  }

  static getToday() {
    return this.getDateKey(new Date());
  }

  static getDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }
}
