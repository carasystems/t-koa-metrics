const koa = require('koa');
const gracefulShutdown = require('http-graceful-shutdown');
// const route = require('koa-route');

const koaMetrics = require('../lib')({
  app: 'demo-performance',
  monitorInterval: 10,
});

const { route } = koaMetrics;

const app = module.exports = koa();

require('./routes')(app, route);

app.listen(3000);

console.log('server started');
gracefulShutdown(app);
