import { TIMER_STATE } from "./config/constants.js";

export class Timer {
  constructor(duration) {
    this.duration = duration;
    this.remainingTime = duration;
    this.state = TIMER_STATE.IDLE;

    this.intervalId = null;

    this.onTick = null;
    this.onComplete = null;
  }

  start() {
    if (this.state === TIMER_STATE.RUNNING) {
      return;
    }

    this.state = TIMER_STATE.RUNNING;

    this.intervalId = setInterval(() => {
      this.remainingTime -= 1;

      if (this.onTick) {
        this.onTick(this.remainingTime);
      }

      if (this.remainingTime <= 0) {
        this.complete();
      }
    }, 1000);
  }

  pause() {
    if (this.state !== TIMER_STATE.RUNNING) {
      return;
    }

    clearInterval(this.intervalId);
    this.intervalId = null;

    this.state = TIMER_STATE.PAUSED;
  }

  reset(duration = this.duration) {
    clearInterval(this.intervalId);
    this.intervalId = null;

    this.duration = duration;
    this.remainingTime = duration;
    this.state = TIMER_STATE.IDLE;

    if (this.onTick) {
      this.onTick(this.remainingTime);
    }
  }

  complete() {
    clearInterval(this.intervalId);
    this.intervalId = null;

    this.remainingTime = 0;
    this.state = TIMER_STATE.IDLE;

    if (this.onTick) {
      this.onTick(this.remainingTime);
    }

    if (this.onComplete) {
      this.onComplete();
    }
  }

  getRemainingTime() {
    return this.remainingTime;
  }

  getState() {
    return this.state;
  }
}