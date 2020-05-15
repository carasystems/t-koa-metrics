const route = require('./koa/route');
const stats = require('./stats');
const { createLogger, LogScheduler } = require('./logger');
const ProcessMonitor = require('./process');
const koaTracer = require('./koa/tracer');
const tracer2 = require('./koa/tracer2');
const monkTracer = require('./monk/monk-logger');
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

  const logger = createLogger(options.app);
  options.logger = logger;
  const scheduleInterval = options.monitorInterval * 1000;
  const logScheduler = new LogScheduler(scheduleInterval, logger);
  options.logScheduler = logScheduler;

  const statsInstance = stats.createStats(options);
  const routeInstance = route(statsInstance);
  const pMonitor = new ProcessMonitor(options);

  return {
    route: routeInstance,
    stats: statsInstance,
    processMonitor: pMonitor,
    tracer: koaTracer(options),
    tracer2: tracer2(options),
    superagent: superagentWrapper.create(options),
    monkTracer: monkTracer(options),
    methods: methodWrapper.create(options),
    start: () => logScheduler.start(),
  };
};
