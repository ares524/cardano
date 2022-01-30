# cada

🖥️ NODE.JS - A custom CLI to control and transfer tokens across multiple wallets using a local cardano-node with docker.

## Installation

```bash
git clone git@github.com:BrunoS3D/cada.git
cd cada
```

Create environment variable file `.env` based on [.env.example](./.env.example) on project root folder

```bash
cp .env.example .env
```

Download the following [cardano-node configuration files](https://github.com/input-output-hk/cardano-node/blob/master/doc/stake-pool-operations/getConfigFiles_AND_Connect.md) and move to `config` folder

https://hydra.iohk.io/build/7654130/download/1/index.html

## Running

```bash
docker compose up -d
```

> ⚠ Note: if this is the first time you are running this project, you will have to wait for the entire copy to be downloaded from the network (this can take days)

You can follow the logs using the following command

```bash
docker logs -f cardano-node
```

Install project dependencies

```bash
yarn install # or just yarn
```

Register app as global command

```bash
npm link
```

Run a simple cardano-node query

```bash
cada status
```

Expected output

```json
{
  "era": "Alonzo",
  "syncProgress": "100.00",
  "hash": "1bbab59a0a778018928d649fa77f943ddb76f6135d9e4ae168303f050700cff6",
  "epoch": 317,
  "slot": 51887535,
  "block": 6815791
}
```

## CLI

To use cli globaly just run `npm link` then run `cada` on terminal

Expected output

```bash
Usage: ccli [options] [command]

A Cardano CLI Bot

Options:
  -V, --version   output the version number
  -h, --help      display help for command

Commands:
  wallet          Wallet Management
  send            Wallet Transaction Management
  status          Make a simple query tip to the current cardano-node
  help [command]  display help for command
```
