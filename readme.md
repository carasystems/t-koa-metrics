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
log format:
```javascript

{
  "app": "api-mobile",
  "request_id": "c1b43018-3fa8-4a73-817a-79e97fa91adc",
  "request_at": "2019-10-11T06:00:49.057Z",
  "request_target": "http://127.0.0.1:8888/request2",
  "request_type": "http_request" || "mongo",
  "http_method": "GET || POST || DELETE",
  "process_time": "2.214839"
}

```
It will contains a trace id in the request header named: `x-thimble-tracer-id`
