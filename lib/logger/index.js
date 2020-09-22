const bunyan = require('bunyan');

class LogScheduler {
  constructor(intervalDelay, logger) {
    this.logger = logger;
    this.delay = intervalDelay;
    this.tickId = null;
    this.callbacks = [];
  }

  tick() {
    if (this.tickId) {
      clearTimeout(this.tickId);
      this.tickId = null;
    }

    this.callbacks.forEach((callback) => callback(this.logger));

    this.tickId = setTimeout(this.tick.bind(this), this.delay);
  }

  updateDelay(newDelay) {
    this.delay = newDelay;
  }

  register(func) {
    if (func && typeof func === 'function') {
      this.callbacks.push(func);
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
}

module.exports.createLogger = (name) => bunyan.createLogger({ name, serializers: bunyan.stdSerializers });

module.exports.LogScheduler = LogScheduler;
