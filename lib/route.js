const pathToRegexp = require('path-to-regexp');
const debug = require('debug')('koa-route');
const methods = require('methods');

/**
 * Decode value.
 */

function decode(val) {
  if (val) return decodeURIComponent(val);
  return undefined;
}

/**
 * Check request method.
 */

function matches(ctx, method) {
  if (!method) return true;
  if (ctx.method === method) return true;
  return method === 'GET' && ctx.method === 'HEAD';
}

function qpsMark(stats, route) {
  if (stats) {
    stats.httpQpsMark(route);
  }
}

function responseTime(stats, route, processTime) {
  if (stats) {
    stats.respTimeHistogram(route, processTime);
  }
}

function create(httpMethod, stats) {
  let method = httpMethod;
  if (httpMethod) method = httpMethod.toUpperCase();

  return (path, fn, opts) => {
    const re = pathToRegexp(path, opts);
    debug('%s %s -> %s', method || 'ALL', path, re);

    // eslint-disable-next-line consistent-return
    function* handler(next) {
      // method
      if (!matches(this, method)) {
        return yield* next;
      }

      const m = re.exec(this.path);
      // path
      if (m) {
        const args = m.slice(1)
          .map(decode);

        debug('%s %s matches %s %j', this.method, path, this.path, args);

        args.push(next);

        const route = {
          method,
          path,
        };

        if (this.tracerInfo) {
          this.tracerInfo.route = route;
        }

        qpsMark(stats, route);

        const start = process.hrtime();

        yield* fn.apply(this, args);

        const delta = process.hrtime(start);
        const processTime = delta[0] * 1000 + delta[1] / 1000000;
        responseTime(stats, route, processTime);
      } else {
        // miss
        yield* next;
      }
    }

    return handler;
  };
}

methods.forEach((method) => {
  exports[method] = create(method);
});

module.exports = (stats) => {
  const map = {};
  methods.forEach((method) => {
    map[method] = create(method, stats);
  });
  map.del = map.delete;
  map.all = create(null, stats);
  return map;
};
