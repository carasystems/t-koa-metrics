const uuid = require('uuid');
const superagentWrapper = require('../superagent/wrapper');
const cls = require('../global/cls');
const consts = require('../global/constants');

module.exports = (opts) => {
  const options = Object.assign({
    koaTracer: {
      disable: false,
    },
  }, opts);

  return function* traceRequest(next) {
    const clsCtx = cls.createContext();
    cls.enter(clsCtx);
    try {
      if (!options.koaTracer.disable) {
        const traceId = this.header[consts.HTTP_HEADER_TRACE_ID] || uuid.v4();
        cls.set('traceId', traceId);
        this.traceInfo = {
          app: options.app,
          traceId,
          requestAt: new Date(),
        };
        cls.set('traceInfo', this.traceInfo);
        this.set(consts.HTTP_HEADER_TRACE_ID, traceId);
        this.superagent = superagentWrapper.create(options);
      }

      yield next;
    } finally {
      cls.exit(clsCtx);
    }
  };
};
