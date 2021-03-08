const AWS = require('aws-sdk');

class AWSSecretsClient {
  constructor(env, service) {
    this.env = (env || 'default').toLowerCase();
    this.service = service;
    this.secretId = `${env}/service/${service}`;
    this.client = new AWS.SecretsManager();
    this.lastVersionId = null;
  }

  async getSecrets() {
    if (this.env !== 'stage' && this.env !== 'production') {
      return null;
    }

    const secret = await this.client
      .getSecretValue({
        SecretId: this.secretId,
      })
      .promise();

    if (this.lastVersionId === secret.VersionId) {
      return null;
    }

    this.lastVersionId = secret.VersionId;
    return JSON.parse(secret.SecretString);
  }
}

module.exports = AWSSecretsClient;
