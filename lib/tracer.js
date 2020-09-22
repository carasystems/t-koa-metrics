const assert = require('assert');
const { createLogger, LogScheduler } = require('./logger');
const superagentWrapper = require('./http/superagent');
const { deepExtend } = require('./util/objects');
const route = require('./koa/route');
const stats = require('./monitor/http_stats');
const MonkInspector = require('./monk');
const ProcessMonitor = require('./monitor/node_process');
const koaTracer = require('./koa/tracer');
const tracer2 = require('./koa/tracer2');
const routerMeter = require('./koa/router-meter');

const DEFAULT_OPTS = {
  auto_start: true,
  trace: {
    http: true,
    monk: true,
  },
  monitor: {
    node_process: true,
    route_metric: false,
    interval: 5,
  },
};

function mergeOptions(origin, opts) {
  const options = deepExtend({}, origin);
  if (opts) {
    deepExtend(options, opts);
  }
  return options;
}

class Tracer {
  constructor(opts) {
    this.options = mergeOptions(DEFAULT_OPTS, opts);
    assert(this.options.app, 'option: app is required');

    this.inited = false;
    this.started = false;
    this.router = null;
    this.monkInspector = null;
    this.processMonitor = null;

    this.setup();
    this.logger = null;
    this.logScheduler = null;
  }

  setup() {
    if (this.inited) {
      return;
    }

    const { options } = this;
    const logger = options.logger || createLogger(options.app);
    const scheduleInterval = options.monitor.interval * 1000;
    this.logScheduler = new LogScheduler(scheduleInterval, logger);
    this.logger = logger;

    this.superagent = superagentWrapper.create(options);
    this.router = route(stats.createStats(options.monitor));
    this.monkInspector = new MonkInspector(options.trace.monk ? logger : null);
    if (options.monitor.node_process) {
      const pMonitor = new ProcessMonitor(options);
      this.logScheduler.register(() => pMonitor.print());
    }
  }

  start() {
    if (!this.started) {
      this.logScheduler.start();
    }
  }

  wrapServer(server) {
    server.addListener('listening', () => {
      if (this.options.auto_start) {
        this.start();
      }
    });
    server.addListener('close', () => {
      this.logScheduler.shutdown();
      this.monkInspector.shutdown();
    });
    return server;
  }

  createKoaV1(koaApp) {
    if (this.options.trace.http) {
      koaApp.use(koaTracer(this.logger));
    }

    // eslint-disable-next-line func-names, no-param-reassign
    koaApp.start = function () {
      // eslint-disable-next-line prefer-rest-params
      const server = this.listen.apply(koaApp, arguments);
      return this.wrapServer(server);
    };

    return koaApp;
  }

  createKoaV2(koaApp) {
    if (this.options.trace.http) {
      koaApp.use(tracer2(this.logger));
    }

    koaApp.use(routerMeter.create(stats.createStats(this.monitor.options)));

    // eslint-disable-next-line func-names, no-param-reassign
    koaApp.start = function () {
      // eslint-disable-next-line prefer-rest-params
      const server = this.listen.apply(koaApp, arguments);
      return this.wrapServer(server);
    };
    return koaApp;
  }

  updateOptions(newOpts) {
    this.options = mergeOptions(this.options, newOpts);
    this.logScheduler.updateDelay(this.options.monitor.interval * 1000);
  }
}

module.exports = Tracer;
