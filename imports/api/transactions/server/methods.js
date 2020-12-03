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
        let transactions = Transactions.rawCollection();
        // let aggregateQuery = Meteor.wrapAsync(collection.aggregate, collection);
        const address = 'abc123';
        // var pipeline = [
        //     {$match:{"address":address}},
        //     // {$project:{address:1,height:1,exists:1}},
        //     {$sort:{"height":-1}},
        //     {$limit:(Meteor.settings.public.uptimeWindow-1)},
        //     {$unwind: "$_id"},
        //     {$group:{
        //         "_id": "$address",
        //         "uptime": {
        //             "$sum":{
        //                 $cond: [{$eq: ['$exists', true]}, 1, 0]
        //             }
        //         }
        //     }
        //     }];
        var pipeline = [
            {$match:{"height":946014}},
            // {$project:{address:1,height:1,exists:1}},
            // {$sort:{"height":-1}},
            // {$limit:(Meteor.settings.public.uptimeWindow-1)},
            // {$unwind: "$_id"},
            // {$group:{
            //     "_id": "$address",
            //     "uptime": {
            //         "$sum":{
            //             $cond: [{$eq: ['$exists', true]}, 1, 0]
            //         }
            //     }
            // }
            // }
        ];

        var stringToDateConversionStage = {
            $addFields: {
               timestamp: { $toDate: "$timestamp" }
            }
         };
         var getFeeShrAmountAsString = {
            $addFields: {
               feeShrString: { $arrayElemAt: [ "$tx.value.fee.amount", 0 ] }
            }
         };
         var stringToIntShrFeeConversionState = {
            $addFields: {
               feeShr: { $toInt: "$feeShrString.amount" }, 
            }
         };

         var getTxMsgObj = {
            $addFields: {
               txMsg: { $arrayElemAt: [ "$tx.value.msg", 0 ] }
            }
         };
         var getTxType = {
            $addFields: {
               txType: "$txMsg.type",
            }
         };

         var getSumFeesForTxType = {
            $addFields: {
               sumFeeShr1: { $sum: [ "$tx.value.msg", 0 ] }
            }
         };

         var getShrTxFee = {
            $addFields: {
               txValue: "$tx.value",
               txValueMsgZero: { $arrayElemAt: ["$txValue.msg", 0 ] }, 
            },
         };

         var getTxValueMsgZero = {
            $addFields: {
               txValueMsgZero: { $arrayElemAt: ["$txValue.msg", 0 ] }, 
            }
         };
         var getTxValueMsgValueAmount = {
            $addFields: {
               txValueMsgValueAmount: { $toInt: "$txValueMsgZero.value.amount.amount" }, 
            }
         };

         var stringToIntShrFeeConversionState1 = {
            $addFields: {
               feeShr: { $toInt: "$amount.amount" } //TODO figure out how to get this to then sum the daily fees
            // feeShr: { $toInt: "$tx.value.fee.gas" }
            }
         };

        var pipeline2 = 
        [
            // stringToIntShrFeeConversionState,
            {
              $match: {
                height: {
                  $gt: 1
                }
              }
            },
            {
                $group: {
                    _id: "$height",
                    // txs: { $sum: 1 },
                    sumHeight: { $sum: "$height" },
                    sumFeeShr: { $sum: "$txValueMsgValueAmount" }

                 }
            },
            // {
            //   $count: "passing_scores"
            // }
          ];

        var pipeline3 = 
        [
            stringToDateConversionStage,
            getFeeShrAmountAsString,
            stringToIntShrFeeConversionState,
            // stringToIntShrFeeConversionState1,
            {
                $project:
                {
                    date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
                    feeShr: "$feeShr",
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
            // {
            //   $count: "passing_scores"
            // }
          ];

          var pipeline4 = 
        [
            stringToDateConversionStage,
            getFeeShrAmountAsString,
            stringToIntShrFeeConversionState,
            // stringToIntShrFeeConversionState1,
            {
                $project:
                {
                    date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
                    feeShr: "$feeShr",
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
            // {
            //   $count: "passing_scores"
            // }
          ];

          var pipeline41 = // works perfectly for grouping by day and getting the feeShr and txs
        [
            stringToDateConversionStage,
            getFeeShrAmountAsString,
            getTxMsgObj,
            // stringToIntShrFeeConversionState1,
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
            // {
            //   $count: "passing_scores"
            // }
          ];

          var pipeline42 = [
            stringToDateConversionStage,
            getFeeShrAmountAsString,
            getTxMsgObj,
            // stringToIntShrFeeConversionState1,
            {
                $project:
                {
                    date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
                    txType: "$txMsg.type",
                    feeShr: { $toInt: "$feeShrString.amount" }, 
                    "height": 1
                }
            },
            // {
            //     $group: {
            //         _id: "$date",
            //         txs: { $sum: 1 },
            //         sumHeight: { $sum: "$height" },
            //         sumFeeShr: { $sum: "$feeShr" }
            //      }
            // },
            { $sort: { "txs": -1 } },
            { $limit: 200 },
            { $lookup: {
              "from": "books",
              "let": {
                "date": "$_id"
              },
              "pipeline": [
                { $match: { 
                  $expr: { $eq: [ "$date", "$$date"] }
                }},
                { $group: {
                  "_id": "$txType",
                  "count": { $sum: 1 }
                }},
                { $sort: { "count": -1  } },
                { $limit: 200 }
              ],
              "as": "books"
            }}
          ];

          // This gets daily: txs, txTypes + breakdown, sumFeeShr, date...
          var pipeline43 = [
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

          var pipeline5 = 
        [
            // First Stage
            {
                $group :
                {
                    _id : "$height",
                    totalSaleAmount: { $sum: { $multiply: [ "$gas_used", "$gas_wanted" ] } }
                }
            },
            // Second Stage
            {
                $match: { "totalSaleAmount": { $gte: 100 } }
            }
          ];
        // let result = aggregateQuery(pipeline, { cursor: {} });

        // var pipeline4 = [{
        //     $project: {
        //       year: {$year: timestamp},
        //       month: {$month: timestamp},
        //       dayOfMonth: {$dayOfMonth: timestamp}
        //     }
        //   },
        //   {
        //     $group: {
        //       _id: {
        //         year: '$year',
        //         month: '$month',
        //         dayOfMonth: '$dayOfMonth'
        //       },
        //       count: {
        //         $sum: 1
        //       }
        //     }
        //   }];

        // return Promise.await(transactions.aggregate(pipeline).toArray());
        return Promise.await(transactions.aggregate(pipeline43).toArray());
        // return .aggregate()
    },
});
