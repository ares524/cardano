const wallets = require('../store/wallets');
const createWallet = require('../usecases/createWallet');

for (const account of wallets) {
  try {
    const wallet = createWallet(account);
    console.log(`[${account} wallet addr]`, wallet.paymentAddr);
  } catch (err) {
    console.log(`[${account} error]`, err.message);
  }
}
