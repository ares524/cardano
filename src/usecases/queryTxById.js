const fetch = require('node-fetch');

async function queryTxById(id) {
  const response = await fetch('https://explorer.cardano.org/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query:
        'query searchById($id: Hash32Hex!) {\n  blocks(where: {hash: {_eq: $id}}) {\n    ...BlockDetails\n  }\n  transactions(where: {hash: {_eq: $id}}) {\n    ...TransactionDetails\n  }\n}\n\nfragment BlockDetails on Block {\n  ...BlockOverview\n  nextBlock {\n    hash\n    number\n  }\n  previousBlock {\n    hash\n    number\n  }\n  transactions(limit: 10, order_by: {fee: desc}) {\n    ...TransactionDetails\n  }\n}\n\nfragment BlockOverview on Block {\n  forgedAt\n  slotLeader {\n    description\n  }\n  epochNo\n  hash\n  number\n  size\n  slotNo\n  transactions_aggregate {\n    aggregate {\n      count\n      sum {\n        totalOutput\n      }\n    }\n  }\n}\n\nfragment TransactionDetails on Transaction {\n  block {\n    epochNo\n    hash\n    number\n    slotNo\n  }\n  deposit\n  fee\n  hash\n  includedAt\n  mint {\n    asset {\n      assetName\n      decimals\n      description\n      fingerprint\n      name\n      policyId\n      ticker\n    }\n    quantity\n  }\n  inputs {\n    address\n    sourceTxHash\n    sourceTxIndex\n    value\n    tokens {\n      asset {\n        assetName\n        decimals\n        description\n        fingerprint\n        name\n        policyId\n        ticker\n      }\n      quantity\n    }\n  }\n  metadata {\n    key\n    value\n  }\n  outputs {\n    address\n    index\n    value\n    tokens {\n      asset {\n        assetName\n        decimals\n        description\n        fingerprint\n        name\n        policyId\n        ticker\n      }\n      quantity\n    }\n  }\n  totalOutput\n  withdrawals {\n    address\n    amount\n  }\n}\n',
      variables: {
        id,
      },
    }),
  });

  if (!response.ok) return null;

  return (await response.json()).data.transactions;
}

module.exports = queryTxById;
