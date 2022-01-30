const execSync = require('child_process').execSync;
const fs = require('fs');

const {
  ownerToString,
  relayToString,
  certToString,
  txInToString,
  txOutToString,
  signingKeysToString,
  witnessFilesToString,
  fileException,
  setKeys,
  fileExists,
  mintToString,
  jsonToPath,
  auxScriptToString,
  withdrawalToString,
  multiAssetToString,
} = require('./helper');

/**
 * @typedef lovelace
 * @property {number}
 */

/**
 * @typedef asset
 * @property {string}
 */

/**
 * @typedef quantity
 * @property {string}
 */

/**
 * @typedef path
 * @property {string}
 */

/**
 * @typedef paymentAddr
 * @property {string}
 */

/**
 * @typedef stakeAddr
 * @property {string}
 */

/**
 * @typedef {Object} TxIn
 * @property {string} txHash
 * @property {string} txId
 * @property {object=} script
 * @property {object=} datum
 * @property {object=} redeemer
 * @property {[number, number]} executionUnits
 */
/**
 * @typedef {Object} TxOut
 * @property {string} address
 * @property {object} value
 * @property {string} datumHash
 */
/**
 * @typedef {Object} TxInCollateral
 * @property {string} txHash
 * @property {string} txId
 */
/**
 * @typedef {Object} Mint
 * @property {string} action
 * @property {string} quantity
 * @property {string} asset
 * @property {object} script
 * @property {object=} datum
 * @property {object=} redeemer
 * @property {[number, number]} executionUnits
 */
/**
 * @typedef {Object} Certificate
 * @property {path} cert
 * @property {object=} script
 * @property {object=} datum
 * @property {object=} redeemer
 * @property {[number, number]} executionUnits
 */
/**
 * @typedef {Object} Withdrawal
 * @property {string} stakingAddress
 * @property {lovelace} reward
 * @property {object=} script
 * @property {object=} datum
 * @property {object=} redeemer
 * @property {[number, number]} executionUnits
 */
/**
 * @typedef {Object.<string, quantity>} Value
 */

class CardanoCLI {
  /**
   *
   * @param {Object} options
   * @param {path=} options.shelleyGenesisPath
   * @param {path=} options.socketPath - Default: Env Variable
   * @param {path=} options.cliPath - Default: Env Variable
   * @param {string=} options.cliPrefix
   * @param {path=} options.dir - Default: Working Dir
   * @param {string=} options.era
   * @param {string=} options.network - Default: mainnet
   */

  constructor(options) {
    this.network = 'mainnet';
    this.era = '';
    this.dir = '.';
    this.cliPath = 'cardano-cli';
    this.cliPrefix = '';

    if (options) {
      options.shelleyGenesisPath && (this.shelleyGenesis = JSON.parse(execSync(`${this.cliPrefix} cat ${options.shelleyGenesisPath}`).toString()));

      options.socketPath && (process.env['CARDANO_NODE_SOCKET_PATH'] = options.socketPath);
      options.era && (this.era = '--' + options.era + '-era');
      options.network && (this.network = options.network);
      options.dir && (this.dir = options.dir);
      options.cliPath && (this.cliPath = options.cliPath);
      options.cliPrefix && (this.cliPrefix = options.cliPrefix);
    }

    execSync(`${this.cliPrefix} mkdir -p ${this.dir}/tmp`);

    execSync(`${this.cliPrefix} chmod 777 ${this.dir}/tmp`);
  }

  /**
   * @returns {object}
   */
  queryProtocolParameters() {
    execSync(`${this.cliPrefix} ${this.cliPath} query protocol-parameters \
    --${this.network} \
    --cardano-mode \
    --out-file ${this.dir}/tmp/protocolParams.json
`);

    execSync(`${this.cliPrefix} chmod -R 777 ${this.dir}/tmp`);

    this.protocolParametersPath = `${this.dir}/tmp/protocolParams.json`;

    const protocolParams = execSync(`${this.cliPrefix} cat ${this.dir}/tmp/protocolParams.json`).toString();

    return JSON.parse(protocolParams);
  }

  /**
   * @returns {object}
   */
  queryTip() {
    const tip = execSync(`${this.cliPrefix} ${this.cliPath} query tip \
    --${this.network} \
    --cardano-mode`).toString();

    return JSON.parse(tip);
  }

  /**
   * @param {stakeAddr} address
   * @returns {object}
   */
  queryStakeAddressInfo(address) {
    return JSON.parse(
      execSync(`${this.cliPrefix} ${this.cliPath} query stake-address-info \
      --${this.network} \
      --address ${address}
      `).toString()
    );
  }

  /**
   * @param {paymentAddr} address
   * @returns {object}
   */
  queryUtxo(address) {
    const utxosRaw = execSync(`${this.cliPrefix} ${this.cliPath} query utxo \
    --${this.network} \
    --address ${address} \
    --cardano-mode
    `).toString();

    const utxos = utxosRaw.split('\n');
    utxos.splice(0, 1);
    utxos.splice(0, 1);
    utxos.splice(utxos.length - 1, 1);
    const result = utxos.map((raw, index) => {
      const utxo = raw.replace(/\s+/g, ' ').split(' ');
      const txHash = utxo[0];
      const txId = parseInt(utxo[1]);
      const valueList = utxo.slice(2, utxo.length).join(' ').split('+');
      const value = {};
      let datumHash;
      valueList.forEach((v) => {
        if (v.includes('TxOutDatumHash') || v.includes('TxOutDatumNone')) {
          if (!v.includes('None')) datumHash = JSON.parse(v.trim().split(' ')[2]);
          return;
        }
        let [quantity, asset] = v.trim().split(' ');
        quantity = parseInt(quantity);
        value[asset] = quantity;
      });
      const result = { txHash, txId, value };
      if (datumHash) result.datumHash = datumHash;

      return result;
    });

    return result;
  }

  /**
   *
   * @param {string} account - Name of account
   */
  addressKeyGen(account) {
    let vkey = `${this.dir}/priv/wallet/${account}/${account}.payment.vkey`;
    let skey = `${this.dir}/priv/wallet/${account}/${account}.payment.skey`;

    fileExists([vkey, skey]);

    execSync(`${this.cliPrefix} mkdir -p ${this.dir}/priv/wallet/${account}`);

    execSync(`${this.cliPrefix} ${this.cliPath} address key-gen \
    --verification-key-file ${vkey} \
    --signing-key-file ${skey}
    `);

    execSync(`${this.cliPrefix} chmod -R 777 ${this.dir}/priv/wallet/${account}`);

    return {
      vkey,
      skey,
    };
  }

  /**
   *
   * @param {string} account - Name of account
   */
  stakeAddressKeyGen(account) {
    let vkey = `${this.dir}/priv/wallet/${account}/${account}.stake.vkey`;
    let skey = `${this.dir}/priv/wallet/${account}/${account}.stake.skey`;

    fileExists([vkey, skey]);

    execSync(`${this.cliPrefix} mkdir -p ${this.dir}/priv/wallet/${account}`);

    execSync(`${this.cliPrefix} ${this.cliPath} stake-address key-gen \
    --verification-key-file ${vkey} \
    --signing-key-file ${skey}
    `);

    execSync(`${this.cliPrefix} chmod -R 777 ${this.dir}/priv/wallet/${account}`);

    return {
      vkey,
      skey,
    };
  }

  /**
   *
   * @param {string} account - Name of account
   * @returns {path}
   */
  stakeAddressBuild(account) {
    execSync(`${this.cliPrefix} ${this.cliPath} stake-address build \
    --staking-verification-key-file ${this.dir}/priv/wallet/${account}/${account}.stake.vkey \
    --out-file ${this.dir}/priv/wallet/${account}/${account}.stake.addr \
    --${this.network}
    `);

    execSync(`${this.cliPrefix} chmod -R 777 ${this.dir}/priv/wallet/${account}`);

    return `${this.dir}/priv/wallet/${account}/${account}.stake.addr`;
  }

  /**
   *
   * @param {string} account - Name of account
   * @param {Object} options
   * @param {path} [options.paymentVkey]
   * @param {path} [options.stakeVkey]
   * @param {object} [options.paymentScript]
   * @param {object} [options.stakeScript]
   */
  addressBuild(account, options) {
    const paymentVkey = options.paymentVkey ? `--payment-verification-key-file ${options.paymentVkey}` : '';
    const stakeVkey = options.stakeVkey ? `--staking-verification-key-file ${options.stakeVkey}` : '';
    const paymentScript = options.paymentScript ? `--payment-script-file ${jsonToPath(this.dir, options.paymentScript)}` : '';
    const stakeScript = options.stakeScript ? `--stake-script-file ${jsonToPath(this.dir, options.stakeScript)}` : '';

    execSync(`${this.cliPrefix} ${this.cliPath} address build \
        ${paymentVkey} \
        ${stakeVkey} \
        ${paymentScript} \
        ${stakeScript} \
        --out-file ${this.dir}/priv/wallet/${account}/${account}.payment.addr \
        --${this.network}
    `);

    execSync(`${this.cliPrefix} chmod -R 777 ${this.dir}/priv/wallet/${account}`);

    return `${this.dir}/priv/wallet/${account}/${account}.payment.addr`;
  }

  /**
   *
   * @param {string} account - Name of account
   */
  addressKeyHash(account) {
    return execSync(`${this.cliPrefix} ${this.cliPath} address key-hash \
        --payment-verification-key-file ${this.dir}/priv/wallet/${account}/${account}.payment.vkey \
    `)
      .toString()
      .trim();
  }

  /**
   *
   * @param {paymentAddr} address
   * @returns {object}
   */
  addressInfo(address) {
    return JSON.parse(
      execSync(`${this.cliPrefix} ${this.cliPath} address info \
        --address ${address} \
        `)
        .toString()
        .replace(/\s+/g, ' ')
    );
  }

  /**
   *
   * @param {object} script
   * @returns {paymentAddr}
   */
  addressBuildScript(script) {
    let UID = Math.random().toString(36).substr(2, 9);
    fs.writeFileSync(`${this.dir}/tmp/script_${UID}.json`, JSON.stringify(script));
    let scriptAddr = execSync(
      `${this.cliPrefix} ${this.cliPath} address build-script --script-file ${this.dir}/tmp/script_${UID}.json --${this.network}`
    )
      .toString()
      .replace(/\s+/g, ' ');
    return scriptAddr;
  }

  /**
   *
   * @param {string} account - Name of the account
   */
  wallet(account) {
    let paymentAddr = 'No payment keys generated';
    let stakingAddr = 'No staking keys generated';

    fileException(() => {
      paymentAddr = execSync(`${this.cliPrefix} cat ${this.dir}/priv/wallet/${account}/${account}.payment.addr`).toString();
    });

    fileException(() => {
      stakingAddr = execSync(`${this.cliPrefix} cat ${this.dir}/priv/wallet/${account}/${account}.stake.addr`).toString();
    });

    let files = fs.readdirSync(`${this.dir}/priv/wallet/${account}`);
    let keysPath = {};
    files.forEach((file) => {
      let name = file.split('.')[1] + '.' + file.split('.')[2];
      setKeys(keysPath, name, `${this.dir}/priv/wallet/${account}/${file}`);
    });

    const balance = () => {
      const utxos = this.queryUtxo(paymentAddr);
      const value = {};
      utxos.forEach((utxo) => {
        Object.keys(utxo.value).forEach((asset) => {
          if (!value[asset]) value[asset] = 0;
          value[asset] += utxo.value[asset];
        });
      });

      return { utxo: utxos, value };
    };
    let reward = () => {
      let r;
      try {
        r = this.queryStakeAddressInfo(stakingAddr);
        r = r.find((delegation) => delegation.address == stakingAddr).rewardAccountBalance;
      } catch {
        r = 'Staking key is not registered';
      }
      return r;
    };

    return {
      name: account,
      paymentAddr,
      stakingAddr,
      balance,
      reward,
      ...keysPath,
    };
  }

  /**
   *
   * @param {string} poolName - Name of the pool
   */
  pool(poolName) {
    let id;
    fileException(() => {
      fs.readFileSync(`${this.dir}/priv/pool/${poolName}/${poolName}.node.vkey`);
      id = this.stakePoolId(poolName);
    });
    let files = fs.readdirSync(`${this.dir}/priv/pool/${poolName}`);
    let keysPath = {};
    files.forEach((file) => {
      let name = file.split('.')[1] + '.' + file.split('.')[2];
      setKeys(keysPath, name, `${this.dir}/priv/pool/${poolName}/${file}`);
    });
    return {
      name: poolName,
      id,
      ...keysPath,
    };
  }

  /**
   *
   * @param {string} account - Name of the account
   * @returns {path}
   */
  stakeAddressRegistrationCertificate(account) {
    execSync(`${this.cliPrefix} ${this.cliPath} stake-address registration-certificate \
        --staking-verification-key-file ${this.dir}/priv/wallet/${account}/${account}.stake.vkey \
        --out-file ${this.dir}/priv/wallet/${account}/${account}.stake.cert
    `);
    return `${this.dir}/priv/wallet/${account}/${account}.stake.cert`;
  }

  /**
   *
   * @param {string} account - Name of the account
   * @returns {path}
   */
  stakeAddressDeregistrationCertificate(account) {
    execSync(`${this.cliPrefix} ${this.cliPath} stake-address deregistration-certificate \
      --staking-verification-key-file ${this.dir}/priv/wallet/${account}/${account}.stake.vkey \
      --out-file ${this.dir}/priv/wallet/${account}/${account}.stake.cert
  `);
    return `${this.dir}/priv/wallet/${account}/${account}.stake.cert`;
  }

  /**
   *
   * @param {string} account - Name of the account
   * @param {string} poolId - Stake pool verification key (Bech32 or hex-encoded)
   * @returns {path}
   */
  stakeAddressDelegationCertificate(account, poolId) {
    execSync(`${this.cliPrefix} ${this.cliPath} stake-address delegation-certificate \
        --staking-verification-key-file ${this.dir}/priv/wallet/${account}/${account}.stake.vkey \
        --stake-pool-id ${poolId} \
        --out-file ${this.dir}/priv/wallet/${account}/${account}.deleg.cert
    `);
    return `${this.dir}/priv/wallet/${account}/${account}.deleg.cert`;
  }

  /**
   *
   * @param {string} account - Name of the account
   * @returns {string}
   */
  stakeAddressKeyHash(account) {
    return execSync(`${this.cliPrefix} ${this.cliPath} stake-address key-hash \
          --staking-verification-key-file ${this.dir}/priv/wallet/${account}/${account}.stake.vkey \
      `)
      .toString()
      .trim();
  }

  /**
   *
   * @param {string} poolName - Name of the pool
   */
  nodeKeyGenKES(poolName) {
    let vkey = `${this.dir}/priv/pool/${poolName}/${poolName}.kes.vkey`;
    let skey = `${this.dir}/priv/pool/${poolName}/${poolName}.kes.skey`;

    fileExists([vkey, skey]);

    execSync(`${this.cliPrefix} mkdir -p ${this.dir}/priv/pool/${poolName}`);

    execSync(`${this.cliPrefix} ${this.cliPath} node key-gen-KES \
      --verification-key-file ${vkey} \
      --signing-key-file ${skey}
  `);

    execSync(`${this.cliPrefix} chmod -R 777 ${this.dir}/priv/pool/${poolName}`);

    return {
      vkey,
      skey,
    };
  }

  /**
   *
   * @param {string} poolName - Name of the pool
   */
  nodeKeyGen(poolName) {
    let vkey = `${this.dir}/priv/pool/${poolName}/${poolName}.node.vkey`;
    let skey = `${this.dir}/priv/pool/${poolName}/${poolName}.node.skey`;
    let counter = `${this.dir}/priv/pool/${poolName}/${poolName}.node.counter`;

    fileExists([vkey, skey, counter]);

    execSync(`${this.cliPrefix} mkdir -p ${this.dir}/priv/pool/${poolName}`);

    execSync(`${this.cliPrefix} ${this.cliPath} node key-gen \
        --cold-verification-key-file ${vkey} \
        --cold-signing-key-file ${skey} \
        --operational-certificate-issue-counter ${counter}
    `);

    execSync(`${this.cliPrefix} chmod -R 777 ${this.dir}/priv/pool/${poolName}`);

    return {
      vkey,
      skey,
      counter,
    };
  }

  /**
   *
   * @param {string} poolName - Name of the pool
   * @param {number=} kesPeriod - Optional (Offline mode)
   * @returns {path}
   */
  nodeIssueOpCert(poolName, kesPeriod) {
    execSync(`${this.cliPrefix} ${this.cliPath} node issue-op-cert \
    --kes-verification-key-file ${this.dir}/priv/pool/${poolName}/${poolName}.kes.vkey \
    --cold-signing-key-file ${this.dir}/priv/pool/${poolName}/${poolName}.node.skey \
    --operational-certificate-issue-counter ${this.dir}/priv/pool/${poolName}/${poolName}.node.counter \
    --kes-period ${kesPeriod ? kesPeriod : this.KESPeriod()} \
    --out-file ${this.dir}/priv/pool/${poolName}/${poolName}.node.cert
`);
    return `${this.dir}/priv/pool/${poolName}/${poolName}.node.cert`;
  }

  /**
   *
   * @param {string} poolName - Name of the pool
   */
  nodeKeyGenVRF(poolName) {
    let vkey = `${this.dir}/priv/pool/${poolName}/${poolName}.vrf.vkey`;
    let skey = `${this.dir}/priv/pool/${poolName}/${poolName}.vrf.skey`;

    fileExists([vkey, skey]);

    execSync(`${this.cliPrefix} mkdir -p ${this.dir}/priv/pool/${poolName}`);

    execSync(`${this.cliPrefix} ${this.cliPath} node key-gen-VRF \
    --verification-key-file ${vkey} \
    --signing-key-file ${skey}
`);

    execSync(`${this.cliPrefix} chmod -R 777 ${this.dir}/priv/pool/${poolName}`);

    return {
      vkey,
      skey,
    };
  }

  nodeNewCounter(poolName, counter) {
    execSync(`${this.cliPrefix} mkdir -p ${this.dir}/priv/pool/${poolName}`);
    execSync(`${this.cliPrefix} ${this.cliPath} node new-counter \
    --cold-verification-key-file ${this.dir}/priv/pool/${poolName}/${poolName}.node.vkey \
    --counter-value ${counter} \
    --operational-certificate-issue-counter-file ${this.dir}/priv/pool/${poolName}/${poolName}.node.counter
`);
    return `${this.dir}/priv/pool/${poolName}/${poolName}.node.counter`;
  }

  /**
   *
   * @param {string} poolName - Name of the pool
   * @returns {string}
   */
  stakePoolId(poolName) {
    return execSync(
      `${this.cliPrefix} ${this.cliPath} stake-pool id --cold-verification-key-file ${this.dir}/priv/pool/${poolName}/${poolName}.node.vkey`
    )
      .toString()
      .replace(/\s+/g, ' ');
  }

  /**
   *
   * @param {string} metadata - Raw File
   * @returns {string}
   */
  stakePoolMetadataHash(metadata) {
    fs.writeFileSync(`${this.dir}/tmp/poolmeta.json`, metadata);
    let metaHash = execSync(`${this.cliPrefix} ${this.cliPath} stake-pool metadata-hash --pool-metadata-file ${this.dir}/tmp/poolmeta.json`)
      .toString()
      .replace(/\s+/g, ' ');
    execSync(`${this.cliPrefix} rm ${this.dir}/tmp/poolmeta.json`);
    return metaHash;
  }

  /**
   * @param {string} poolName - Name of the pool
   * @param {Object} options
   * @param {lovelace} options.pledge
   * @param {number} options.margin
   * @param {lovelace} options.cost
   * @param {string} options.url
   * @param {string} options.metaHash
   * @param {path} options.rewardAccount
   * @param {Array<path>} options.owners
   * @param {Array<Object>} options.relays
   * @returns {path}
   */
  stakePoolRegistrationCertificate(poolName, options) {
    if (
      !(
        options &&
        options.pledge &&
        options.margin &&
        options.cost &&
        options.url &&
        options.metaHash &&
        options.rewardAccount &&
        options.owners &&
        options.relays
      )
    )
      throw new Error('All options are required');

    let owners = ownerToString(options.owners);
    let relays = relayToString(options.relays);
    execSync(`${this.cliPrefix} ${this.cliPath} stake-pool registration-certificate \
    --cold-verification-key-file ${this.dir}/priv/pool/${poolName}/${poolName}.node.vkey \
    --vrf-verification-key-file ${this.dir}/priv/pool/${poolName}/${poolName}.vrf.vkey \
    --pool-pledge ${options.pledge} \
    --pool-cost ${options.cost} \
    --pool-margin ${options.margin} \
    --pool-reward-account-verification-key-file ${options.rewardAccount} \
    ${owners} \
    ${relays} \
    --${this.network} \
    --metadata-url ${options.url} \
    --metadata-hash ${options.metaHash} \
    --out-file ${this.dir}/priv/pool/${poolName}/${poolName}.pool.cert
`);
    return `${this.dir}/priv/pool/${poolName}/${poolName}.pool.cert`;
  }

  /**
   *
   * @param {string} poolName - Name of the pool
   * @param {number} epoch - Retirement Epoch
   * @returns {path}
   */
  stakePoolDeregistrationCertificate(poolName, epoch) {
    execSync(`${this.cliPrefix} ${this.cliPath} stake-pool deregistration-certificate \
    --cold-verification-key-file ${this.dir}/priv/pool/${poolName}/${poolName}.node.vkey \
    --epoch ${epoch} \
    --out-file ${this.dir}/priv/pool/${poolName}/${poolName}.pool.cert
  `);
    return `${this.dir}/priv/pool/${poolName}/${poolName}.pool.cert`;
  }

  /**
   *
   * @param {Object} options
   * @param {Array<TxIn>} options.txIn
   * @param {Array<TxOut>} options.txOut
   * @param {Array<TxInCollateral>=} options.txInCollateral
   * @param {Array<Withdrawal>=} options.withdrawals
   * @param {Array<Certificate>=} options.certs
   * @param {lovelace=} options.fee
   * @param {Array<Mint>=} options.mint
   * @param {Array<object>=} options.auxScript
   * @param {object=} options.metadata
   * @param {number=} options.invalidBefore - Default: 0
   * @param {number=} options.invalidAfter - Default: current+10000
   * @param {boolean} options.scriptInvalid - Default: false
   * @returns {path}
   */
  transactionBuildRaw(options) {
    if (!(options && options.txIn && options.txOut)) throw new Error('TxIn and TxOut required');

    let UID = Math.random().toString(36).substr(2, 9);
    const txInString = txInToString(this.dir, options.txIn);
    const txOutString = txOutToString(options.txOut);
    const txInCollateralString = options.txInCollateral ? txInToString(this.dir, options.txInCollateral, true) : '';
    const mintString = options.mint ? mintToString(this.dir, options.mint) : '';
    const withdrawals = options.withdrawals ? withdrawalToString(this.dir, options.withdrawals) : '';
    const certs = options.certs ? certToString(this.dir, options.certs) : '';
    const metadata = options.metadata ? '--metadata-json-file ' + jsonToPath(this.dir, options.metadata, 'metadata') : '';
    const auxScript = options.auxScript ? auxScriptToString(this.dir, options.auxScript) : '';

    if (!this.protocolParametersPath) this.queryProtocolParameters();

    const scriptInvalid = options.scriptInvalid ? '--script-invalid' : '';
    execSync(`${this.cliPrefix} ${this.cliPath} transaction build-raw \
    --alonzo-era \
    ${txInString} \
    ${txOutString} \
    ${txInCollateralString} \
    ${certs} \
    ${withdrawals} \
    ${mintString} \
    ${auxScript} \
    ${metadata} \
    ${scriptInvalid} \
    --invalid-hereafter ${options.invalidAfter ? options.invalidAfter : this.queryTip().slot + 10000} \
    --invalid-before ${options.invalidBefore ? options.invalidBefore : 0} \
    --fee ${options.fee ? options.fee : 0} \
    --out-file ${this.dir}/tmp/tx_${UID}.raw \
    --protocol-params-file ${this.protocolParametersPath} \
    ${this.era}`);

    execSync(`${this.cliPrefix} chmod -R 777 ${this.dir}/tmp`);

    return `${this.dir}/tmp/tx_${UID}.raw`;
  }

  /**
   *
   * @param {Object} options
   * @param {Array<TxIn>} options.txIn
   * @param {Array<TxOut>} options.txOut
   * @param {Array<TxInCollateral>=} options.txInCollateral
   * @param {string=} options.changeAddress
   * @param {Array<Withdrawal>=} options.withdrawals
   * @param {Array<Certificate>=} options.certs
   * @param {lovelace=} options.fee
   * @param {Array<Mint>=} options.mint
   * @param {Array<object>=} options.auxScript
   * @param {object=} options.metadata
   * @param {number=} options.invalidBefore - Default: 0
   * @param {number=} options.invalidAfter - Default: current+10000
   * @param {boolean} options.scriptInvalid - Default: false
   * @param {number=} options.witnessOverride
   * @returns {path}
   */
  transactionBuild(options) {
    if (!(options && options.txIn && options.txOut)) throw new Error('TxIn and TxOut required');

    let UID = Math.random().toString(36).substr(2, 9);
    const txInString = txInToString(this.dir, options.txIn);
    const txOutString = txOutToString(options.txOut);
    const txInCollateralString = options.txInCollateral ? txInToString(this.dir, options.txInCollateral, true) : '';
    const changeAddressString = options.changeAddress ? `--change-address ${options.changeAddress}` : '';
    const mintString = options.mint ? mintToString(this.dir, options.mint) : '';
    const withdrawals = options.withdrawals ? withdrawalToString(this.dir, options.withdrawals) : '';
    const certs = options.certs ? certToString(this.dir, options.certs) : '';
    const metadata = options.metadata ? '--metadata-json-file ' + jsonToPath(this.dir, options.metadata, 'metadata') : '';
    const auxScript = options.auxScript ? auxScriptToString(this.dir, options.auxScript) : '';
    const scriptInvalid = options.scriptInvalid ? '--script-invalid' : '';
    const witnessOverride = options.witnessOverride ? `--witness-override ${options.witnessOverride}` : '';
    if (!this.protocolParametersPath) this.queryProtocolParameters();
    execSync(`${this.cliPrefix} ${this.cliPath} transaction build \
    ${txInString} \
    ${txOutString} \
    ${txInCollateralString} \
    ${certs} \
    ${withdrawals} \
    ${mintString} \
    ${auxScript} \
    ${metadata} \
    ${scriptInvalid} \
    ${witnessOverride} \
    --invalid-hereafter ${options.invalidAfter ? options.invalidAfter : this.queryTip().slot + 10000} \
    --invalid-before ${options.invalidBefore ? options.invalidBefore : 0} \
    --out-file ${this.dir}/tmp/tx_${UID}.raw \
    ${changeAddressString} \
    --${this.network} \
    --protocol-params-file ${this.protocolParametersPath} \
    ${this.era}`);

    return `${this.dir}/tmp/tx_${UID}.raw`;
  }

  /**
   *
   * @param {Object} options
   * @param {path} options.txBody
   * @param {Array<object>} options.txIn
   * @param {Array<object>} options.txOut
   * @param {number} options.witnessCount
   * @returns {lovelace}
   */
  transactionCalculateMinFee(options) {
    this.queryProtocolParameters();
    return parseInt(
      execSync(`${this.cliPrefix} ${this.cliPath} transaction calculate-min-fee \
      --tx-body-file ${options.txBody} \
      --tx-in-count ${options.txIn.length} \
      --tx-out-count ${options.txOut.length} \
      --mainnet \
      --witness-count ${options.witnessCount} \
      --protocol-params-file ${this.protocolParametersPath}`)
        .toString()
        .replace(/\s+/g, ' ')
        .split(' ')[0]
    );
  }

  /**
   *
   * @param {object} script
   * @returns {string} Policy Id
   */
  transactionPolicyid(script) {
    let UID = Math.random().toString(36).substr(2, 9);
    fs.writeFileSync(`${this.dir}/tmp/script_${UID}.json`, JSON.stringify(script));
    return execSync(`${this.cliPrefix} ${this.cliPath} transaction policyid --script-file ${this.dir}/tmp/script_${UID}.json`).toString().trim();
  }

  /**
   *
   * @param {object} script
   * @returns {string} Datum hash
   */
  transactionHashScriptData(script) {
    return execSync(`${this.cliPrefix} ${this.cliPath} transaction hash-script-data --script-data-value '${JSON.stringify(script)}'`)
      .toString()
      .trim();
  }

  /**
   *
   * @param {Object} options
   * @param {Array<path>} options.signingKeys - One ore more signing keys
   * @param {path} options.txBody
   * @returns {path}
   */
  transactionSign(options) {
    const UID = Math.random().toString(36).substr(2, 9);
    const signingKeys = signingKeysToString(options.signingKeys);
    execSync(`${this.cliPrefix} ${this.cliPath} transaction sign \
    --tx-body-file ${options.txBody} \
    --${this.network} \
    ${signingKeys} \
    --out-file ${this.dir}/tmp/tx_${UID}.signed`);

    execSync(`${this.cliPrefix} chmod -R 777 ${this.dir}/tmp`);

    return `${this.dir}/tmp/tx_${UID}.signed`;
  }

  /**
   *
   * @param {Object} options
   * @param {path} options.txBody
   * @param {path} options.signingKey
   * @returns {path}
   */
  transactionWitness(options) {
    const UID = Math.random().toString(36).substr(2, 9);
    execSync(`${this.cliPrefix} ${this.cliPath} transaction witness \
    --tx-body-file ${options.txBody} \
    --${this.network} \
    --signing-key-file ${options.signingKey} \
    --out-file ${this.dir}/tmp/tx_${UID}.witness`);
    return `${this.dir}/tmp/tx_${UID}.witness`;
  }

  /**
   *
   * @param {Object} options
   * @param {path} options.txBody
   * @param {Array<path>} options.witnessFiles
   * @returns {path}
   */
  transactionAssemble(options) {
    let UID = Math.random().toString(36).substr(2, 9);
    let witnessFiles = witnessFilesToString(options.witnessFiles);
    execSync(`${this.cliPrefix} ${this.cliPath} transaction assemble \
    --tx-body-file ${options.txBody} \
    ${witnessFiles} \
    --out-file ${this.dir}/tmp/tx_${UID}.signed`);
    return `${this.dir}/tmp/tx_${UID}.signed`;
  }

  /**
   *
   * @param {options} options
   * @returns {lovelace}
   */
  transactionCalculateMinValue(options) {
    this.queryProtocolParameters();
    const multiAsset = multiAssetToString(options);
    return parseInt(
      execSync(`${this.cliPrefix} ${this.cliPath} transaction calculate-min-required-utxo \
      --tx-out ${multiAsset} \
      --protocol-params-file ${this.protocolParametersPath}`)
        .toString()
        .replace(/\s+/g, ' ')
        .split(' ')[1]
    );
  }

  /**
   *
   * @param {paymentAddr} address
   * @param {Value} value
   * @returns {lovelace}
   */
  transactionCalculateMinRequiredUtxo(address, value) {
    this.queryProtocolParameters();
    const multiAsset = multiAssetToString(value);
    return parseInt(
      execSync(`${this.cliPrefix} ${this.cliPath} transaction calculate-min-required-utxo \
      --alonzo-era \
      --tx-out ${address}+${multiAsset} \
      --protocol-params-file ${this.protocolParametersPath}`)
        .toString()
        .replace(/\s+/g, ' ')
        .split(' ')[1]
    );
  }

  /**
   *
   * @param {path | string} tx - Path or Signed Tx File
   * @returns {string} - Transaction Hash
   */
  transactionSubmit(tx) {
    let UID = Math.random().toString(36).substr(2, 9);
    let parsedTx;

    if (typeof tx == 'object') {
      fs.writeFileSync(`${this.dir}/tmp/tx_${UID}.signed`, JSON.stringify(tx));
      parsedTx = `${this.dir}/tmp/tx_${UID}.signed`;
    } else {
      parsedTx = tx;
    }

    execSync(`${this.cliPrefix} ${this.cliPath} transaction submit --${this.network} --tx-file ${parsedTx}`);

    execSync(`${this.cliPrefix} chmod -R 777 ${this.dir}/tmp`);

    return this.transactionTxid({ txFile: parsedTx });
  }

  /**
   *
   * @param {Object} options
   * @param {path=} options.txBody
   * @param {path=} options.txFile
   * @returns {path}
   */
  transactionTxid(options) {
    let txArg = options.txBody ? `--tx-body-file ${options.txBody}` : `--tx-file ${options.txFile}`;
    return execSync(`${this.cliPrefix} ${this.cliPath} transaction txid ${txArg}`).toString().trim();
  }

  /**
   *
   * @param {Object} options
   * @param {path=} options.txBody
   * @param {path=} options.txFile
   * @returns {path}
   */
  transactionView(options) {
    const txArg = options.txBody ? `--tx-body-file ${options.txBody}` : `--tx-file ${options.txFile}`;
    return execSync(`${this.cliPrefix} ${this.cliPath} transaction view ${txArg}`).toString().trim();
  }

  /**
   * @returns {number}
   */
  KESPeriod() {
    if (!this.shelleyGenesis) throw new Error('shelleyGenesisPath required');
    return parseInt(this.queryTip().slot / this.shelleyGenesis.slotsPerKESPeriod);
  }

  /**
   *
   * @param {number} ada
   * @returns {lovelace}
   */
  toLovelace(ada) {
    return ada * 1000000;
  }

  /**
   *
   * @param {lovelace} lovelace
   * @returns {number}
   */
  toAda(lovelace) {
    return lovelace / 1000000;
  }
}

module.exports = CardanoCLI;
