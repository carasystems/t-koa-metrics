const AWS = require('aws-sdk');
const assert = require('assert');

module.exports.getSecretValue = async (region, env, service, key) => {
  assert.ok(region, 'region is required');
  assert.ok(env, 'env is required');
  assert.ok(service, 'service is required');
  assert.ok(key, 'key is required');

  const secretId = `${env}/service/${service}`;
  const client = new AWS.SecretsManager({
    region,
  });

  const secret = await client
    .getSecretValue({
      SecretId: secretId,
    })
    .promise();

  const parsed = JSON.parse(secret.SecretString);
  return parsed[key];
};
