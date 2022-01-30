const CardanoCLI = require('../../wrapper');

const shelleyGenesisPath = `${process.env.NODE_BASE_FOLDER}/config/mainnet-shelley-genesis.json`;

const ccli = new CardanoCLI({
  shelleyGenesisPath,
  cliPrefix: process.env.APP_CLI_PREFIX,
  cliPath: process.env.APP_CLI_COMMAND_PATH,
  dir: `./data`,
});

module.exports = ccli;
