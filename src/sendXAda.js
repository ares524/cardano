const CardanoCLI = require('./cardanocli-js');

const shelleyGenesisPath = `${process.env.NODE_BASE_FOLDER}/config/mainnet-shelley-genesis.json`;

const ccli = new CardanoCLI({
  shelleyGenesisPath,
  cliPrefix: process.env.APP_CLI_PREFIX,
  cliPath: process.env.APP_CLI_COMMAND_PATH,
  dir: `./data`,
});

const transferAmountADA = 5;
const transferAmountLovelace = ccli.toLovelace(transferAmountADA);

const masterWallet = ccli.wallet('master');
console.log(`[master wallet]`, masterWallet.paymentAddr);

const masterCachedUtxos = masterWallet.balance();

console.log('Balance of Sender wallet: ' + ccli.toAda(masterCachedUtxos.value.lovelace) + ' ADA');

// receiver address
const receiverWallet = ccli.wallet('receiver');
console.log(`[receiver wallet]`, receiverWallet.paymentAddr);

// create raw transaction
let txInfo = {
  txIn: masterCachedUtxos.utxo,
  // txIn: ccli.queryUtxo(masterWallet.paymentAddr),
  txOut: [
    // value going back to masterWallet
    {
      address: masterWallet.paymentAddr,
      value: {
        lovelace: masterCachedUtxos.value.lovelace - transferAmountLovelace,
      },
    },
    // value going to receiver
    {
      address: receiverWallet.paymentAddr,
      value: {
        lovelace: transferAmountLovelace,
      },
    },
  ],
  metadata: {
    1: {
      ccli: 'First Metadata from cardanocli-js',
    },
  },
};

console.log(`[create raw transaction]`, txInfo);

let raw = ccli.transactionBuildRaw(txInfo);

// calculate fee
let fee = ccli.transactionCalculateMinFee({
  ...txInfo,
  txBody: raw,
  witnessCount: 1,
});

console.log(`[calculate fee]`, fee);

// pay the fee by subtracting it from the masterWallet utxo
txInfo.txOut[0].value.lovelace -= fee;

// create final transaction
let tx = ccli.transactionBuildRaw({ ...txInfo, fee });
console.log(`[create final transaction]`, tx);

// sign the transaction
let txSigned = ccli.transactionSign({
  txBody: tx,
  signingKeys: [masterWallet.payment.skey],
});
console.log(`[sign the transaction]`, txSigned);

// broadcast transaction
let txHash = ccli.transactionSubmit(txSigned);
console.log(`[broadcast transaction]`, txHash);
