const measured = require('measured-core');

class Measurer {
  constructor(type) {
    this.measuredCollection = null;
    this.type = type || 'thimble-measue';
  }

  init() {
    if (!this.measuredCollection) {
      this.measuredCollection = measured.createCollection();
    }
  }

  histogram(key, value) {
    this.init();
    this.measuredCollection.histogram(key).update(value);
  }

  stats() {
    if (!this.measuredCollection) {
      return null;
    }

    const statsJson = this.measuredCollection.toJSON();

    // eslint-disable-next-line no-underscore-dangle
    Object.values(this.measuredCollection._metrics).forEach((item) => {
      if (item.reset) {
        item.reset();
      }
    });

    return {
      type: this.type,
      req: statsJson,
    };
  }
}

module.exports = Measurer;