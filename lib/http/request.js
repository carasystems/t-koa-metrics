const debug = require('debug')('http-interceptor');
const consts = require('../constants');
const cls = require('../cls');
const timeUtils = require('../util/time');

const THIMBLE_DOMAINS = [
  'verifly.stage',
  'verifly.prod',
  'thimble.stage',
  'thimble.prod',
  'verifly.com',
  'thimble.com',
];

function calElapsedTime(startAt) {
  return timeUtils.getElapsedMsFromHrtime(startAt, 3);
}

function isAWSService(host) {
  return host.endsWith('.amazonaws.com');
}

function buildLog(protocol, traceId, traceInfo, host, req) {
  const requestAt = traceInfo ? traceInfo.requestAt : new Date();
  let type = 'http';
  const lowerHost = host.toLowerCase();
  if (isAWSService(lowerHost)) {
    type = 'AWS';
  }

  return {
    type: consts.LOG_TYPE_TRACE,
    trace_id: traceId,
    span: {
      type,
      name: `${req.method} ${req.path}`,
      tags: {
        protocol,
        host,
        http_method: req.method,
      },
    },
    trace_timestamp: requestAt,
  };
}

function shouldInjectTraceInfo(host) {
  if (!host) {
    return false;
  }

  const toLowerCase = host.toLowerCase();

  debug(`shouldInjectTraceInfo %s`, toLowerCase);

  if (toLowerCase.startsWith('127.0.0.1') || toLowerCase.startsWith('localhost')) {
    return true;
  }

  return THIMBLE_DOMAINS.find((item) => toLowerCase.endsWith(item));
}

module.exports.inject = (req, protocol, host, options) => {
  const startAt = process.hrtime();
  const traceInfo = cls.get('traceInfo');

  if (!traceInfo) {
    // if no traceInfo in current context, skip
    return;
  }

  const { traceId } = traceInfo;

  // we can not get host from the request object
  const targetHost = host || 'UNKNOWN';

  debug('%s %s %s %s', req.method, targetHost, req.path, traceId);

  if (shouldInjectTraceInfo(targetHost)) {
    // set the trace headers
    // use req.set for superagent
    const setFn = req.set || req.setHeader;
    setFn.call(req, consts.HTTP_HEADER_SERVICE, options.service || 'unknown');
    setFn.call(req, consts.HTTP_HEADER_TRACE_ID, traceId);
  }

  debug('%s %s %s %s', req.method, host, req.path, traceId);

  const logMsg = options.traceLogger ? buildLog(protocol, traceId, traceInfo, host, req) : null;
  req.on('error', (err) => {
    if (logMsg) {
      logMsg.span.error = err;
      logMsg.span.tags.status_code = err.status;
      logMsg.span.error_stack = err.stack;
      logMsg.duration = calElapsedTime(startAt);
      options.traceLogger.error(logMsg);
    }
  });

  req.on('response', (res) => {
    const { statusCode, statusMessage } = res;
    if (logMsg) {
      const isOK = statusCode < 400;
      logMsg.span.tags.status_code = statusCode;
      logMsg.span.tags.status_message = statusMessage;
      logMsg.duration = calElapsedTime(startAt);
      if (isOK) {
        options.traceLogger.info(logMsg);
      } else {
        options.traceLogger.error(logMsg);
      }
    }
  });
};
