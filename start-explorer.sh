#!/bin/bash

export MONGO_URL='mongodb://<user>:<password>@<ip>:<port>'
export ROOT_URL='http://<host ip>'
export PORT=8080
export METEOR_SETTINGS='{
    "public":{
        "chainName": "ShareLedger",
        "chainId": "ShareRing-VoyagerNet",
        "gtm": false,
        "uptimeWindow": 100,
        "slashingWindow": 10000,
        "initialPageSize": 30,
        "homePageBlockCount": 15,
        "genesisTime": "2020-06-10T08:03:05.330026705Z",
        "secp256k1": false,
        "bech32PrefixAccAddr": "shareledger",
        "bech32PrefixAccPub": "shareledgerpub",
        "bech32PrefixValAddr": "shareledgervaloper",
        "bech32PrefixValPub": "shareledgervaloperpub",
        "bech32PrefixConsAddr": "shareledgervalcons",
        "bech32PrefixConsPub": "shareledgervalconspub",
        "bondDenom": "shr",
        "powerReduction": 1000000,
        "coins": [
            {
                "denom": "shr",
                "displayName": "SHR",
                "displayNamePlural": "SHRs",
                "fraction": 1
            }
        ],
        "gasPrice": 0.02,
        "coingeckoId": "sharering"
    },
    "genesisFile": "http://rpc.explorer.shareri.ng:26657/genesis",
    "remote": {
        "rpc":"http://rpc.explorer.shareri.ng:26657",
        "lcd":"http://lcd.explorer.shareri.ng"
    },
    "debug": {
        "startTimer": true,
        "readGenesis": true
    },
    "params": {
        "startHeight": 946000,
        "defaultBlockTime": 5000,
        "blockInterval": 15000,
        "consensusInterval": 1000,
        "statusInterval": 7500,
        "signingInfoInterval": 1800000,
        "proposalInterval": -1,
        "missedBlocksInterval": 60000,
        "delegationInterval": 900000
    }
}'

# export MAIL_URL='smtp://user:password@mailhost:port/'
node main.js