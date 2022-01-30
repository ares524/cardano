const ccli = require('../services/cardano-cli');

function sendOneToMany(senderAccount, receiverAddresses, amount) {
  const transferAmountLovelace = ccli.toLovelace(amount);

  const senderWallet = ccli.wallet(senderAccount);
  const senderCachedUtxos = senderWallet.balance();

  // create raw transaction
  const txInfo = {
    txIn: senderCachedUtxos.utxo,
    // txIn: ccli.queryUtxo(senderWallet.paymentAddr),
    txOut: [
      // value going back to senderWallet
      {
        address: senderWallet.paymentAddr,
        value: {
          lovelace: senderCachedUtxos.value.lovelace - transferAmountLovelace * receiverAddresses.length,
        },
      },
      // value going to receivers
      ...receiverAddresses.map((receiverAddress) => ({
        address: receiverAddress,
        value: {
          lovelace: transferAmountLovelace,
        },
      })),
    ],
  };

  const raw = ccli.transactionBuildRaw(txInfo);

  // calculate fee
  const fee = ccli.transactionCalculateMinFee({
    ...txInfo,
    txBody: raw,
    witnessCount: 1,
  });

  // pay the fee by subtracting it from the senderWallet utxo
  txInfo.txOut[0].value.lovelace -= fee;

  // create final transaction
  const tx = ccli.transactionBuildRaw({ ...txInfo, fee });

  // sign the transaction
  const txSigned = ccli.transactionSign({
    txBody: tx,
    signingKeys: [senderWallet.payment.skey],
  });

  // broadcast transaction
  return ccli.transactionSubmit(txSigned);
}

module.exports = sendOneToMany;
