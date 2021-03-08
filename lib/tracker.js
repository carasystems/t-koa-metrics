const assert = require('assert');
const http = require('http');
const Router2 = require('@koa/router');
const { createLogger } = require('./logger');
const { deepExtend } = require('./util/objects');
const { createRouter } = require('./koa/router');
const Measurer = require('./monitor/measurer');
const MonkInspector = require('./monk');
const MonitorScheduler = require('./monitor/scheduler');
const ProcessMonitor = require('./monitor/process_monitor');
const trace1 = require('./koa/tracer');
const tracer2 = require('./koa2/tracer');
const routerMeter = require('./koa2/router-meter');
const configInstance = require('./config');
const { inject: httpInject } = require('./http/interceptor');
const { inject: superAgentInject } = require('./http/superagent');

const DEFAULT_OPTS = {
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
    this.monkInspector = null;
    this.processMonitor = null;
    this.routeMeasurer = null;
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
    const skipTrace = (process.env.T_SKIP_TRACE || 'N').toUpperCase();

    let { logger } = options;

    if (skipTrace === 'Y') {
      logger = null;
    } else if (!logger) {
      logger = createLogger(options.service);
    }

    const scheduleInterval = options.monitor.interval * 1000;

    this.config = configInstance;

    this.monitorScheduler = new MonitorScheduler(scheduleInterval, logger);

    this.logger = logger;

    this.monkInspector = new MonkInspector(options.trace.monk ? logger : null);

    if (options.monitor.process) {
      this.monitorScheduler.register(new ProcessMonitor(options.monitor));
    }

    if (options.trace.http) {
      const httpTraceOpts = {
        service: options.service,
        traceLogger: this.logger,
      };
      httpInject(httpTraceOpts);
      superAgentInject(httpTraceOpts);
    }

    this.routeMeasurer = new Measurer('route-stats');
    this.monitorScheduler.register(this.routeMeasurer);
  }

  wrapServer(server) {
    server.addListener('listening', () => {
      this.monitorScheduler.start();
    });

    server.addListener('close', () => {
      this.config.shutdown();
      this.monitorScheduler.shutdown();
      this.monkInspector.shutdown();
    });

    return server;
  }

  createKoaV1(koaApp) {
    if (this.options.trace.http) {
      koaApp.use(trace1());
    }

    // eslint-disable-next-line no-param-reassign
    koaApp.router = createRouter(this.routeMeasurer);

    koaApp.use(
      koaApp.router.get('/status', function status() {
        this.body = {
          status: 'ok',
        };
      })
    );

    // eslint-disable-next-line no-param-reassign
    koaApp.start = (port, callback) => {
      // eslint-disable-next-line no-param-reassign
      koaApp.server = http.createServer(koaApp.callback());
      // TODO: init the config
      this.wrapServer(koaApp.server);
      koaApp.listen(port, () => callback(koaApp.server));
    };

    return koaApp;
  }

  createKoaV2(koaApp) {
    if (this.options.trace.http) {
      koaApp.use(tracer2());
    }

    // eslint-disable-next-line no-param-reassign
    koaApp.router = new Router2();
    koaApp.use(routerMeter.create(koaApp.router, this.routeMeasurer));

    koaApp.router.get('/status', function status(ctx) {
      const result = {
        status: 'up!',
      };

      ctx.body = result;

      return result;
    });

    // eslint-disable-next-line no-param-reassign
    koaApp.start = (port) => {
      return new Promise((resolve) => {
        // TODO: init config
        // eslint-disable-next-line no-param-reassign
        koaApp.server = http.createServer(koaApp.callback());
        koaApp.server.listen(port, () => resolve(koaApp.server));
      });
    };

    // eslint-disable-next-line no-param-reassign
    koaApp.build = () => {
      koaApp.use(koaApp.router.routes());
      koaApp.use(koaApp.router.allowedMethods());
      return koaApp;
    };

    return koaApp;
  }

  updateOptions(newOpts) {
    this.options = mergeOptions(this.options, newOpts);
    this.logScheduler.updateDelay(this.options.monitor.interval * 1000);
  }
}

module.exports = Tracker;
