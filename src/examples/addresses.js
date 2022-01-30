const ccli = require('../services/cardano-cli');
const wallets = require('../store/wallets');

for (const account of wallets) {
  const wallet = ccli.wallet(account);
  console.log(`[${wallet} address]`, wallet.paymentAddr);
}
