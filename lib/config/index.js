const path = require('path');
const fs = require('fs');
const s3Client = require('./s3');
const objUtils = require('../util/objects');
const { createLogger } = require('../logger');

const ALLOWED_FORMAT = ['.js', '.json'];

const S3BucketMap = {
  stage: 'tcc-stage',
  production: 'tcc',
};

const REFRESH_INTERVAL = 1000 * 20;

function loadAppName() {
  const fullPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(fullPath)) {
    throw new Error(`No package found in ${process.cwd()}`);
  }
  // eslint-disable-next-line
  const packageJSON = require(fullPath);
  const appName = packageJSON.name;
  if (!appName) {
    throw new Error('No name found in package.json');
  }

  return appName;
}

function getMatchedFile(dir, name) {
  for (let i = 0; i < ALLOWED_FORMAT.length; i += 1) {
    const fullPath = path.join(dir, name, ALLOWED_FORMAT[i]);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }

  return null;
}

const rewriteObj = (obj, newObj) => {
  Object.keys(obj).forEach((prop) => {
    // eslint-disable-next-line no-param-reassign
    delete obj[prop];
  });

  Object.keys(newObj).forEach((prop) => {
    // eslint-disable-next-line no-param-reassign
    Object.defineProperty(obj, prop, {
      enumerable: true,
      value: objUtils.makeImmutable(newObj[prop]),
      writable: false,
      configurable: true,
    });
  });
};

class ThimbleConfig {
  constructor() {
    // flag for init
    this.inited = false;

    // the config instance
    this.configObj = {};

    // refresh tick
    this.tickId = null;

    // node env
    this.env = process.env.NODE_ENV || 'dev';

    // app info
    this.appName = loadAppName();

    // logger
    this.logger = createLogger(this.appName);

    // etag for remote config file
    this.remoteLastEtag = null;

    this.remoteBucket = S3BucketMap[this.env]; // 'thimble-demo-secrets' S3BucketMap[this.env];
    this.remoteKey = `${this.appName}/config.json`; // '1.json' `${this.appName}/config.json`;

    // proxy handler
    this.proxyHandler = {
      get: (target, prop) => {
        if (!this.inited) {
          throw new Error("Thime config haven't initialized yet");
        }
        return this.configObj[prop];
      },
    };

    // the config instance proxy
    this.proxy = {};
    this.proxy.init = this.init.bind(this);
    setTimeout(this.refresh.bind(this), REFRESH_INTERVAL);
  }

  loadFromLocal() {
    const confDir = path.join(process.cwd(), 'config');
    const defaultConfFile = getMatchedFile(confDir, 'default');
    const configFiles = [];
    if (defaultConfFile) {
      configFiles.push(defaultConfFile);
    }

    if (this.env && this.env !== 'default') {
      const file = getMatchedFile(confDir, this.env);
      if (!file) {
        this.logger.warn('No config file found with extension js|json in config directory');
      } else {
        configFiles.push(file);
      }
    }

    const config = {};
    configFiles.forEach((configFile) => {
      // eslint-disable-next-line
      const loaded = require(configFile);
      objUtils.objUtils(config, loaded);
    });
    return config;
  }

  loadFromRemote() {
    return new Promise((resolve, reject) => {
      if (!this.remoteBucket) {
        resolve();
        return;
      }
      s3Client
        .getObject(this.remoteBucket, this.remoteKey, this.remoteLastEtag)
        .then((result) => {
          this.remoteLastEtag = result.ETag;
          resolve(JSON.parse(result.Body.toString()));
        })
        .catch((err) => {
          if (err.statusCode === 304) {
            resolve();
          } else if (err.statusCode === 404) {
            this.logger.warn('No remote config found for this app, skip');
            this.remoteBucket = null;
            resolve();
          } else {
            this.logger.warn(err);
            reject(err);
          }
        });
    });
  }

  mergeWithRemote(remoteConfig) {
    if (remoteConfig) {
      this.logger.info('found updated remote config, merge with it');
      const config = objUtils.deepExtend({}, this.localConfig);
      objUtils.deepExtend(config, remoteConfig);
      // this.configObj = objUtils.makeImmutable(config);
      rewriteObj(this.proxy, config);
    } else if (!this.inited) {
      const config = objUtils.deepExtend({}, this.localConfig);
      // this.configObj = objUtils.makeImmutable(config);
      rewriteObj(this.proxy, config);
    }
  }

  load() {
    return new Promise((resolve) => {
      if (!this.localConfig) {
        this.localConfig = this.loadFromLocal();
      }
      this.loadFromRemote().then((remoteConfig) => {
        this.mergeWithRemote(remoteConfig);
        resolve(this.configObj);
      });
    });
  }

  refresh() {
    if (!this.inited) {
      // skip, set next
      setTimeout(this.refresh.bind(this), REFRESH_INTERVAL);
    } else {
      this.load()
        .then(() => {
          this.logger.info('refresh done');
        })
        .finally(() => {
          setTimeout(this.refresh.bind(this), REFRESH_INTERVAL);
        });
    }
  }

  init() {
    return new Promise((resovle, reject) => {
      if (this.inited) {
        resovle();
      } else {
        this.load()
          .then(() => {
            this.inited = true;
            resovle();
          })
          .catch(reject);
      }
    });
  }
}

const instance = new ThimbleConfig();
module.exports = instance.proxy;

// test:
// instance.init().then(() => {
//   setInterval(() => {
//     console.log('check->', instance.proxy.a);
//     instance.proxy.a = 'foo';
//     console.log('after->', instance.proxy.a);
//   }, 10000);
// });
