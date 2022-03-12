#!/usr/bin/env zx

import 'zx/globals';

const amount = (await question('ADA amount to send: ')).trim();
const accounts = (await question('Sender accounts: '))
  .trim()
  .split(` `)
  .filter((a) => !!a.trim());
const toAddress = (await question('Receiver address: ')).trim();

for (const account of accounts) {
  $`cada send one-to-one --amount ${amount} --from ${account} --to ${toAddress}`;
  // $`echo send one-to-one --amount ${amount} --from ${account} --to ${toAddress}`;
}
