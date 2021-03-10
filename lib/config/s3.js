const AWS = require('aws-sdk');

const S3BucketMap = {
  stage: 'thimble-demo-secrets',
  production: 'tcc',
};

class S3ConfigClient {
  constructor(env, service) {
    this.client = new AWS.S3();
    this.env = env || 'default';
    this.service = service;
    this.bucket = S3BucketMap[this.env];
    this.key = `${this.service}/config.json`;
    this.lastEtag = null;
  }

  async getConfig() {
    if (this.env !== 'stage' && this.env !== 'production') {
      return null;
    }

    const req = {
      Bucket: this.bucket,
      Key: this.key,
    };

    if (this.lastEtag) {
      req.IfNoneMatch = this.lastEtag;
    }

    try {
      const resp = await this.client.getObject(req).promise();
      this.lastEtag = resp.ETag;
      return JSON.parse(resp.Body.toString());
    } catch (err) {
      if (err.statusCode && err.statusCode === 304) {
        return null;
      }
      throw err;
    }
  }
}

module.exports = S3ConfigClient;
