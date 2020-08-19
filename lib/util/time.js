module.exports.getElapsedMsFromHrtime = (hrtime, fixed) => {
  const delta = process.hrtime(hrtime);
  const processTime = delta[0] * 1000 + delta[1] / 1000000;
  return processTime.toFixed(fixed);
};
