# t-koa-metrics
> 🔨 api metrics utils for koa 1.x & 2.x

## Useage

### Trace
1. Service Trace: inject x-thimble-trace-id & x-thimble-service to every http request
2. AWS Trace: trace the AWS requests
3. HTTP Trace: trace the extranel http requests
4. Monk Trace: trace the time elapased when doing some mongo operations

### Http Trace Supported HTTP Clients
1. [superagent](https://www.npmjs.com/package/superagent)
2. [node-fetch](https://www.npmjs.com/package/node-fetch)
3. [axios](https://www.npmjs.com/package/axios)

### Monitor
1. Node Process Monitor: monitor the system and node process
2. Router Monitor: monitor the router of koa 1.x & 2.x

## Getting started

### Koa V1

```javascript
const koa = require('koa')  // koa v1
const ThimbleTracker = require('t-koa-metrics')

const tracker = new ThimbleTracker({
  service: 'demo-service',
});

const app = tracker.createKoaV1(koa());
const routesPath = path.join(__dirname, 'routes');

fs.readdirSync(routesPath).forEach(file => {
  if (file[0] === '.') return;
  require(`${routesPath}/${file}`)(app, app.router);
});

app.start(3000, () => {
  console.log('server started!');
});

```

### Koa V2
```javascript
const Koa = require('koa');
const ThimbleTracker = require('t-koa-metrics')

const tracker = new ThimbleTracker({
  service: 'demo-app',
});

const app = tracker.createKoaV2(new Koa());

app.router.get('/trace-id', async (ctx) => {
  ctx.body = {
    traceId: ctx.state.traceInfo.traceId,
  };
});

app.build().start(3000).then(() => {
  console.log('server started!');
})
```

### Monk Tracing

```javascript
const monk = require('monk');
const config = require('config');
const ThimbleTracker = require('t-koa-metrics')

const userDb = monk(`${config.db.url}${config.user.db}`, config.db.options);
const tracker = new ThimbleTracker({
  service: 'demo-app',
});

tracker.monkInspector.traceDB(db); // apply the middleware to trace it
```

## Options

| Options | Type | Default Value | Description |
| --- | --- | --- | --- |
| service | string *required* | undefined | the identity of the service |
| auto_start | boolean | true | auto start monitor & tracing when server start |
| trace | object | {http: true, monk: true} | the settings about tracing |
| trace.http | boolean | true | trace http requests |
| trace.monk | boolean | true | trace monk operations |
| monitor | object |  | the settings about monitor |
| monitor.process | boolean | true | monitor the node process |
| monitor.route | boolean | true | monitor each route |
| monitor.interval | number | 5 | interval for print monitor information, timeunit: second |

## Thimble router
If you want to get statistics of a specific route, there are some methods in `app.router`.
1. `app.router.tGet` : similar to `app.router.get` but with statistics
2. `app.router.tPut` : similar to `app.router.put` but with statistics
3. `app.router.tPost` : similar to `app.router.post` but with statistics
4. `app.router.tDel` : similar to `app.router.del` but with statistics
## Log Types (filed: type)
1. thimble-trace: http|monk|AWS trace log
2. route-stats: koa route stats
3. process-metrics: node process stats

## Development

1. Install Dependencies(Only Using yarn) `yarn install`
2. Coding
3. Format Files(Prettier) `yarn run prettier`
