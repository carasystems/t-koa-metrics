# koa-metrics
> 🔨 api metrics utils for koa 1.x & 2.x

## Useage
1. Service Trace: inject trace_id to each request and will passed to the services of downstream
2. Router Monitor: monitor http stats for each route
3. Builtin HttpClient: provided a http client which integrated with tracing 
4. Monk Trace: Tracing the time elapsed when doing some mongo options

## Getting started

### Koa V1

```javascript
const koa = require('koa')  // koa v1
const ThimbleTracker = require('t-koa-metrics')

const tracker = new ThimbleTracker({
  app: 'demo-app',
});

const app = tracker.createKoaV1(koa());
const routesPath = path.join(__dirname, 'routes');

fs.readdirSync(routesPath).forEach(file => {
  if (file[0] === '.') return;
  require(`${routesPath}/${file}`)(app, tracker.router);
});

app.start(3000, () => {
  console.log('server started!');
});

```

### Koa V2
```javascript
const Koa = require('koa');
const Router = require('@koa/router');
const ThimbleTracker = require('t-koa-metrics')

const tracker = new ThimbleTracker({
  app: 'demo-app',
});

const router = new Router();
router.get('/trace-id', async (ctx) => {
  ctx.body = {
    traceId: ctx.state.traceInfo.traceId,
  };
});

const app = tracker.createKoaV2(new Koa());
app.use(router.routes());
app.start(3000, () => {
  console.log('server started!');
});
```

### Monk Tracing

```javascript
const monk = require('monk');
const config = require('config');
const ThimbleTracker = require('t-koa-metrics')

const userDb = monk(`${config.db.url}${config.user.db}`, config.db.options);
const tracker = new ThimbleTracker({
  app: 'demo-app',
});

tracker.monkInspector.traceDB(db); // apply the middleware to trace it
```

## Options

| Options | Type | Default Value | Description |
| --- | --- | --- | --- |
| app | string *required* | undefined | the identity of the service |
| auto_start | boolean | true | auto start monitor & tracing when server start |
| trace | object | {http: true, monk: true} | the settings about tracing |
| trace.http | boolean | true | trace http requests |
| trace.monk | boolean | true | trace monk operations |
| monitor | object |  | the settings about monitor |
| monitor.node_process | boolean | true | monitor the node process |
| monitor.route_metric | boolean | **false** | monitor each route |
| monitor.interval | number | 5 | interval for print monitor information, timeunit: second |

## Log Types (filed: type)
1. thimble-trace: http|monk trace log
2. koa-stats: koa stats, including each route if set monitor.route_metric = true
3. process-metrics: node process stats

## Development

1. Install Dependencies(Only Using yarn) `yarn install`
2. Coding
3. Format Files(Prettier) `yarn run prettier`
