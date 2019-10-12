const uuid = require('uuid');
const superagent = require('./superagent');
const cls = require('./cls');

module.exports = (opts) => {
  const options = Object.assign({
    koaTracer: {
      disable: false,
    },
  }, opts);

  return function* traceRequest(next) {
    cls.bindEmitter(this.req);
    cls.bindEmitter(this.res);
    const clsCtx = cls.createContext();
    cls.enter(clsCtx);
    try {
      if (!options.koaTracer.disable) {
        const tracerId = this.header['x-thimble-tracer-id'] || uuid.v4();
        cls.set('tracerId', tracerId);
        this.tracerInfo = {
          app: options.app,
          tracerId,
          requestAt: new Date(),
        };
        cls.set('tracerInfo', this.tracerInfo);
        this.superagent = superagent.create(options);
      }

      yield next;
    } finally {
      cls.exit(clsCtx);
    }
  };
};
