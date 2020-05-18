# koa-metrics
> 🔨 api metrics utils for koa 1.x & 2.x

## Modules

1. Service Trace: inject trace_id to each request and will passed to the services of downstream
    1. Router Tracing
    2. Superagent Tracing 
2. Monk Trace: Tracing the time elapsed when doing some mongo options
3. Method Trace: Utilities for trace specific methods manually

## Examples

### Constractor options
1. app: The app name
2. monitorInterval: The interval(seconds) of monitor process, default to 5 seconds
3. routeMetric: Log metric for each route, default: false
4. autoStart: auto start the log scheduler, default: true

### Server Trace - Koa V1

```javascript
// app.js
const path = require('path');
const fs = require('fs');
const koa = require('koa');
const tMetrics = require('t-koa-metrics')({
  app: 'my-sample-app'
});

const app = module.exports = tMetrics.koaV1(); // create the koa server , the trace middlewares will added automaticlly

const route = tMetrics.route; // use the route

const routesPath = path.join(__dirname, 'routes');
fs.readdirSync(routesPath).forEach(file => {
  if (file[0] === '.') return;
  require(`${routesPath}/${file}`)(app, route);
});

app.start(3000);
console.log('listenning on http://localhost:3000');
```

### Server Trace - Koa V2

```javascript

const path = require('path');
const fs = require('fs');
const koa = require('koa');
const Router = require('@koa/router');
const tMetrics = require('t-koa-metrics')({
  app: 'my-sample-app'
});

const app = module.exports = tMetrics.koaV2(); // create the koa server , the trace middlewares will added automaticlly

const router = new Router();  // use the @koa/router

const routesPath = path.join(__dirname, 'routes');
fs.readdirSync(routesPath).forEach(file => {
  if (file[0] === '.') return;
  require(`${routesPath}/${file}`)(app, route);
});

app.use(router.routes());

app.start(3000);
console.log('listenning on http://localhost:3000');

```

### Mongo Trace

```javascript
const tMetrics = require('t-koa-metrics')({
  app: 'my-sample-app'
});
const demoDb = tMetrics.monkInspector.traceDB(monk('mongodb://localhost:27017/demo')); // use this to add middleware to trace mongo
demoDb.get('User');
demoDB.query(...);
```

### method trace
```javascript

// sync function
function fn1(a, b) {
  return a + b;
}

const wrappedFn1 = tMetrics.methods.wrap(fn1);
const result1 = yield wrappedFn1(1, 2);

// async function
function* fn2(a, b) {
  return yield new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(a + b);
    }, 0);
  });
}

const wrappedFn2 = tMetrics.methods.wrap(fn2);
const result2 = yield wrappedFn2(1, 2);

```

## Log Format

```javascript
{
  "app": "api-mobile",
  "type": "thimble-trace",
  "trace_id": "c1b43018-3fa8-4a73-817a-79e97fa91adc",
  "trace_timestamp": "2019-10-11T06:00:49.057Z",
  "span": {
    "type": "http",
    "name": "GET http://127.0.0.1:8888/request2",
    "tags": {
      "http_method": "GET",
      "status_code": 200
    }
  },
  "process_time": "2.214839"
}
```

It will contains a trace id in the request header named: `x-thimble-trace-id`

## Development

1. Install Dependencies(Only Using yarn) `yarn install`
2. Coding
3. Format Files(Prettier) `yarn run prettier`
