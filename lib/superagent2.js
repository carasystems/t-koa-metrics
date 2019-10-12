const superagent = require('superagent');
const menthods = require('methods');

const HEADER_KEY_TRACER_ID = 'x-thimble-tracer-id';

function buildLog(requestId, ctx, req) {
  const { tracerInfo } = ctx;
  if (!tracerInfo) {
    return null;
  }
  return {
    app: tracerInfo.app,
    request_id: requestId,
    request_at: tracerInfo.requestAt,
    request_target: req.url,
    http_method: req.method,
    request_type: 'http_request',
  };
}

function wrapRequest(ctx, logger) {
  return (req) => {
    const startAt = process.hrtime();
    const { tracerInfo } = ctx;
    const requestId = tracerInfo.tracerId;
    if (requestId) {
      req.header[HEADER_KEY_TRACER_ID] = requestId;
    }

    const logMsg = logger ? buildLog(requestId, ctx, req) : null;

    function calElapsedTime() {
      const delta = process.hrtime(startAt);
      const processTime = delta[0] * 1000 + delta[1] / 1000000;
      return processTime.toFixed(6);
    }

    req.on('error', (err) => {
      if (logMsg) {
        logMsg.error = err;
        logMsg.error_stack = err.stack;
        logMsg.process_time = calElapsedTime();
        logger.error(logMsg);
      }
    });

    req.on('end', () => {
      if (logMsg) {
        logMsg.process_time = calElapsedTime();
        logger.info(logMsg);
      }
    });

    return req;
  };
}

module.exports.tracer = wrapRequest;

module.exports.create = (use) => {
  const wrapped = {};

  menthods.forEach((method) => {
    // eslint-disable-next-line func-names
    wrapped[method] = function () {
      // eslint-disable-next-line prefer-rest-params,prefer-spread
      const request = superagent[method].apply(superagent, arguments);
      request.use(use);
      return request;
    };
  });

  return wrapped;
};
