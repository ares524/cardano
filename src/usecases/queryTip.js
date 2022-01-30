const ccli = require('../services/cardano-cli');

function queryTip() {
  return ccli.queryTip();
}

module.exports = queryTip;
