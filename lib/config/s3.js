const AWS = require('aws-sdk');

const s3 = new AWS.S3();

exports.getObject = (bucket, key, lastEtag) => {
  const getRequest = {
    Bucket: bucket,
    Key: key,
  };

  if (lastEtag) {
    getRequest.IfNoneMatch = lastEtag;
  }

  return s3.getObject(getRequest).promise();
};
