const co = require('co');
const consts = require('../global/constants');
const cls = require('../global/cls');
const utils = require('../utils');

function createLogMsg(traceInfo, fn, args) {
  return {
    type: consts.LOG_TYPE_TRACE,
    app: traceInfo.app,
    trace_id: traceInfo.traceId,
    span: {
      type: 'method',
      name: fn.name,
      tags: {
        args,
        result: 'success',
      },
    },
  };
}

function createErrorLogMsg(traceInfo, fn, args, err) {
  return {
    type: consts.LOG_TYPE_TRACE,
    app: traceInfo.app,
    trace_id: traceInfo.traceId,
    span: {
      type: 'method',
      name: fn.name,
      tags: {
        // eslint-disable-next-line prefer-rest-params
        args: arguments,
        result: 'exception',
        error: err,
        error_stack: err.stack,
      },
    },
  };
}

function wrapGenerator(fn, logger) {
  // eslint-disable-next-line func-names
  return function wrapped() {
    const traceInfo = cls.get('traceInfo');
    const requestAt = new Date();
    const startAt = process.hrtime();
    // eslint-disable-next-line prefer-rest-params
    const args = Array.prototype.slice.call(arguments);
    return co(fn.apply(this, args))
      .then((res) => {
        const processTime = utils.getElapsedMsFromHrtime(startAt, 6);
        if (traceInfo && logger) {
          const log = createLogMsg(traceInfo, fn, args);
          log.span.tags.result = 'success';
          log.trace_timestamp = requestAt;
          log.process_time = processTime;
          logger.info(log);
        }
        return res;
      })
      .catch((err) => {
        if (traceInfo && logger) {
          const logMsg = createErrorLogMsg(traceInfo, fn, args, err);
          logMsg.trace_timestamp = requestAt;
          logMsg.process_time = utils.getElapsedMsFromHrtime(startAt, 6);
          logger.error(logMsg);
        }
        throw err;
      });
  };
}

function wrapAsync(fn, logger) {
  const traceInfo = cls.get('traceInfo');
  const requestAt = new Date();
  const startAt = process.hrtime();
  return function wrapped() {
    // eslint-disable-next-line prefer-rest-params
    const args = Array.prototype.slice.call(arguments);
    const promiseObj = fn.apply(this, args);
    return promiseObj
      .then((res) => {
        const processTime = utils.getElapsedMsFromHrtime(startAt, 6);
        if (traceInfo && logger) {
          const log = createLogMsg(traceInfo, fn, args);
          log.span.tags.result = 'success';
          log.trace_timestamp = requestAt;
          log.process_time = processTime;
          logger.info(log);
        }
        return res;
      })
      .catch((err) => {
        if (traceInfo && logger) {
          const logMsg = createErrorLogMsg(traceInfo, fn, args, err);
          logMsg.trace_timestamp = requestAt;
          logMsg.process_time = utils.getElapsedMsFromHrtime(startAt, 6);
          logger.error(logMsg);
        }
        throw err;
      });
  };
}

function wrapFn(fn, logger) {
  // eslint-disable-next-line consistent-return
  return function wrapped() {
    const traceInfo = cls.get('traceInfo');
    const requestAt = new Date();
    const startAt = process.hrtime();
    // eslint-disable-next-line prefer-rest-params
    const args = Array.prototype.slice.call(arguments);
    try {
      const result = fn.apply(this, args);
      const processTime = utils.getElapsedMsFromHrtime(startAt, 6);
      if (traceInfo && logger) {
        // eslint-disable-next-line prefer-rest-params
        const log = createLogMsg(traceInfo, fn, arguments);
        log.span.tags.result = 'success';
        log.trace_timestamp = requestAt;
        log.process_time = processTime;
        logger.info(log);
      }
      return result;
    } catch (err) {
      if (traceInfo && logger) {
        const logMsg = createErrorLogMsg(traceInfo, fn, args, err);
        logMsg.trace_timestamp = requestAt;
        logMsg.process_time = utils.getElapsedMsFromHrtime(startAt, 6);
        logger.error(logMsg);
      }
      throw err;
    }
  };
}

function createWrapper(options) {
  return (fn) => {
    const constructorName = fn.constructor.name;
    if (constructorName === 'GeneratorFunction') {
      return wrapGenerator(fn, options.logger);
    }

    if (constructorName === 'Function') {
      return wrapFn(fn, options.logger);
    }

    if (constructorName === 'AsyncFunction') {
      return wrapAsync(fn, options.logger);
    }

    throw new Error('Only can wrap a function!');
  };
}

module.exports.create = (options) => ({
  wrap: createWrapper(options),
});
