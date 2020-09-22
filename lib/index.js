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
const configInstance = require('./config');

module.exports = (opts) => {
  const options = {
    trace_http: true,
    trace_monk: true,
    monitor_node_process: true,
    monitor_interval: 5,
    route_metric: false,
    auto_start: true,
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

  function setupKoaV1App(koaApp) {
    if (options.trace_http) {
      koaApp.use(koaTracer(logger));
    }
    // eslint-disable-next-line func-names, no-param-reassign
    koaApp.start = function () {
      // eslint-disable-next-line prefer-rest-params
      const server = this.listen.apply(koaApp, arguments);
      return wrapServer(server);
    };

    return koaApp;
  }

  function setupKoaV2App(koaApp) {
    if (options.trace_http) {
      koaApp.use(tracer2(logger));
    }
    koaApp.use(routerMeter.create(stats.createStats(options)));
    // eslint-disable-next-line func-names, no-param-reassign
    koaApp.start = function () {
      // eslint-disable-next-line prefer-rest-params
      const server = this.listen.apply(koaApp, arguments);
      return wrapServer(server);
    };
    return koaApp;
  }

  const superagent = superagentWrapper.create(options);

  return {
    route: routeInstance,
    superagent,
    createHttpClient: (createOpts) => {
      const apiBase = createOpts.apiBase || '';
      return ['get', 'post', 'put', 'del', 'head'].reduce((acc, method) => {
        switch (method) {
          case 'get':
          case 'head':
            acc[method] = async (url, config) => {
              const request = superagent[method](`${apiBase}${url}`);
              if (config) {
                request.set(config.headers);
              }
              const res = await request;
              return res.body;
            };
            break;
          case 'post':
          case 'put':
          case 'del':
            acc[method] = async (url, data, config) => {
              const request = superagent[method](`${apiBase}${url}`);
              if (data) {
                request.send(data);
              }
              if (config && config.headers) {
                request.set(config.headers);
              }
              const res = await request;
              return res.body;
            };
            break;
          default:
            break;
        }
        return acc;
      });
    },
    methods: methodWrapper.create(options),
    monkInspector,
    start: () => logScheduler.start(),
    config: configInstance,
    createKoaV1: (koaApp) => setupKoaV1App(koaApp),
    createKoaV2: (app) => setupKoaV2App(app),
    koaV1: (constructorFn) => {
      const app = constructorFn();
      return setupKoaV1App(app);
    },
    koaV2: (ConstructorFn) => {
      const app = new ConstructorFn();
      return setupKoaV2App(app);
    },
  };
};
