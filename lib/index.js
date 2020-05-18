const route = require('./koa/route');
const stats = require('./stats');
const { createLogger, LogScheduler } = require('./logger');
const ProcessMonitor = require('./process');
const koaTracer = require('./koa/tracer');
const tracer2 = require('./koa/tracer2');
const routerMeter = require('./koa/router-meter');
const MonkInspector = require('./monk');
const superagentWrapper = require('./superagent/wrapper');
const methodWrapper = require('./method/wrapper');

module.exports = (opts) => {
  const options = {
    app: 'thimble-koa-metrics',
    monitorInterval: 5,
    routeMetric: false,
    ...opts,
    autoStart: true,
  };

  if (!options.logger) {
    options.logger = createLogger(options.app);
  }

  const scheduleInterval = options.monitorInterval * 1000;
  // const logScheduler = null;
  const logScheduler = new LogScheduler(scheduleInterval, options.logger);
  options.logScheduler = logScheduler;

  const routeInstance = route(stats.createStats(options));
  const pMonitor = new ProcessMonitor(options);
  const monkInspector = new MonkInspector(options);

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
    processMonitor: pMonitor,
    superagent: superagentWrapper.create(options),
    monkInspector,
    methods: methodWrapper.create(options),
    start: () => logScheduler.start(),
    koaV1: (constructor) => {
      const app = constructor();
      app.use(koaTracer(options));
      // eslint-disable-next-line func-names
      app.start = function () {
        // eslint-disable-next-line prefer-rest-params
        const server = this.listen.apply(app, arguments);
        return wrapServer(server);
      };

      return app;
    },
    koaV2: (Constructor) => {
      const app = new Constructor();
      app.use(tracer2(options));
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
