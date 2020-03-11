const route = require('./route');
const stats = require('./stats');
const log = require('./log');
const processMonitor = require('./process');
const koaTracer = require('./koa/tracer');
const monkTracer = require('./monk/monk-logger');
const superagentWrapper = require('./superagent/wrapper');
const methodWrapper = require('./method/wrapper');

module.exports = (opts) => {
  const options = {
    app: 'thimble-koa-metrics',
    monitorInterval: 5,
    routeMetric: false,
    ...opts,
  };
  options.logger = log.createLogger(options.app);
  const statsInstance = stats.createStats(options);
  const routeInstance = route(statsInstance);
  const pMonitor = processMonitor.createMonitor(options);
  pMonitor.start();
  return {
    route: routeInstance,
    stats: statsInstance,
    processMonitor: pMonitor,
    tracer: koaTracer(options),
    superagent: superagentWrapper.create(options),
    monkTracer: monkTracer(options),
    methods: methodWrapper.create(options),
  };
};
