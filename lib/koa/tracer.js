const uuid = require('uuid');
const superagentWrapper = require('../http/superagent');
const cls = require('../cls');
const consts = require('../constants');

module.exports = (traceLogger, app) => {
  return function* traceRequest(next) {
    const clsCtx = cls.createContext();
    cls.enter(clsCtx);
    try {
      const traceId = this.header[consts.HTTP_HEADER_TRACE_ID] || uuid.v4();
      cls.set('traceId', traceId);
      this.traceInfo = {
        app,
        traceId,
        requestAt: new Date(),
      };
      cls.set('traceInfo', this.traceInfo);
      this.set(consts.HTTP_HEADER_TRACE_ID, traceId);
      this.superagent = superagentWrapper.create(traceLogger);

      yield next;
    } finally {
      cls.exit(clsCtx);
    }
  };
};
