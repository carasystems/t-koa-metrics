const assert = require('assert');
const route = require('./koa/route');
const stats = require('./monitor/http_stats');
const { createLogger, LogScheduler } = require('./logger');
const ProcessMonitor = require('./monitor/node_process');
const koaTracer = require('./koa/tracer');
const tracer2 = require('./koa/tracer2');
const routerMeter = require('./koa/router-meter');
const MonkInspector = require('./monk');
const superagentWrapper = require('./http/superagent');
const methodWrapper = require('./method/wrapper');

module.exports = (opts) => {
  const options = {
    trace_http: true,
    trace_monk: true,
    monitor_node_process: true,
    monitorInterval: 5,
    routeMetric: false,
    autoStart: true,
    ...opts,
  };

  assert(options.app, 'option: app is required');

  const logger = options.logger || createLogger(options.app);
  const scheduleInterval = options.monitorInterval * 1000;
  const logScheduler = new LogScheduler(scheduleInterval, logger);
  options.logger = logger;

  const routeInstance = route(stats.createStats(options));
  if (options.monitor_node_process) {
    const pMonitor = new ProcessMonitor(options);
    logScheduler.register(() => pMonitor.print());
  }

  const monkInspector = new MonkInspector(options.trace_monk ? logger : null);

  function wrapServer(server) {
    server.addListener('listening', () => {
      if (options.autoStart) {
        logScheduler.start();
      }
    });
    server.addListener('close', () => {
      logScheduler.shutdown();
      monkInspector.shutdown();
    });
    return server;
  }

  return {
    route: routeInstance,
    superagent: superagentWrapper.create(options),
    methods: methodWrapper.create(options),
    logScheduler,
    monkInspector,
    start: () => logScheduler.start(),
    koaV1: (constructorFn) => {
      const app = constructorFn();
      if (options.trace_http) {
        app.use(koaTracer(logger));
      }
      // eslint-disable-next-line func-names
      app.start = function () {
        // eslint-disable-next-line prefer-rest-params
        const server = this.listen.apply(app, arguments);
        return wrapServer(server);
      };

      return app;
    },
    koaV2: (ConstructorFn) => {
      const app = new ConstructorFn();
      if (options.trace_http) {
        app.use(tracer2(logger));
      }
      app.use(routerMeter.create(stats.createStats(options)));
      // eslint-disable-next-line func-names
      app.start = function () {
        // eslint-disable-next-line prefer-rest-params
        const server = this.listen.apply(app, arguments);
        return wrapServer(server);
      };
      return app;
    },
  };
};
