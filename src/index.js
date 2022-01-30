#!/usr/bin/node

require('dotenv').config();

const chalk = require('chalk');
const { Command } = require('commander');

const ccli = require('./services/cardano-cli');

const queryTip = require('./usecases/queryTip');
const createWallet = require('./usecases/createWallet');
const sendOneToOne = require('./usecases/sendOneToOne');
const sendOneToMany = require('./usecases/sendOneToMany');

const program = new Command();

program
  .name('cada')
  .description('A custom CLI to control and transfer tokens across multiple wallets using a local cardano-node with docker.')
  .version('0.0.1');

const walletCmd = program.command('wallet').description('Wallet Management');

walletCmd
  .command('create')
  .description('Create new wallets from a given list of accounts')
  .argument('<accounts...>', 'Wallet account names')
  .action((accounts) => {
    accounts.forEach((account) => {
      const wallet = createWallet(account);
      console.log(chalk.green(`'${account}' wallet:`), wallet.paymentAddr);
    });
  });

walletCmd
  .command('balance')
  .description('Print the wallet balance from a given list of accounts')
  .argument('<accounts...>', 'Wallet account names')
  .action((accounts) => {
    accounts.forEach((account) => {
      const wallet = ccli.wallet(account);
      console.log(chalk.green(`'${account}' balance:`), wallet.balance());
    });
  });

const sendCmd = program.command('send').description('Wallet Transaction Management');

// one-to-one
sendCmd
  .command('one-to-one')
  .description('Send ADA from one wallet to a given receiver address')
  .requiredOption('-f, --from <account>', 'The sender wallet account name')
  .requiredOption('-t, --to <address>', 'The receiver wallet payment address')
  .option('-a, --amount <number>', 'The amount to send (in ADA)')
  .option('--full', 'When provided, transfers the entire balance sender to receiver')
  .action(({ from, to, amount, full }) => {
    console.log(`Sending ${chalk.blue(full ? `full balance` : `${amount} ADA`)} from '${chalk.yellow(from)}' to '${chalk.yellow(to)}'`);
    try {
      const tx = sendOneToOne(from, to, { amount, fullBalance: full });
      console.log(chalk.green(`Transaction:`), tx);
    } catch (error) {
      console.log(chalk.red(`Error:`), error);
    }
  });

// one-to-many
sendCmd
  .command('one-to-many')
  .description('Send ADA from one wallet to a given receiver address')
  .requiredOption('-f, --from <account>', 'The sender wallet account name')
  .requiredOption('-t, --to <addresses...>', 'The receiver wallet payment addresses')
  .option('-a, --amount <number>', 'The amount to send (in ADA) from each sender wallet')
  .action(({ from, to, amount }) => {
    console.log(`Sending ${chalk.blue(`${amount} ADA`)} from ${chalk.yellow(from)}' to\n${to.map((addr) => `'${chalk.yellow(addr)}'`).join('\n')}`);
    try {
      const tx = sendOneToMany(from, amount, to);
      console.log(chalk.green(`Transaction:`), tx);
    } catch (error) {
      console.log(chalk.red(`Error:`), error);
    }
  });

program
  .command('status')
  .description('Make a simple query tip to the current cardano-node')
  .action(() => {
    console.log(queryTip());
  });

program.parse();
