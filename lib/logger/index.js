const bunyan = require('bunyan');

class LogScheduler {
  constructor(intervalDelay, logger) {
    this.logger = logger;
    this.delay = intervalDelay;
    this.tickId = null;
    this.callbacks = [];
    process.on('exit', this.stop.bind(this));
    process.on('SIGINT', this.stop.bind(this, { exit: true }));
    process.on('SIGUSR1', this.stop.bind(this, { exit: true }));
    process.on('SIGUSR2', this.stop.bind(this, { exit: true }));
  }

  tick() {
    if (this.tickId) {
      clearTimeout(this.tickId);
      this.tickId = null;
    }

    this.callbacks.forEach((callback) => callback(this.logger));

    this.tickId = setTimeout(this.tick.bind(this), this.delay);
  }

  register(func) {
    if (func && typeof func === 'function') {
      this.callbacks.push(func);
    }
  }

  start() {
    if (this.tickId) {
      clearTimeout(this.tickId);
      this.tickId = null;
    }

    this.started = true;
    this.tickId = setTimeout(this.tick.bind(this), this.delay);
  }

  stop() {
    if (this.started && this.tickId) {
      clearInterval(this.tickId);
      this.started = false;
    }
  }
}

module.exports.createLogger = (name) => bunyan.createLogger({ name, serializers: bunyan.stdSerializers });

module.exports.LogScheduler = LogScheduler;
