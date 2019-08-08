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
const route = tMetrics.route;

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
