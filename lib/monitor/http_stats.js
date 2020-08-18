const measured = require('measured-core');

class TStats {
  constructor(options) {
    this.opts = options;
    this.qpsStats = measured.createCollection();
    this.reqStats = measured.createCollection();
    this.marked = false;
    this.ignorePaths = options.ignorePaths || [];
  }

  httpQpsMark(route) {
    this.marked = true;
    if (this.opts.routeMetric) {
      this.qpsStats.meter(`${route.method} ${route.path}`).mark();
    }

    this.qpsStats.meter('ALL').mark();
  }

  respTimeHistogram(route, value) {
    this.marked = true;
    if (this.opts.routeMetric && this.ignorePaths.indexOf(route.path) < 0) {
      this.reqStats.histogram(`${route.method} ${route.path}`).update(value);
    }

    this.reqStats.histogram('ALL').update(value);
  }

  print(logger) {
    if (this.marked) {
      const metrics = {
        type: 'koa-stats',
        qps: this.qpsStats.toJSON(),
        req: this.reqStats.toJSON(),
      };
      logger.info(metrics);
    }
  }
}

module.exports.createStats = (opts) => {
  const paramOpts = opts || {};
  const options = {
    app: 'thimble-koa-metrics',
    monitorInterval: 5,
    ...paramOpts,
  };

  return new TStats(options);
};
