const cron = require('cron');
const EventLoopLag = require('event-loop-lag');

class ProcessMonitor {
  constructor(options) {
    this.appName = options.app;
    this.logger = options.logger;
    const that = this;
    this.cron = new cron.CronJob(`*/${options.monitorInterval} * * * * *`, () => {
      that.print();
    }, null, false);
    this.eventLoopLag = EventLoopLag(options.monitorInterval);
  }

  start() {
    this.cron.start();
  }

  print() {
    // eslint-disable-next-line no-underscore-dangle
    const activeHandles = process._getActiveHandles() || [];

    // eslint-disable-next-line no-underscore-dangle
    const activeRequests = process._getActiveRequests() || [];

    const mem = process.memoryUsage();

    const metrics = {
      active_request: activeRequests.length,
      active_handlers: activeHandles.length,
      event_loop_latency: this.eventLoopLag()
        .toFixed(6),
      heap_total: mem.heapTotal,
      heap_used: mem.heapUsed,
      mem_external: mem.external,
      rss: mem.rss,
    };

    this.logger.info({
      type: 'process-metrics',
      ...metrics,
    });
  }
}

module.exports.createMonitor = opts => new ProcessMonitor(Object.assign({
  app: 'thimble-koa-metrics',
  monitorInterval: 5,
}, opts));
