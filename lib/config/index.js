const path = require('path');
const fs = require('fs');
const S3ConfigClient = require('./s3');
const SecretsConfigClient = require('./secrets');
const objUtils = require('../util/objects');
const { createLogger } = require('../logger');

const ALLOWED_FORMAT = ['js', 'json'];

const REFRESH_INTERVAL = 1000 * 20;

function getMatchedFile(dir, name) {
  for (let i = 0; i < ALLOWED_FORMAT.length; i += 1) {
    const fullPath = path.join(dir, `${name}.${ALLOWED_FORMAT[i]}`);
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
  constructor(env, service) {
    // flag for init
    this.inited = false;

    // the config instance
    this.configObj = {};

    // refresh tick
    this.tickId = null;

    // logger
    this.logger = createLogger(`t-${service}-config`);

    this.env = env;

    // etag for remote config file
    this.remoteS3LastEtag = null;
    this.s3ConfigClient = new S3ConfigClient(env, service);
    this.secretsConfigClient = new SecretsConfigClient(env, service);

    // the config instance proxy
    this.proxy = {};
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
      objUtils.deepExtend(config, loaded);
    });
    return config;
  }

  async loadFromRemote() {
    const remoteConfig = {};

    try {
      const s3Config = await this.s3ConfigClient.getConfig(this.remoteS3LastEtag);
      objUtils.deepExtend(remoteConfig, s3Config);
    } catch (err) {
      if (err.statusCode && err.statusCode === 404) {
        this.logger.warn('No remote s3 config found for this app, skip');
      }

      if (!err.statusCode || (err.statusCode !== 304 && err.statusCode !== 404)) {
        this.logger.warn(`Get config from s3 failed, message: ${err.message}`);
        throw err;
      }
    }

    try {
      const secretsConfig = await this.secretsConfigClient.getSecrets();
      objUtils.deepExtend(remoteConfig, secretsConfig);
    } catch (err) {
      if (err.statusCode && err.statusCode === 404) {
        this.logger.warn('No remote secrets config found for this app, skip');
      }

      if (!err.statusCode || (err.statusCode !== 304 && err.statusCode !== 404)) {
        this.logger.warn(`Get config from secrets failed, message: ${err.message}`);
        throw err;
      }
    }

    return remoteConfig;
  }

  mergeWithRemote(remoteConfig) {
    this.logger.info('found updated remote config, merge with it');
    const config = objUtils.deepExtend({}, this.localConfig);
    objUtils.deepExtend(config, remoteConfig);
    // this.configObj = objUtils.makeImmutable(config);
    rewriteObj(this.proxy, config);
  }

  async load() {
    if (!this.localConfig) {
      this.localConfig = this.loadFromLocal();
    }
    const remoteConfig = await this.loadFromRemote();
    if (!objUtils.isEmpty(remoteConfig)) {
      this.mergeWithRemote(remoteConfig);
    }
  }

  refresh() {
    if (!this.inited) {
      // skip, set next
      this.tickId = setTimeout(this.refresh.bind(this), REFRESH_INTERVAL);
    } else {
      this.load()
        .then(() => {
          this.logger.info('refresh done');
        })
        .finally(() => {
          this.tickId = setTimeout(this.refresh.bind(this), REFRESH_INTERVAL);
        });
    }
  }

  async init() {
    if (this.inited) {
      return;
    }

    await this.load();
    this.inited = true;
    this.tickId = setTimeout(this.refresh.bind(this), REFRESH_INTERVAL);
  }

  shutdown() {
    if (this.tickId) {
      clearTimeout(this.tickId);
    }
  }
}

module.exports = ThimbleConfig;

// test:
// instance.init().then(() => {
//   setInterval(() => {
//     console.log('check->', instance.proxy.a);
//     instance.proxy.a = 'foo';
//     console.log('after->', instance.proxy.a);
//   }, 10000);
// });
