/* eslint-env node, mocha */

const request = require('supertest');

const KoaV1 = require('koa-v1');
const monk = require('monk');
const KoaV2 = require('koa-v2');
const Router = require('@koa/router');
const chai = require('chai');
const spies = require('chai-spies');
const { expect } = require('chai');
const Tracker = require('../lib');

chai.use(spies);

const spiedLogger = {
  // eslint-disable-next-line no-console
  info: chai.spy(console.log),
  // eslint-disable-next-line no-console
  error: chai.spy(console.error),
};

const metrics = new Tracker({
  service: 'demo-service',
  logger: spiedLogger,
});

const demoDb = metrics.monkInspector.traceDB(monk('mongodb://localhost:27017/demo'));

describe('integration test for koa', () => {
  it('work with koa v1', (done) => {
    const app = metrics.createKoaV1(KoaV1());
    app.use(
      // eslint-disable-next-line require-yield
      metrics.router.get('/trace-id', function* handle() {
        const query = yield demoDb.get('user').find({
          name: 'abc',
        });

        this.body = {
          traceId: this.traceInfo.traceId,
          query,
        };
        return this.body;
      })
    );

    const server = app.start();
    request(server)
      .get('/trace-id')
      .expect(200)
      .end((err, res) => {
        server.close();
        expect(res.body.traceId).to.have.lengthOf(36);
        expect(spiedLogger.info).to.have.been.called();
        done(err);
      });
  });

  it('work with koa v2', (done) => {
    const app = metrics.createKoaV2(new KoaV2());
    const router = new Router();
    router.get('/trace-id', async (ctx) => {
      const query = await demoDb.get('user').find({
        name: 'abc',
      });

      ctx.body = {
        query,
        traceId: ctx.state.traceInfo.traceId,
      };
    });
    app.use(router.routes());

    const server = app.start();

    request(server)
      .get('/trace-id')
      .expect(200)
      .end((err, res) => {
        server.close();
        expect(res.body.traceId).to.have.lengthOf(36);
        expect(spiedLogger.info).to.have.been.called();
        done(err);
      });
  });
});
