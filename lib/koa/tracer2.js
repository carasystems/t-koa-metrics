const uuid = require('uuid');
const superagentWrapper = require('../superagent/wrapper');
const cls = require('../global/cls');
const consts = require('../global/constants');

module.exports = (opts) => {
  const options = {
    koaTracer: {
      disable: false,
    },
    ...opts,
  };

  return (ctx, next) => {
    if (!options.koaTracer.disable) {
      const traceId = ctx.header[consts.HTTP_HEADER_TRACE_ID] || uuid.v4();
      cls.bindEmitter(ctx.req);
      cls.bindEmitter(ctx.res);

      ctx.state = {
        traceInfo: {
          app: options.app,
          traceId,
          requestAt: new Date(),
        },
      };

      ctx.set(consts.HTTP_HEADER_TRACE_ID, traceId);
      ctx.superagent = superagentWrapper.create(options);

      return new Promise(
        cls.bind((resolve, reject) => {
          cls.set('traceId', traceId);
          cls.set('traceInfo', ctx.state.traceInfo);
          return next().then(resolve).catch(reject);
        })
      );
    }
    return next();
  };
};
