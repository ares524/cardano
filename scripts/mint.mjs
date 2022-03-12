#!/usr/bin/env zx

import 'zx/globals';

const amount = 106;
const accounts = [`1`, `2`, `3`, `4`, `5`, `6`, `7`];
const toAddress = argv['_'][1] || `addr1q9lsgkpeuvm0e06gmwyf3ndlx8upzw63gdpqe9d9wcx868s3e6w8yzg8dmaw5j3k26rwnf82l89uvdw87fhrgdlud3hq7qe5zh`;

for (const account of accounts) {
  $`cada send one-to-one --amount ${amount} --from ${account} --to ${toAddress}`;
  // $`echo send one-to-one --amount ${amount} --from ${account} --to ${toAddress}`;
}
