#!/usr/bin/env zx

import 'zx/globals';

const accounts = [`1`, `2` /*, `3`, `4`, `5`, `6`, `7`*/];

for (const account of accounts) {
  $`cada wallet balance ${account}`;
}

// for (let idx = 0; idx < 7; idx++) {
//   $`cada wallet balance ${idx + 1}`;
// }
