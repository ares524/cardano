const CardanoCLI = require('./cardanocli-js');

const shelleyGenesisPath = `${process.env.NODE_BASE_FOLDER}/config/mainnet-shelley-genesis.json`;

const ccli = new CardanoCLI({
  shelleyGenesisPath,
  cliPrefix: process.env.APP_CLI_PREFIX,
  cliPath: process.env.APP_CLI_COMMAND_PATH,
  dir: `./data`,
});

const masterWallet = ccli.wallet(`master`);
console.log(`[master balance]`, masterWallet.balance());
console.log(`[master reward]`, masterWallet.reward());

const receiverWallet = ccli.wallet(`receiver`);
console.log(`[receiver balance]`, receiverWallet.balance());
console.log(`[receiver reward]`, receiverWallet.reward());
