if (process.env.DISABLE_EXPRESS_LISTEN !== 'true') {
  process.env.DISABLE_EXPRESS_LISTEN = 'true';
}

const app = require('./index');

module.exports = app;
