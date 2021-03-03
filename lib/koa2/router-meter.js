const TRACE_METHODS = [
  { method: 'tGet', target: 'get' },
  { method: 'tPost', target: 'post' },
  { method: 'tPut', target: 'put' },
  { method: 'tDel', target: 'del' },
];

const traceRouteMap = {};

module.exports.create = (routerInstance, measurer) => {
  TRACE_METHODS.forEach((traceMethod) => {
    // eslint-disable-next-line no-param-reassign
    routerInstance[traceMethod.method] = function tRouteHandle(name, path) {
      let targetPath = name;
      if (typeof path === 'string' || path instanceof RegExp) {
        targetPath = path;
      }
      traceRouteMap[`${traceMethod.target.toUpperCase()} ${targetPath}`] = 1;
      // eslint-disable-next-line prefer-spread,prefer-rest-params
      routerInstance[traceMethod.target].apply(routerInstance, arguments);
    };
  });

  return (ctx, next) => {
    const start = process.hrtime();

    return next().finally(() => {
      const delta = process.hrtime(start);
      // eslint-disable-next-line no-underscore-dangle
      const route = ctx._matchedRouteName || ctx._matchedRoute || 'UNKNOWN';
      const key = `${ctx.method.toUpperCase()} ${route}`;
      if (measurer && traceRouteMap[key]) {
        const processTime = delta[0] * 1000 + delta[1] / 1000000;
        measurer.histogram(key, processTime);
      }
    });
  };
};
