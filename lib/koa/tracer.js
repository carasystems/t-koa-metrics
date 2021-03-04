const uuid = require('uuid');
const cls = require('../cls');
const consts = require('../constants');

module.exports = () => {
  return function* traceRequest(next) {
    const clsCtx = cls.createContext();
    cls.enter(clsCtx);
    try {
      const traceId = this.header[consts.HTTP_HEADER_TRACE_ID] || uuid.v4();
      const upstream = this.header[consts.HTTP_HEADER_SERVICE] || 'unknown';
      cls.set('traceId', traceId);
      this.traceInfo = {
        upstream,
        traceId,
        requestAt: new Date(),
      };
      cls.set('traceInfo', this.traceInfo);
      this.set(consts.HTTP_HEADER_TRACE_ID, traceId);

      yield next;
    } finally {
      cls.exit(clsCtx);
    }
  };
};
