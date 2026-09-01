import { SESSION_TYPE } from "./config/constants.js";

export class SessionManager {
  constructor(settings) {
    this.settings = settings;

    this.currentType = SESSION_TYPE.FOCUS;
    this.sessionCount = 1;
    this.completedFocusSessions = 0;
  }

  getCurrentType() {
    return this.currentType;
  }

  getCurrentDuration() {
    if (this.currentType === SESSION_TYPE.FOCUS) {
      return this.settings.focusDuration;
    }

    return this.settings.breakDuration;
  }

  moveToNextSession() {
    if (this.currentType === SESSION_TYPE.FOCUS) {
      this.completedFocusSessions += 1;
      this.currentType = SESSION_TYPE.BREAK;

      return;
    }

    this.currentType = SESSION_TYPE.FOCUS;
    this.sessionCount += 1;
  }

  reset() {
    this.currentType = SESSION_TYPE.FOCUS;
    this.sessionCount = 1;
    this.completedFocusSessions = 0;
  }

  getSessionCount() {
    return this.sessionCount;
  }

  getCompletedFocusSessions() {
    return this.completedFocusSessions;
  }
}