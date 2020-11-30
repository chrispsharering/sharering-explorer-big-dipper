import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http';
import { Transactions } from '../../transactions/transactions.js';
import { Validators } from '../../validators/validators.js';
import { VotingPowerHistory } from '../../voting-power/history.js';

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

        var pipeline2 = 
        [
            {
              $match: {
                height: {
                  $gt: 1
                }
              }
            },
            {
              $count: "passing_scores"
            }
          ];

        var stringToDateConversionStage = {
            $addFields: {
               timestamp: { $toDate: "$timestamp" }
            }
         };

        var pipeline3 = 
        [
            stringToDateConversionStage,
            {
                $project:
                {
                    date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
                }
            },
            {
                $group: {
                    _id: "$date",
                    count: { $sum: 1 }
                 }
            },
            {
                $addFields: {
                    createdAt: "$_id"
                }
            },
            // {
            //   $count: "passing_scores"
            // }
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
        return Promise.await(transactions.aggregate(pipeline3).toArray());
        // return .aggregate()
    },
});
