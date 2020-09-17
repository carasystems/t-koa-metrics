// Type definitions for t-koa-metrics

import * as BunyanLogger from 'bunyan';
import { IMonkManager } from 'monk';
import * as Koa from 'koa';
import * as pathToRegexp from 'path-to-regexp';
import { SuperAgentStatic } from 'superagent';

/// <reference types="node" />
declare namespace KoaRoute {
  type Path = string | RegExp | Array<string | RegExp>;

  type Handler = (this: Koa.Context, ctx: Koa.Context, ...params: any[]) => any;

  type CreateRoute = (routeFunc: Handler) => Koa.Middleware;

  interface Method {
    (path: Path): CreateRoute;
    (path: Path, fn: Handler, opts?: pathToRegexp.ParseOptions & pathToRegexp.RegExpOptions): Koa.Middleware;
  }

  type CreateMethod = (method: string) => Method;

  interface Routes {
    all: Method;
    acl: Method;
    bind: Method;
    checkout: Method;
    connect: Method;
    copy: Method;
    delete: Method;
    del: Method;
    get: Method;
    head: Method;
    link: Method;
    lock: Method;
    msearch: Method;
    merge: Method;
    mkactivity: Method;
    mkcalendar: Method;
    mkcol: Method;
    move: Method;
    notify: Method;
    options: Method;
    patch: Method;
    post: Method;
    propfind: Method;
    proppatch: Method;
    purge: Method;
    put: Method;
    rebind: Method;
    report: Method;
    search: Method;
    subscribe: Method;
    trace: Method;
    unbind: Method;
    unlink: Method;
    unlock: Method;
    unsubscribe: Method;
  }
}

declare namespace TKoaMetrics {
  interface Options {
    app: string;
    trace_http?: boolean;
    trace_monk?: boolean;
    monitor_node_process?: boolean;
    monitorInterval?: number;
    routeMetric?: boolean;
    autoStart?: boolean;
    logger?: BunyanLogger;
    ignorePaths?: string[];
  }

  interface MonkInspector {
    traceDB: (db: IMonkManager) => void;
  }

  interface HttpClient {
    get: <T>(url: string, config?: RequestConfig) => Promise<T>;
    post: <T>(url: string, data?: Record<string, unknown>, config?: RequestConfig) => Promise<T>;
    put: <T>(url: string, data?: Record<string, unknown>, config?: RequestConfig) => Promise<T>;
    del: <T>(url: string, data?: Record<string, unknown>, config?: RequestConfig) => Promise<T>;
    head: <T>(url: string, config?: RequestConfig) => Promise<T>;
  }

  interface RequestConfig {
    headers?: Record<string, string>;
  }

  interface KoaInstance extends Koa {
    start: () => any;
  }

  interface KoaMetricsInstance {
    monkInspector: MonkInspector
    config: {
      init: () => Promise<void>,
      [key: string]: any,
    };
    start: () => any;
    koaV2: (constr: typeof Koa) => KoaInstance;
    koaV1: (constr: typeof Koa) => KoaInstance;
    createKoaV1: (app: Koa) => KoaInstance;
    createKoaV2: (app: Koa) => KoaInstance;
    route: KoaRoute.Routes;
    superagent: SuperAgentStatic;
    createHttpClient: (options: {
      apiBase?: string;
    }) => HttpClient;
  }
}

declare function TKoaMetrics(options: TKoaMetrics.Options): TKoaMetrics.KoaMetricsInstance;

export = TKoaMetrics;
