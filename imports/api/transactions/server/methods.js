import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http';
import { Transactions } from '../../transactions/transactions.js';
import { Validators } from '../../validators/validators.js';
import { VotingPowerHistory } from '../../voting-power/history.js';
import { object } from 'prop-types';

const AddressLength = 40;

Meteor.methods({
    'Transactions.index': function(hash, blockTime){
        this.unblock();
        hash = hash.toUpperCase();
        console.log("Get tx: "+hash)
        try {
            let url = LCD+ '/txs/'+hash;
            let response = HTTP.get(url);
            let tx = JSON.parse(response.content);
    
            console.log(hash);
    
            tx.height = parseInt(tx.height);
    
            let txId = Transactions.insert(tx);
            if (txId){
                return txId;
            }
            else return false;
    
        }
        catch(e) {
            console.log(url);
            console.log(e)
        }
    },
    'Transactions.findDelegation': function(address, height){
        // following cosmos-sdk/x/slashing/spec/06_events.md and cosmos-sdk/x/staking/spec/06_events.md
        return Transactions.find({
            $or: [{$and: [
                {"logs.events.type": "delegate"},
                {"logs.events.attributes.key": "validator"},
                {"logs.events.attributes.value": address}
            ]}, {$and:[
                {"logs.events.attributes.key": "action"},
                {"logs.events.attributes.value": "unjail"},
                {"logs.events.attributes.key": "sender"},
                {"logs.events.attributes.value": address}
            ]}, {$and:[
                {"logs.events.type": "create_validator"},
                {"logs.events.attributes.key": "validator"},
                {"logs.events.attributes.value": address}
            ]}, {$and:[
                {"logs.events.type": "unbond"},
                {"logs.events.attributes.key": "validator"},
                {"logs.events.attributes.value": address}
            ]}, {$and:[
                {"logs.events.type": "redelegate"},
                {"logs.events.attributes.key": "destination_validator"},
                {"logs.events.attributes.value": address}
            ]}],
            "code": {$exists: false},
            height:{$lt:height}},
        {sort:{height:-1},
            limit: 1}
        ).fetch();
    },
    'Transactions.findUser': function(address, fields=null){
        // address is either delegator address or validator operator address
        let validator;
        if (!fields)
            fields = {address:1, description:1, operator_address:1, delegator_address:1};
        if (address.includes(Meteor.settings.public.bech32PrefixValAddr)){
            // validator operator address
            validator = Validators.findOne({operator_address:address}, {fields});
        }
        else if (address.includes(Meteor.settings.public.bech32PrefixAccAddr)){
            // delegator address
            validator = Validators.findOne({delegator_address:address}, {fields});
        }
        else if (address.length === AddressLength) {
            validator = Validators.findOne({address:address}, {fields});
        }
        if (validator){
            return validator;
        }
        return false;

    },
    'Transactions.txHistory'(){
        const transactions = Transactions.rawCollection();

        const stringToDateConversionStage = {
            $addFields: {
               timestamp: { $toDate: "$timestamp" }
            }
         };
         const getFeeShrAmountAsString = {
            $addFields: {
               feeShrString: { $arrayElemAt: [ "$tx.value.fee.amount", 0 ] }
            }
         };

         const getTxMsgObj = {
            $addFields: {
               txMsg: { $arrayElemAt: [ "$tx.value.msg", 0 ] }
            }
         };

          const aggregateDailyTxAndFeePipeline = // works perfectly for grouping by day and getting the feeShr and txs
        [
            stringToDateConversionStage,
            getFeeShrAmountAsString,
            getTxMsgObj,
            {
                $project:
                {
                    date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
                    txType: "$txMsg.type",
                    feeShr: { $toInt: "$feeShrString.amount" }, 
                    "height": 1
                }
            },
            {
                $group: {
                    _id: "$date",
                    txs: { $sum: 1 },
                    sumHeight: { $sum: "$height" },
                    sumFeeShr: { $sum: "$feeShr" }
                 }
            },
            {
                $addFields: {
                    date: "$_id"
                }
            },
            { $sort: { "date": 1 } },
          ];

          // This gets daily: txs, txTypes + breakdown, sumFeeShr, date...
          const aggregateDailyTxDataPipeline = [
            stringToDateConversionStage,
            getFeeShrAmountAsString,
            getTxMsgObj,
            {
                $project:
                {
                    date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
                    txType: "$txMsg.type",
                    feeShr: { $toInt: "$feeShrString.amount" }, 
                    height: 1,
                }
            },
            { $group: {
                _id: {
                    date: "$date",
                    txType: "$txType"
                },
                txs: { $sum: 1 },
                sumHeight: { $sum: "$height" },
                sumFeeShr: { $sum: "$feeShr" },
            }},
            { $group: {
                _id: "$_id.date",
                txTypes: { 
                    $push: { 
                        txType: "$_id.txType",
                        txs: "$txs",
                        sumHeight: "$sumHeight",
                        sumFeeShr: "$sumFeeShr",
                    },
                },
                txs: { $sum: "$txs" },
                sumHeight: { $sum: "$sumHeight" },
                sumFeeShr: { $sum: "$sumFeeShr" },

            }},
            { $project: {
                date: "$_id",
                txTypes: 1,
                txs: 1,
                sumHeight: 1,
                sumFeeShr: 1,
            }},
            { $sort: { date: 1 } },
          ];

        return Promise.await(transactions.aggregate(aggregateDailyTxDataPipeline).toArray());
    },
});
