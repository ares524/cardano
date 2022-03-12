#!/usr/bin/env zx

import 'zx/globals';

const accounts = (await question('Accounts to check balance: '))
  .trim()
  .split(` `)
  .filter((a) => !!a.trim());

for (const account of accounts) {
  $`cada wallet balance ${account}`;
}
