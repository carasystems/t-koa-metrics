const uuid = require('uuid');
const superagent = require('./superagent');

module.exports = (opts) => {
  const options = Object.assign({
    koaTracer: {
      disable: false,
    },
  }, opts);

  return function* traceRequest(next) {
    if (!options.koaTracer.disable) {
      const tracerId = this.header['x-thimble-tracer-id'] || uuid.v4();
      this.tracerInfo = {
        app: options.app,
        tracerId,
        requestAt: new Date(),
      };
      this.superagent = superagent.create(superagent.tracer(this, options.logger));
    }

    yield next;
  };
};
