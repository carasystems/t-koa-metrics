// Type definitions for t-koa-metrics

import { IMonkManager } from 'monk';
import * as Koa from 'koa';
import * as pathToRegexp from 'path-to-regexp';
import * as Koa2Router from '@koa/router';

/// <reference types="node" />
declare namespace TKoa1Router {
  type Path = string | RegExp | Array<string | RegExp>;

  type Handler = (this: Koa.Context, ctx: Koa.Context, ...params: any[]) => any;

  type CreateRoute = (routeFunc: Handler) => Koa.Middleware;

  interface Method {
    (path: Path): CreateRoute;
    (path: Path, fn: Handler, opts?: pathToRegexp.ParseOptions & pathToRegexp.RegExpOptions): Koa.Middleware;
  }

  type CreateMethod = (method: string) => Method;

  interface Router {
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
    tGet: Method;
    tPut: Method;
    tPost: Method;
    tDel: Method;
  }
}

declare namespace TKoa2Router {
  class Router<StateT = any, CustomT = {}> extends  Koa2Router {
      tGet<T, U>(
          name: string,
          path: string | RegExp,
          ...middleware: Array<Koa2Router.Middleware<StateT, CustomT>>
      ): Router<StateT & T, CustomT & U>
      tGet<T, U>(
          path: string | RegExp,
          ...middleware: Array<Koa2Router.Middleware<StateT, CustomT>>
      ): Router<StateT & T, CustomT & U>;
      tPut<T, U>(
          name: string,
          path: string | RegExp,
          ...middleware: Array<Koa2Router.Middleware<StateT, CustomT>>
      ): Router<StateT & T, CustomT & U>
      tPut<T, U>(
          path: string | RegExp,
          ...middleware: Array<Koa2Router.Middleware<StateT, CustomT>>
      ): Router<StateT & T, CustomT & U>;
      tPost<T, U>(
          name: string,
          path: string | RegExp,
          ...middleware: Array<Koa2Router.Middleware<StateT, CustomT>>
      ): Router<StateT & T, CustomT & U>
      tPost<T, U>(
          path: string | RegExp,
          ...middleware: Array<Koa2Router.Middleware<StateT, CustomT>>
      ): Router<StateT & T, CustomT & U>;
      tDel<T, U>(
          name: string,
          path: string | RegExp,
          ...middleware: Array<Koa2Router.Middleware<StateT, CustomT>>
      ): Router<StateT & T, CustomT & U>
      tDel<T, U>(
          path: string | RegExp,
          ...middleware: Array<Koa2Router.Middleware<StateT, CustomT>>
      ): Router<StateT & T, CustomT & U>;
    }
}

declare var config: Tracker.IConfig;
declare namespace Tracker {
  type Region = 'us-east-1' | 'us-east-2' | 'us-west-1' | 'us-west-2';
  interface Options {
    service: string;
    region: Region;
    trace?: {
      http?: boolean;
      monk?: boolean;
    };
    monitor?: {
      process?: boolean;
      route?: boolean;
      interval?: number;
    },
    config?: {
      enable?: boolean;
    }
  }

  interface MonkInspector {
    traceDB: (db: IMonkManager) => void;
    shutdown: () => void;
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

  interface Koa1Instance extends Koa {
    start: (port?: number, callback?: () => void) => void;
    router: TKoa1Router.Router;
  }

  interface Koa2Instance extends Koa {
    build: () => Koa2Instance;
    start: (port?: number) => Promise<void>;
    router: TKoa2Router.Router;
  }

  interface IConfig {
    [key: string]: any;
  }
  export class Tracker {
    constructor(options: Tracker.Options);
    monkInspector: Tracker.MonkInspector;
    config: IConfig;
    createKoaV1: (app: Koa) => Tracker.Koa1Instance;
    createKoaV2: (app: Koa) => Tracker.Koa2Instance;
  }

  export const config;

  export const getSecretValue:(region: string, env: string, service: string, key: string) => Promise<any>;
}

export = Tracker;
