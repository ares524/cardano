const ccli = require('../services/cardano-cli');

const createWallet = (account) => {
  const payment = ccli.addressKeyGen(account);
  const stake = ccli.stakeAddressKeyGen(account);
  ccli.stakeAddressBuild(account);

  ccli.addressBuild(account, {
    paymentVkey: payment.vkey,
    stakeVkey: stake.vkey,
  });
  return ccli.wallet(account);
};

module.exports = createWallet;
