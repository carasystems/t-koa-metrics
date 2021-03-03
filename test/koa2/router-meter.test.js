/* eslint-env node, mocha */

const request = require('supertest');
const uuid = require('uuid');
const Koa = require('koa-v2');
const Router = require('@koa/router');
const chai = require('chai');
const sinon = require('sinon');
const Measurer = require('../../lib/monitor/measurer');

const routerMeter = require('../../lib/koa2/router-meter');

const { expect } = chai;

describe('koa2 router meter tests', () => {
  it('should work', async () => {
    const app = new Koa();
    const router = new Router();
    const measurer = new Measurer();

    const sanbox = sinon.createSandbox();
    const histogramStub = sanbox.stub(measurer, 'histogram');

    app.use(routerMeter.create(router, measurer));
    router.tGet('/trace-id', (ctx) => {
      ctx.body = 'foo';
    });

    router.tGet('/trace/:id', (ctx) => {
      ctx.body = {
        id: ctx.params.id,
      };
    });

    app.use(router.routes());

    const server = app.listen();
    await request(server).get('/trace-id').expect(200);
    server.close();
    const id = uuid.v4();
    const res = await request(server).get(`/trace/${id}`).expect(200);
    expect(res.body.id).to.equal(id);
    expect(histogramStub.callCount).to.equal(2);
    expect(histogramStub.getCall(0).firstArg).to.equal('GET /trace-id');
    expect(histogramStub.getCall(1).firstArg).to.equal('GET /trace/:id');
  });
});
