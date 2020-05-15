const EventLoopLag = require('event-loop-lag');

class ProcessMonitor {
  constructor(options) {
    this.eventLoopLag = EventLoopLag(options.monitorInterval);
    if (options.logScheduler) {
      options.logScheduler.register(this.print.bind(this));
    }
  }

  print(logger) {
    // eslint-disable-next-line no-underscore-dangle
    const activeHandles = process._getActiveHandles() || [];

    // eslint-disable-next-line no-underscore-dangle
    const activeRequests = process._getActiveRequests() || [];

    const mem = process.memoryUsage();

    const metrics = {
      active_request: activeRequests.length,
      active_handlers: activeHandles.length,
      event_loop_latency: this.eventLoopLag().toFixed(6),
      heap_total: mem.heapTotal,
      heap_used: mem.heapUsed,
      mem_external: mem.external,
      rss: mem.rss,
    };

    logger.info({
      type: 'process-metrics',
      ...metrics,
    });
  }
}

module.exports = ProcessMonitor;
