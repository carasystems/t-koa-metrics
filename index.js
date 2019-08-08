const route = require('./route');
const stats = require('./stats');
const log = require('./log');
const pm2 = require('./pm2');

module.exports = (opts) => {
  const options = Object.assign({
    app: 'thimble-koa-metrics',
    monitorInterval: 5,
    routeMetric: false,
  }, opts);
  options.logger = log.createLogger(options.app);
  const statsInstance = stats.createStats(options);
  const routeInstance = route(statsInstance);
  const pm2Monitor = pm2.createMonitor(options);
  pm2Monitor.start();
  return {
    route: routeInstance,
    stats: statsInstance,
    pm2: pm2Monitor,
  };
};
