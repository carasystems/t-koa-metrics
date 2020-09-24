const { createNamespace } = require('cls-hooked');

const ns = createNamespace('koa-metrics');

module.exports.createContext = () => ns.createContext();
module.exports.enter = (ctx) => ns.enter(ctx);
module.exports.exit = (ctx) => ns.exit(ctx);
module.exports.bindEmitter = (target) => ns.bindEmitter(target);
module.exports.bind = (fn, context) => ns.bind(fn, context);
module.exports.set = (k, v) => ns.set(k, v);
module.exports.get = (k) => ns.get(k);
