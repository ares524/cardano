const CardanoCLI = require('../../wrapper');

const shelleyGenesisPath = `${process.env.NODE_BASE_FOLDER}/config/${process.env.CARDANO_NODE_NETWORK}-shelley-genesis.json`;

const ccli = new CardanoCLI({
  shelleyGenesisPath,
  cliPrefix: process.env.APP_CLI_PREFIX,
  cliPath: process.env.APP_CLI_COMMAND_PATH,
  network: process.env.CARDANO_NODE_NETWORK,
  dir: process.env.CARDANO_NODE_NETWORK === 'mainnet' ? `./data` : `./data-testnet`,
});

module.exports = ccli;
