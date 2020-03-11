### koa-metrics
> 🔨 api metrics utils for koa 1.x
#### Example
app.js
``` javascript
const path = require('path');
const fs = require('fs');
const koa = require('koa');
const app = module.exports = koa();
const tMetrics = require('t-koa-metrics')({
  app: 'my-sample-app'
});
const route = tMetrics.route; // use the route

app.use(tMetrics.tracer); // inject the superagent tracer middleware

const routesPath = path.join(__dirname, 'routes');
fs.readdirSync(routesPath).forEach(file => {
  if (file[0] === '.') return;
  require(`${routesPath}/${file}`)(app, route);
});

app.listen(3000);
console.log('listenning on http://localhost:3000');
```
#### Options
1. app: The app name
2. monitorInterval: The interval(seconds) of monitor process, default to 5 seconds
3. routeMetric: Log metric for each route, default: false

#### Tracer
Each http request/response or mongo operation will be logged.

##### useage
###### http trace
```javascript

// app.js
app.use(tMetrics.tracer); // inject the superagent tracer middleware

// a.js
const request = tMetrics.superagent;
const res = yield request.get('/xxxxx');
```

###### monk trace
```javascript

//db.js
const monk = require('monk');
const demoDB = monk(connectionURI, options);
demoDB.addMiddleware(tMetrics.monkTracer);
module.exports.demoDB = demoDB;
```

###### method trace
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

log format:
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
