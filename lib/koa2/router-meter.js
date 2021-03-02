function responseTime(stats, route, processTime) {
  if (stats) {
    stats.respTimeHistogram(route, processTime);
  }
}

module.exports.create = (stats) => {
  return (ctx, next) => {
    const start = process.hrtime();

    return next().finally(() => {
      const delta = process.hrtime(start);
      const route = {
        method: ctx.method,
        // eslint-disable-next-line no-underscore-dangle
        route: ctx._matchedRouteName || ctx._matchedRoute || 'UNKNOWN',
      };

      const processTime = delta[0] * 1000 + delta[1] / 1000000;
      responseTime(stats, route, processTime);
    });
  };
};
