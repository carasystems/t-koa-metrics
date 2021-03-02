/* eslint-env node, mocha */

const request = require('supertest');
const superagent = require('superagent');
const Koa = require('koa-v2');
const Router = require('@koa/router');
const { expect } = require('chai');
const uuid = require('uuid');
const trace = require('../../lib/koa2/tracer');
const consts = require('../../lib/constants');
const { inject } = require('../../lib/http/superagent');

inject({});

describe('test suite for tracer with koa2', () => {
  it('should pass the traceId when receive an request', (done) => {
    const app = new Koa();
    const router = new Router();
    app.use(trace());
    router.get('/trace-id', (ctx) => {
      ctx.body = ctx.state.traceInfo.traceId;
    });
    app.use(router.routes());
    const server = app.listen();

    request(server)
      .get('/trace-id')
      .expect(200)
      .end((err, res) => {
        if (res) {
          const traceId = res.text;
          const traceIdInHeader = res.headers[consts.HTTP_HEADER_TRACE_ID];
          expect(traceId).to.have.lengthOf(36);
          expect(traceIdInHeader).to.have.lengthOf(36);
          expect(traceId).to.equal(traceIdInHeader);
        }
        server.close();
        done(err);
      });
  });

  it('concurrent request', () => {
    const requestId1 = uuid.v4();
    const requestId2 = uuid.v4();

    const app = new Koa();
    const router = new Router();
    async function asyncFoo() {
      const res = await superagent.get('http://localhost:9999/request2');
      return res.text;
    }

    router.get('/request', async (ctx) => {
      const res = await asyncFoo();
      ctx.body = res;
    });
    app.use(trace());
    app.use(router.routes());
    const server = app.listen();

    const app2 = new Koa();
    app2.use(trace());
    const router2 = new Router();
    router2.get('/request2', (ctx) => {
      ctx.body = ctx.state.traceInfo.traceId;
    });

    app2.use(router2.routes());
    const server2 = app2.listen(9999);

    const testServer = request(server);
    return Promise.all([
      testServer
        .get('/request')
        .set(consts.HTTP_HEADER_TRACE_ID, requestId1)
        .expect(200)
        .then((res) => res.text),
      testServer
        .get('/request')
        .set(consts.HTTP_HEADER_TRACE_ID, requestId2)
        .expect(200)
        .then((res) => res.text),
    ])
      .then(([id1, id2]) => {
        expect(id1).to.equal(requestId1);
        expect(id2).to.equal(requestId2);
      })
      .finally(() => {
        server.close();
        server2.close();
      });
  });
});
