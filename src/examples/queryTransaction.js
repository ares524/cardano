const ccli = require('../services/cardano-cli');

const transactionHash = `/data/tmp/tx_iada24j7z.signed`;

console.log(ccli.transactionView({ txFile: transactionHash }));
