const uuid = require('uuid');
const superagentWrapper = require('../http/superagent');
const cls = require('../cls');
const consts = require('../constants');

module.exports = (traceLogger, app) => {
  return (ctx, next) => {
    const traceId = ctx.header[consts.HTTP_HEADER_TRACE_ID] || uuid.v4();
    cls.bindEmitter(ctx.req);
    cls.bindEmitter(ctx.res);

    ctx.state = {
      traceInfo: {
        app,
        traceId,
        requestAt: new Date(),
      },
    };

    ctx.set(consts.HTTP_HEADER_TRACE_ID, traceId);
    ctx.superagent = superagentWrapper.create(traceLogger);

    return new Promise(
      cls.bind((resolve, reject) => {
        cls.set('traceId', traceId);
        cls.set('traceInfo', ctx.state.traceInfo);
        return next().then(resolve).catch(reject);
      })
    );
  };
};
