const measured = require('measured-core');
const cron = require('cron');

class TStats {
  constructor(options) {
    this.opts = options;
    this.qpsStats = measured.createCollection();
    this.reqStats = measured.createCollection();
    this.logger = options.logger;
    const that = this;
    this.cron = new cron.CronJob(`*/${options.monitorInterval} * * * * *`, () => {
      that.print();
    }, null, false);
    this.cron.start();
    this.marked = false;
    this.ignorePaths = options.ignorePaths || [];
    this.respTimeMarked = false;
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

  print() {
    if (this.marked) {
      const metrics = {
        type: 'koa-stats',
        qps: this.qpsStats.toJSON(),
        req: this.reqStats.toJSON(),
      };
      this.logger.info(metrics);
    }
  }
}

module.exports.createStats = (opts) => {
  const options = Object.assign({
    app: 'thimble-koa-metrics',
    monitorInterval: 5,
  }, opts || {});

  return new TStats(options);
};
