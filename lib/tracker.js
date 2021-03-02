const assert = require('assert');
const Router2 = require('@koa/router');
const { createLogger } = require('./logger');
const { deepExtend } = require('./util/objects');
const { createRouter } = require('./koa/router');
const stats = require('./monitor/http_stats');
const MonkInspector = require('./monk');
const MonitorScheduler = require('./monitor/scheduler');
const ProcessMonitor = require('./monitor/process_monitor');
const koaTracer = require('./koa/tracer');
const tracer2 = require('./koa2/tracer');
const routerMeter = require('./koa2/router-meter');
const configInstance = require('./config');

const DEFAULT_OPTS = {
  auto_start: true,
  trace: {
    http: true,
    monk: true,
  },
  monitor: {
    process: true,
    route: true,
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

class Tracker {
  constructor(opts) {
    this.options = mergeOptions(DEFAULT_OPTS, opts);
    assert(this.options.service, 'option: service is required');

    this.inited = false;
    this.started = false;
    this.router = null;
    this.monkInspector = null;
    this.processMonitor = null;
    this.logger = null;
    this.monitorScheduler = null;
    this.config = null;
    this.setup();
  }

  setup() {
    if (this.inited) {
      return;
    }

    const { options } = this;
    const logger = options.logger || createLogger(options.service);
    const scheduleInterval = options.monitor.interval * 1000;

    this.config = configInstance;

    this.monitorScheduler = new MonitorScheduler(scheduleInterval, logger);

    this.logger = logger;

    this.router = createRouter(stats.createStats(options.monitor));

    this.monkInspector = new MonkInspector(options.trace.monk ? logger : null, options.service);

    if (options.monitor.node_process) {
      this.monitorScheduler.register(new ProcessMonitor(options.monitor));
    }
  }

  start() {
    if (!this.started) {
      this.monitorScheduler.start();
    }
  }

  wrapServer(server) {
    server.addListener('listening', () => {
      if (this.options.auto_start) {
        this.start();
      }
    });

    server.addListener('close', () => {
      this.monitorScheduler.shutdown();
      this.monkInspector.shutdown();
    });

    return server;
  }

  createKoaV1(koaApp) {
    if (this.options.trace.http) {
      koaApp.use(koaTracer(this.logger, this.options.app));
    }

    // eslint-disable-next-line no-param-reassign
    koaApp.router = createRouter(stats.createStats(this.options.monitor));

    koaApp.use(
      koaApp.router.get('/status', function status() {
        this.body = {
          status: 'ok',
        };
      })
    );

    const that = this;

    // eslint-disable-next-line func-names, no-param-reassign
    koaApp.start = function () {
      // eslint-disable-next-line prefer-rest-params
      const server = this.listen.apply(koaApp, arguments);
      return that.wrapServer(server);
    };

    return koaApp;
  }

  createKoaV2(koaApp) {
    if (this.options.trace.http) {
      koaApp.use(tracer2(this.logger, this.options.app));
    }

    koaApp.use(routerMeter.create(stats.createStats(this.options.monitor)));

    // eslint-disable-next-line no-param-reassign
    koaApp.router = new Router2();

    koaApp.router.get('/status', function status(ctx) {
      ctx.body = {
        status: 'ok',
      };
    });

    const that = this;
    // eslint-disable-next-line func-names, no-param-reassign
    koaApp.start = function () {
      // eslint-disable-next-line prefer-rest-params
      const server = this.listen.apply(koaApp, arguments);
      return that.wrapServer(server);
    };

    return koaApp;
  }

  updateOptions(newOpts) {
    this.options = mergeOptions(this.options, newOpts);
    this.logScheduler.updateDelay(this.options.monitor.interval * 1000);
  }
}

module.exports = Tracker;
