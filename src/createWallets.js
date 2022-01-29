const uuid = require('uuid');
const CardanoCLI = require('./cardanocli-js');

const shelleyGenesisPath = `${process.env.NODE_BASE_FOLDER}/config/mainnet-shelley-genesis.json`;

const ccli = new CardanoCLI({
  shelleyGenesisPath,
  cliPrefix: process.env.APP_CLI_PREFIX,
  cliPath: process.env.APP_CLI_COMMAND_PATH,
  dir: `./data`,
});

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

// const masterWallet = createWallet(`master`);
// console.log(`[master wallet]`, masterWallet.paymentAddr);

// const receiverWallet = createWallet(`receiver`);
// console.log(`[receiver wallet]`, receiverWallet.paymentAddr);

for (let id = 0; id < 10; id++) {
  const account = uuid.v4();
  const wallet = createWallet(account);
  console.log(`[wallet #${id + 1}]`, wallet.paymentAddr);
}

// const wallet = ccli.wallet(`master`);
// console.log(`balance`, wallet.balance());
// console.log(`reward`, wallet.reward());

// console.log(ccli.transactionView(`093b407764e632562307a8a74038c1664127a6d4d393289d1bb13bda01e45880`));
