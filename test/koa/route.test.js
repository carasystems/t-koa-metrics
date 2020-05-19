/* eslint-env node, mocha */
const request = require('supertest');
const Koa = require('koa-v1');
const methods = require('methods')
  .map((method) => {
    // normalize method names for tests
    if (method === 'delete') return 'del';
    if (method === 'connect') return ''; // WTF
    if (method === 'merge') return '';
    return method;
  })
  .filter(Boolean);

const route = require('../../lib/koa/route')();

methods.forEach((method) => {
  const app = new Koa();

  app.use(
    // eslint-disable-next-line require-yield
    route[method]('/:user(tj)', function* handle(user) {
      this.body = user;
    })
  );

  describe(`route.${method}()`, () => {
    describe('when method and path match', () => {
      it('should 200', (done) => {
        const server = app.listen();
        request(server)
          // eslint-disable-next-line no-unexpected-multiline
          [method]('/tj')
          .expect(200)
          .expect(method === 'head' ? undefined : 'tj')
          .end((err) => {
            server.close();
            done(err);
          });
      });
    });

    describe('when only method matches', () => {
      it('should 404', (done) => {
        const server = app.listen();
        request(server)
          // eslint-disable-next-line no-unexpected-multiline
          [method]('/tjayyyy')
          .expect(404)
          .end((err) => {
            server.close();
            done(err);
          });
      });
    });

    describe('when only path matches', () => {
      it('should 404', (done) => {
        const server = app.listen();
        request(server)
          [
            // eslint-disable-next-line no-unexpected-multiline
            method === 'get' ? 'post' : 'get'
          ]('/tj')
          .expect(404)
          .end((err) => {
            server.close();
            done(err);
          });
      });
    });
  });
});

describe('route.all()', () => {
  describe('should work with', () => {
    methods.forEach((method) => {
      const app = new Koa();
      app.use(
        // eslint-disable-next-line require-yield
        route.all('/:user(tj)', function* handle(user) {
          this.body = user;
        })
      );

      it(method, (done) => {
        const server = app.listen();
        request(server)
          // eslint-disable-next-line no-unexpected-multiline
          [method]('/tj')
          .expect(200)
          .expect(method === 'head' ? undefined : 'tj')
          .end((err) => {
            server.close();
            done(err);
          });
      });
    });
  });

  describe('when patch does not match', () => {
    it('should 404', (done) => {
      const app = new Koa();
      app.use(
        // eslint-disable-next-line require-yield
        route.all('/:user(tj)', function* handle(user) {
          this.body = user;
          return this.body;
        })
      );

      const server = app.listen();
      request(server)
        .get('/tjayyyyyy')
        .expect(404)
        .end((err) => {
          server.close();
          done(err);
        });
    });
  });
});
