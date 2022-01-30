const ccli = require('../services/cardano-cli');

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
    // value going to receiver
    {
      address: receiverWallet.paymentAddr,
      value: {
        // send full balance from masterWallet
        lovelace: masterCachedUtxos.value.lovelace,
      },
    },
  ],
  metadata: {
    1: {
      ccli: 'CardanoCLI',
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

// pay the fee by subtracting it from the receiverWallet utxo
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
