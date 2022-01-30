#!/usr/bin/node

require('dotenv').config();

const chalk = require('chalk');
const { Command } = require('commander');

const ccli = require('./services/cardano-cli');

const queryTip = require('./usecases/queryTip');
const queryTxById = require('./usecases/queryTxById');
const createWallet = require('./usecases/createWallet');
const sendOneToOne = require('./usecases/sendOneToOne');
const sendOneToMany = require('./usecases/sendOneToMany');
const sendManyToOne = require('./usecases/sendManyToOne');

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
      console.log(chalk.green(`'${account}' balance:`), JSON.stringify(wallet.balance(), null, 2));
    });
  });

const sendCmd = program.command('send').description('Wallet Send Transaction Management');

// one-to-one
sendCmd
  .command('one-to-one')
  .description('Send ADA from one wallet to a given receiver address')
  .requiredOption('-f, --from <account>', 'The sender wallet account name')
  .requiredOption('-t, --to <address>', 'The receiver wallet payment address')
  .option('-a, --amount <number>', 'The amount to send (in ADA)')
  .option('--full', 'When provided, transfers the entire balance sender to receiver')
  .action(({ from, to, amount, full }) => {
    if (!amount && !full) {
      console.log(`error: required option '-a, --amount <number>' or '--full' not specified`);
      return;
    }

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
  .description('Send ADA from one wallet to a given list of receiver addresses')
  .requiredOption('-f, --from <account>', 'The sender wallet account name')
  .requiredOption('-t, --to <addresses...>', 'The receiver wallet payment addresses')
  .option('-a, --amount <number>', 'The amount to send (in ADA) from each sender wallet')
  .action(({ from, to, amount }) => {
    console.log(`Sending ${chalk.blue(`${amount} ADA`)} from ${chalk.yellow(from)}' to\n${to.map((addr) => `'${chalk.yellow(addr)}'`).join('\n')}`);
    try {
      const tx = sendOneToMany(from, to, amount);
      console.log(chalk.green(`Transaction:`), tx);
    } catch (error) {
      console.log(chalk.red(`Error:`), error);
    }
  });

// many-to-one (MINT)
sendCmd
  .command('mint')
  .description('Send ADA from a given list of sender accounts to a given receiver address in multiple transactions (pay fee for each transaction)')
  .requiredOption('-f, --from <accounts...>', 'The sender wallet account names')
  .requiredOption('-t, --to <address>', 'The receiver wallet payment address')
  .option('-a, --amount <number>', 'The amount to send (in ADA)')
  .option('--full', 'When provided, transfers the entire balance of each sender to receiver')
  .action(({ from: fromAccounts, to, amount, full }) => {
    if (!amount && !full) {
      console.log(`error: required option '-a, --amount <number>' or '--full' not specified`);
      return;
    }

    console.log(
      `Sending ${chalk.blue(full ? `full balance` : `${amount} ADA`)} from ${fromAccounts
        .map((addr) => `'${chalk.yellow(addr)}'`)
        .join(', ')} to '${chalk.yellow(to)}'`
    );

    fromAccounts.forEach((account) => {
      try {
        const tx = sendOneToOne(account, to, { amount, fullBalance: full });
        console.log(chalk.green(`Transaction ${account}:`), tx);
      } catch (error) {
        console.log(chalk.red(`Error ${account}:`), error);
      }
    });
  });

// many-to-one (CLEAR)
sendCmd
  .command('clear')
  .description('Send ADA from a given list of sender accounts to a given receiver address in one transaction (pay fee for one transaction)')
  .requiredOption('-f, --from <accounts...>', 'The sender wallet account names')
  .requiredOption('-t, --to <address>', 'The receiver wallet payment address')
  .option('-a, --amount <number>', 'The amount to send (in ADA)')
  .option('--full', 'When provided, transfers the entire balance of each sender to receiver')
  .action(({ from: fromAccounts, to, amount, full }) => {
    if (!amount && !full) {
      console.log(`error: required option '-a, --amount <number>' or '--full' not specified`);
      return;
    }

    console.log(
      `Sending ${chalk.blue(full ? `full balance` : `${amount} ADA`)} from ${fromAccounts
        .map((addr) => `'${chalk.yellow(addr)}'`)
        .join(', ')} to '${chalk.yellow(to)}'`
    );

    try {
      const txHash = sendManyToOne(fromAccounts, to, { amount, fullBalance: full });
      console.log(chalk.green(`Transaction:`), txHash);
    } catch (error) {
      console.log(chalk.red(`Error`), error);
    }
  });

const transactionCmd = program.command('transaction').description('Blockchain Transaction Management');

transactionCmd
  .command('status')
  .description('Print the transaction details')
  .argument('<id>', 'The transaction id')
  .action(async (id) => {
    const tx = await queryTxById(id);
    console.log(chalk.green(`Transaction:`), JSON.stringify(tx, null, 2));
  });

program
  .command('status')
  .description('Make a simple query tip to the current cardano-node')
  .action(() => {
    console.log(queryTip());
  });

program.parse();
