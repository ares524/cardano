const ccli = require('../services/cardano-cli');

function sendManyToOne(senderAccounts, receiverAddress, { amount, fullBalance }) {
  const senderWallets = senderAccounts.map((senderAccount) => ccli.wallet(senderAccount));
  const senderCachedBalances = senderWallets.map((senderWallet) => senderWallet.balance());
  const senderCachedUtxos = senderCachedBalances.map((balance) => balance.utxo).flat();

  let txInfo;

  if (fullBalance) {
    const txOutValue = {};

    senderCachedUtxos.forEach((utxo) => {
      Object.entries(utxo.value).forEach(([key, value]) => {
        txOutValue[key] = (txOutValue[key] ?? 0) + value;
      });
    });

    txInfo = {
      txIn: senderCachedUtxos,
      // txIn: ccli.queryUtxo(senderWallet.paymentAddr),
      txOut: [
        // value going to receiver
        {
          address: receiverAddress,
          value: txOutValue,
        },
      ],
    };
  } else {
    return console.log('Custom balance not implemented yet');
    // const transferAmountLovelace = ccli.toLovelace(amount);

    // const sendersTxOut = senderCachedUtxos.map((utxo) => ({
    //   address: senderWallet.paymentAddr,
    //   value: {
    //     lovelace: utxo.value.lovelace - transferAmountLovelace,
    //   },
    // }));

    // // create raw transaction
    // txInfo = {
    //   txIn: senderCachedUtxos,
    //   // txIn: ccli.queryUtxo(senderWallet.paymentAddr),
    //   txOut: [
    //     // value going back to senderWallet
    //     {
    //       address: senderWallet.paymentAddr,
    //       value: {
    //         lovelace: senderCachedUtxos.value.lovelace - transferAmountLovelace,
    //       },
    //     },
    //     // value going to receiver
    //     {
    //       address: receiverAddress,
    //       value: {
    //         lovelace: transferAmountLovelace,
    //       },
    //     },
    //   ],
    // };
  }

  const raw = ccli.transactionBuildRaw(txInfo);

  // calculate fee
  const fee = ccli.transactionCalculateMinFee({
    ...txInfo,
    txBody: raw,
    witnessCount: 1,
  });

  // pay the fee by subtracting it from the senderWallet (or receiver if fullBalance option is passed) utxo
  txInfo.txOut[0].value.lovelace -= fee;

  // create final transaction
  const tx = ccli.transactionBuildRaw({ ...txInfo, fee });

  // sign the transaction
  const txSigned = ccli.transactionSign({
    txBody: tx,
    signingKeys: senderWallets.map((senderWallet) => senderWallet.payment.skey),
  });

  // broadcast transaction
  return ccli.transactionSubmit(txSigned);
}

module.exports = sendManyToOne;
