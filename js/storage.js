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
