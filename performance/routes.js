module.exports = (app, route) => {
  app.use(route.get('/', function* status(next) {
    if (this.method !== 'GET') return yield next;

    this.body = {
      status: 'ok',
    };

    return this.body;
  }));
};
