const uuid = require('uuid');
const cls = require('../cls');
const consts = require('../constants');

module.exports = () => {
  return (ctx, next) => {
    const traceId = ctx.header[consts.HTTP_HEADER_TRACE_ID] || uuid.v4();
    const upstream = ctx.header[consts.HTTP_HEADER_SERVICE] || 'unknown';
    cls.bindEmitter(ctx.req);
    cls.bindEmitter(ctx.res);

    ctx.state = {
      traceInfo: {
        upstream,
        traceId,
        requestAt: new Date(),
      },
    };

    ctx.set(consts.HTTP_HEADER_TRACE_ID, traceId);

    return new Promise(
      cls.bind((resolve, reject) => {
        cls.set('traceId', traceId);
        cls.set('traceInfo', ctx.state.traceInfo);
        return next().then(resolve).catch(reject);
      })
    );
  };
};
