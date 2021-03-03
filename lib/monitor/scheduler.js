module.exports = class Scheduler {
  constructor(intervalDelay, logger) {
    this.logger = logger;
    this.delay = intervalDelay;
    this.tickId = null;
    this.listeners = [];
  }

  tick() {
    if (this.tickId) {
      clearTimeout(this.tickId);
      this.tickId = null;
    }

    this.listeners.forEach((listener) => {
      const stats = listener.stats();
      if (stats) {
        this.logger.info(stats);
      }
    });

    this.tickId = setTimeout(this.tick.bind(this), this.delay);
  }

  updateDelay(newDelay) {
    this.delay = newDelay;
  }

  register(listener) {
    if (listener && typeof listener.stats === 'function') {
      this.listeners.push(listener);
    }
  }

  start() {
    if (this.started) {
      return;
    }

    if (this.tickId) {
      clearTimeout(this.tickId);
      this.tickId = null;
    }

    this.started = true;
    this.tickId = setTimeout(this.tick.bind(this), this.delay);
  }

  shutdown() {
    if (this.started && this.tickId) {
      clearTimeout(this.tickId);
      this.started = false;
    }
  }
};
