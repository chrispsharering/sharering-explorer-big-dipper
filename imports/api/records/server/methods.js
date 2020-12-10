import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { ValidatorRecords, Analytics, AverageData, AverageValidatorData, DailyTransactionData } from '../records.js';
import { CoinStats } from '../../coin-stats/coin-stats.js';
import { Validators } from '../../validators/validators.js';
import { ValidatorSets } from '/imports/api/validator-sets/validator-sets.js';
import { Transactions } from '../../transactions/transactions.js';
import { Status } from '../../status/status.js';
import { MissedBlocksStats } from '../records.js';
import { MissedBlocks } from '../records.js';
import { Blockscon } from '../../blocks/blocks.js';
import { Chain } from '../../chain/chain.js';
import _ from 'lodash';
const BULKUPDATEMAXSIZE = 1000;

const getDateString = (d) => {
    var month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) 
        month = '0' + month;
    if (day.length < 2) 
        day = '0' + day;

    return [year, month, day].join('-');
}

const getBlockStats = (startHeight, latestHeight) => {
    let blockStats = {};
    const cond = {$and: [
        { height: { $gt: startHeight } },
        { height: { $lte: latestHeight } } ]};
    const options = {sort:{height: 1}};
    Blockscon.find(cond, options).forEach((block) => {
        blockStats[block.height] = {
            height: block.height,
            proposerAddress: block.proposerAddress,
            precommitsCount: block.precommitsCount,
            validatorsCount: block.validatorsCount,
            validators: block.validators,
            time: block.time
        }
    });

    Analytics.find(cond, options).forEach((block) => {
        if (!blockStats[block.height]) {
            blockStats[block.height] = { height: block.height };
            console.log(`block ${block.height} does not have an entry`);
        }
        _.assign(blockStats[block.height], {
            precommits: block.precommits,
            averageBlockTime: block.averageBlockTime,
            timeDiff: block.timeDiff,
            voting_power: block.voting_power
        });
    });
    return blockStats;
}

const getPreviousRecord = (voterAddress, proposerAddress) => {
    let previousRecord = MissedBlocks.findOne(
        {voter:voterAddress, proposer:proposerAddress, blockHeight: -1});
    let lastUpdatedHeight = Meteor.settings.params.startHeight;
    let prevStats = {};
    if (previousRecord) {
        prevStats = _.pick(previousRecord, ['missCount', 'totalCount']);
    } else {
        prevStats = {
            missCount: 0,
            totalCount: 0
        }
    }
    return prevStats;
}

Meteor.methods({
    'ValidatorRecords.calculateMissedBlocks': function(){
        if (!COUNTMISSEDBLOCKS){
            try {
                let startTime = Date.now();
                COUNTMISSEDBLOCKS = true;
                console.log('calulate missed blocks count');
                this.unblock();
                let validators = Validators.find({}).fetch();
                let latestHeight = Meteor.call('blocks.getCurrentHeight');
                let explorerStatus = Status.findOne({chainId: Meteor.settings.public.chainId});
                let startHeight = (explorerStatus&&explorerStatus.lastProcessedMissedBlockHeight)?explorerStatus.lastProcessedMissedBlockHeight:Meteor.settings.params.startHeight;
                latestHeight = Math.min(startHeight + BULKUPDATEMAXSIZE, latestHeight);
                const bulkMissedStats = MissedBlocks.rawCollection().initializeOrderedBulkOp();

                let validatorsMap = {};
                validators.forEach((validator) => validatorsMap[validator.address] = validator);

                // a map of block height to block stats
                let blockStats = getBlockStats(startHeight, latestHeight);

                // proposerVoterStats is a proposer-voter map counting numbers of proposed blocks of which voter is an active validator
                let proposerVoterStats = {}

                _.forEach(blockStats, (block, blockHeight) => {
                    let proposerAddress = block.proposerAddress;
                    let votedValidators = new Set(block.validators);
                    let validatorSets = ValidatorSets.findOne({block_height:block.height});
                    let votedVotingPower = 0;

                    validatorSets.validators.forEach((activeValidator) => {
                        if (votedValidators.has(activeValidator.address))
                            votedVotingPower += parseFloat(activeValidator.voting_power)
                    })

                    validatorSets.validators.forEach((activeValidator) => {
                        let currentValidator = activeValidator.address
                        if (!_.has(proposerVoterStats, [proposerAddress, currentValidator])) {
                            let prevStats = getPreviousRecord(currentValidator, proposerAddress);
                            _.set(proposerVoterStats, [proposerAddress, currentValidator], prevStats);
                        }

                        _.update(proposerVoterStats, [proposerAddress, currentValidator, 'totalCount'], (n) => n+1);
                        if (!votedValidators.has(currentValidator)) {
                            _.update(proposerVoterStats, [proposerAddress, currentValidator, 'missCount'], (n) => n+1);
                            bulkMissedStats.insert({
                                voter: currentValidator,
                                blockHeight: block.height,
                                proposer: proposerAddress,
                                precommitsCount: block.precommitsCount,
                                validatorsCount: block.validatorsCount,
                                time: block.time,
                                precommits: block.precommits,
                                averageBlockTime: block.averageBlockTime,
                                timeDiff: block.timeDiff,
                                votingPower: block.voting_power,
                                votedVotingPower,
                                updatedAt: latestHeight,
                                missCount: _.get(proposerVoterStats, [proposerAddress, currentValidator, 'missCount']),
                                totalCount: _.get(proposerVoterStats, [proposerAddress, currentValidator, 'totalCount'])
                            });
                        }
                    })
                });

                _.forEach(proposerVoterStats, (voters, proposerAddress) => {
                    _.forEach(voters, (stats, voterAddress) => {
                        bulkMissedStats.find({
                            voter: voterAddress,
                            proposer: proposerAddress,
                            blockHeight: -1
                        }).upsert().updateOne({$set: {
                            voter: voterAddress,
                            proposer: proposerAddress,
                            blockHeight: -1,
                            updatedAt: latestHeight,
                            missCount: _.get(stats, 'missCount'),
                            totalCount: _.get(stats, 'totalCount')
                        }});
                    });
                });

                let message = '';
                if (bulkMissedStats.length > 0){
                    const client = MissedBlocks._driver.mongo.client;
                    // TODO: add transaction back after replica set(#146) is set up
                    // let session = client.startSession();
                    // session.startTransaction();
                    let bulkPromise = bulkMissedStats.execute(null/*, {session}*/).then(
                        Meteor.bindEnvironment((result, err) => {
                            if (err){
                                COUNTMISSEDBLOCKS = false;
                                // Promise.await(session.abortTransaction());
                                throw err;
                            }
                            if (result){
                                // Promise.await(session.commitTransaction());
                                message = `(${result.result.nInserted} inserted, ` +
                                           `${result.result.nUpserted} upserted, ` +
                                           `${result.result.nModified} modified)`;
                            }
                        }));

                    Promise.await(bulkPromise);
                }

                COUNTMISSEDBLOCKS = false;
                Status.upsert({chainId: Meteor.settings.public.chainId}, {$set:{lastProcessedMissedBlockHeight:latestHeight, lastProcessedMissedBlockTime: new Date()}});
                return `done in ${Date.now() - startTime}ms ${message}`;
            } catch (e) {
                COUNTMISSEDBLOCKS = false;
                throw e;
            }
        }
        else{
            return "updating...";
        }
    },
    'ValidatorRecords.calculateMissedBlocksStats': function(){
        // TODO: deprecate this method and MissedBlocksStats collection
        // console.log("ValidatorRecords.calculateMissedBlocks: "+COUNTMISSEDBLOCKS);
        if (!COUNTMISSEDBLOCKSSTATS){
            COUNTMISSEDBLOCKSSTATS = true;
            console.log('calulate missed blocks stats');
            this.unblock();
            let validators = Validators.find({}).fetch();
            let latestHeight = Meteor.call('blocks.getCurrentHeight');
            let explorerStatus = Status.findOne({chainId: Meteor.settings.public.chainId});
            let startHeight = (explorerStatus&&explorerStatus.lastMissedBlockHeight)?explorerStatus.lastMissedBlockHeight:Meteor.settings.params.startHeight;
            // console.log(latestHeight);
            // console.log(startHeight);
            const bulkMissedStats = MissedBlocksStats.rawCollection().initializeUnorderedBulkOp();
            for (i in validators){
                // if ((validators[i].address == "B8552EAC0D123A6BF609123047A5181D45EE90B5") || (validators[i].address == "69D99B2C66043ACBEAA8447525C356AFC6408E0C") || (validators[i].address == "35AD7A2CD2FC71711A675830EC1158082273D457")){
                let voterAddress = validators[i].address;
                let missedRecords = ValidatorRecords.find({
                    address:voterAddress,
                    exists:false,
                    $and: [ { height: { $gt: startHeight } }, { height: { $lte: latestHeight } } ]
                }).fetch();

                let counts = {};

                // console.log("missedRecords to process: "+missedRecords.length);
                for (b in missedRecords){
                    let block = Blockscon.findOne({height:missedRecords[b].height});
                    let existingRecord = MissedBlocksStats.findOne({voter:voterAddress, proposer:block.proposerAddress});

                    if (typeof counts[block.proposerAddress] === 'undefined'){
                        if (existingRecord){
                            counts[block.proposerAddress] = existingRecord.count+1;
                        }
                        else{
                            counts[block.proposerAddress] = 1;
                        }
                    }
                    else{
                        counts[block.proposerAddress]++;
                    }
                }

                for (address in counts){
                    let data = {
                        voter: voterAddress,
                        proposer:address,
                        count: counts[address]
                    }

                    bulkMissedStats.find({voter:voterAddress, proposer:address}).upsert().updateOne({$set:data});
                }
                // }

            }

            if (bulkMissedStats.length > 0){
                bulkMissedStats.execute(Meteor.bindEnvironment((err, result) => {
                    if (err){
                        COUNTMISSEDBLOCKSSTATS = false;
                        console.log(err);
                    }
                    if (result){
                        Status.upsert({chainId: Meteor.settings.public.chainId}, {$set:{lastMissedBlockHeight:latestHeight, lastMissedBlockTime: new Date()}});
                        COUNTMISSEDBLOCKSSTATS = false;
                        console.log("done");
                    }
                }));
            }
            else{
                COUNTMISSEDBLOCKSSTATS = false;
            }

            return true;
        }
        else{
            return "updating...";
        }
    },
    'Analytics.aggregateBlockTimeAndVotingPower': function(time){
        this.unblock();
        let now = new Date();

        if (time == 'm'){
            let averageBlockTime = 0;
            let averageVotingPower = 0;

            let analytics = Analytics.find({ "time": { $gt: new Date(Date.now() - 60 * 1000) } }).fetch();
            if (analytics.length > 0){
                for (i in analytics){
                    averageBlockTime += analytics[i].timeDiff;
                    averageVotingPower += analytics[i].voting_power;
                }
                averageBlockTime = averageBlockTime / analytics.length;
                averageVotingPower = averageVotingPower / analytics.length;

                Chain.update({chainId:Meteor.settings.public.chainId},{$set:{lastMinuteVotingPower:averageVotingPower, lastMinuteBlockTime:averageBlockTime}});
                AverageData.insert({
                    averageBlockTime: averageBlockTime,
                    averageVotingPower: averageVotingPower,
                    type: time,
                    createdAt: now
                })
            }
        }
        if (time == 'h'){
            let averageBlockTime = 0;
            let averageVotingPower = 0;
            let analytics = Analytics.find({ "time": { $gt: new Date(Date.now() - 60*60 * 1000) } }).fetch();
            if (analytics.length > 0){
                for (i in analytics){
                    averageBlockTime += analytics[i].timeDiff;
                    averageVotingPower += analytics[i].voting_power;
                }
                averageBlockTime = averageBlockTime / analytics.length;
                averageVotingPower = averageVotingPower / analytics.length;

                Chain.update({chainId:Meteor.settings.public.chainId},{$set:{lastHourVotingPower:averageVotingPower, lastHourBlockTime:averageBlockTime}});
                AverageData.insert({
                    averageBlockTime: averageBlockTime,
                    averageVotingPower: averageVotingPower,
                    type: time,
                    createdAt: now
                })
            }
        }

        if (time == 'd'){
            let averageBlockTime = 0;
            let averageVotingPower = 0;
            let analytics = Analytics.find({ "time": { $gt: new Date(Date.now() - 24*60*60 * 1000) } }).fetch();
            if (analytics.length > 0){
                for (i in analytics){
                    averageBlockTime += analytics[i].timeDiff;
                    averageVotingPower += analytics[i].voting_power;
                }
                averageBlockTime = averageBlockTime / analytics.length;
                averageVotingPower = averageVotingPower / analytics.length;

                Chain.update({chainId:Meteor.settings.public.chainId},{$set:{lastDayVotingPower:averageVotingPower, lastDayBlockTime:averageBlockTime}});
                AverageData.insert({
                    averageBlockTime: averageBlockTime,
                    averageVotingPower: averageVotingPower,
                    type: time,
                    createdAt: now
                })
            }
        }

        // return analytics.length;
    },
    'Analytics.aggregateValidatorDailyBlockTime': function(){
        this.unblock();
        let validators = Validators.find({}).fetch();
        let now = new Date();
        for (i in validators){
            let averageBlockTime = 0;

            let blocks = Blockscon.find({proposerAddress:validators[i].address, "time": { $gt: new Date(Date.now() - 24*60*60 * 1000) }}, {fields:{height:1}}).fetch();

            if (blocks.length > 0){
                let blockHeights = [];
                for (b in blocks){
                    blockHeights.push(blocks[b].height);
                }

                let analytics = Analytics.find({height: {$in:blockHeights}}, {fields:{height:1,timeDiff:1}}).fetch();


                for (a in analytics){
                    averageBlockTime += analytics[a].timeDiff;
                }

                averageBlockTime = averageBlockTime / analytics.length;
            }

            AverageValidatorData.insert({
                proposerAddress: validators[i].address,
                averageBlockTime: averageBlockTime,
                type: 'ValidatorDailyAverageBlockTime',
                createdAt: now
            })
        }

        return true;
    },
    'Analytics.aggregateTransactionDataOld': function(){
        this.unblock();
        let validators = Validators.find({}).fetch();
        let now = new Date();
        for (i in validators){
            let averageBlockTime = 0;

            let blocks = Blockscon.find({proposerAddress:validators[i].address, "time": { $gt: new Date(Date.now() - 24*60*60 * 1000) }}, {fields:{height:1}}).fetch();

            if (blocks.length > 0){
                let blockHeights = [];
                for (b in blocks){
                    blockHeights.push(blocks[b].height);
                }

                let analytics = Analytics.find({height: {$in:blockHeights}}, {fields:{height:1,timeDiff:1}}).fetch();


                for (a in analytics){
                    averageBlockTime += analytics[a].timeDiff;
                }

                averageBlockTime = averageBlockTime / analytics.length;
            }

            AverageValidatorData.insert({
                proposerAddress: validators[i].address,
                averageBlockTime: averageBlockTime,
                type: 'ValidatorDailyAverageBlockTime',
                createdAt: now
            })
        }

        return true;
    },
    'Analytics.getAggregateTransactionData'(){
        const todaysDateString = getDateString(new Date());
        // Get the most recent date of DailyTransactions persisted
        const lastDailyTransactionData = DailyTransactionData.find(
            {
                _id: { $lt: todaysDateString }
            },
            {
                fields: { _id:1 },
                sort: { _id: -1 },
                limit: 1
            },
        ).fetch();

        const lastDailyTransactionDataDate = lastDailyTransactionData.length > 0 ? lastDailyTransactionData[0]._id : '';
        // if(lastDailyTransactionDataDate !== '') {
        //     console.log(lastDailyTransactionDataDate)
        //     const lastDate = new Date(lastDailyTransactionDataDate);
        //     const middayNextDay = new Date(lastDate.setDate(lastDate.getDate() + 1));
        //     middayNextDay.setHours(13, 0, 0, 0);
        //     const midnightJustGone = new Date();
        //     midnightJustGone.setHours(0, 0, 0, 0);
        //     const midnightJustGoneSeconds = midnightJustGone.getTime() / 1000;
        //     console.log(midnightJustGoneSeconds)
        //     const shrPrices = [];
        //     for(let middaySeconds = middayNextDay.getTime() / 1000; middaySeconds < midnightJustGoneSeconds; middaySeconds += 86400) {
        //         console.log(middaySeconds)
        //         const shrPricesResult = CoinStats.find(
        //             {
        //                 last_updated_at: { $gt: middaySeconds }
        //             },
        //             {
        //                 fields: { usd:1 },
        //                 sort: { _id: -1 },
        //                 limit: 1
        //             },
        //         ).fetch();
        //         shrPrices.push({date: new Date(middaySeconds * 1000), usd: shrPricesResult[0].usd});
        //         console.log(shrPricesResult)
        //         // middayNextDay.setDate(middayNextDay.getDate() + 1);
        //     }
        //     console.log(shrPrices)
        // }
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

        // works perfectly for grouping by day and getting the feeShr and txs
        const aggregateDailyTxAndFeePipeline =
        [
            // stringToDateConversionStage,
            // getFeeShrAmountAsString,
            // getTxMsgObj,
            {
                $project:
                {
                    // date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
                    date: { $substr: [ "$timestamp", 0, 10 ] }
                    // txType: "$txMsg.type",
                    // feeShr: { $toInt: "$feeShrString.amount" }, 
                    // "height": 1
                }
            },
            {
                $match: {
                    $and: [
                        { date : { $gt: lastDailyTransactionDataDate } },
                        { date : { $lt: todaysDateString } } 
                    ]
                }
            },
            {
                $group: {
                    _id: "$date",
                    txs: { $sum: 1 },
                    // sumHeight: { $sum: "$height" },
                    // sumFeeShr: { $sum: "$feeShr" }
                 }
            },
            { $sort: { _id: 1 } },
          ];

          // This gets daily: txs, txTypes + breakdown, sumFeeShr, date...
          // Only gets daily data after the last DailyTransactions persisted
          // and before todays date
          const aggregateDailyTxDataPipeline = [
            getFeeShrAmountAsString,
            getTxMsgObj,
            {
                $project:
                {
                    date: { $substr: [ "$timestamp", 0, 10 ] },
                    txType: "$txMsg.type",
                    feeShr: { $toInt: "$feeShrString.amount" }, 
                }
            },
            {
                $match: {
                    $and: [
                        { date : { $gt: lastDailyTransactionDataDate } },
                        { date : { $lt: todaysDateString } }
                    ]
                }
            },
            { $group: {
                _id: {
                    date: "$date",
                    txType: "$txType"
                },
                txs: { $sum: 1 },
                sumFeeShr: { $sum: "$feeShr" },
            }},
            { $group: {
                _id: "$_id.date",
                txTypes: { 
                    $push: { 
                        txType: "$_id.txType",
                        txs: "$txs",
                        sumFeeShr: "$sumFeeShr",
                    },
                },
                txs: { $sum: "$txs" },
                sumFeeShr: { $sum: "$sumFeeShr" },

            }},
            { $project: {
                txTypes: 1,
                txs: 1,
                sumFeeShr: 1,
            }},
            { $sort: { _id: 1 } },
          ];
        return Promise.await(transactions.aggregate(aggregateDailyTxDataPipeline).toArray());
    },
    'Analytics.persistAggregateTransactionData': function(){
        Meteor.call('Analytics.getAggregateTransactionData', (error, result) => {
            if (error) {
                console.log("getting aggregate transaction data error:" + error)
            }
            else {
                console.log("getting aggregate transaction data ok:" + result);
                this.unblock();
                console.log(result)
                DailyTransactionData.remove({});
                const shrPrices = [];
                if(result.length > 0 && result[result.length - 1]._id) {
                    // console.log(result[result.length - 1]._id)
                    const lastDate = new Date(result[result.length - 1]._id);
                    const middayNextDay = new Date(lastDate.setDate(lastDate.getDate() + 1));
                    middayNextDay.setHours(13, 0, 0, 0);
                    const midnightJustGone = new Date();
                    midnightJustGone.setHours(0, 0, 0, 0);
                    const midnightJustGoneSeconds = midnightJustGone.getTime() / 1000;
                    // console.log(midnightJustGoneSeconds)
                    for(let middaySeconds = middayNextDay.getTime() / 1000; middaySeconds < midnightJustGoneSeconds; middaySeconds += 86400) {
                        console.log(middaySeconds)
                        const shrPricesResult = CoinStats.find(
                            {
                                last_updated_at: { $gt: middaySeconds }
                            },
                            {
                                fields: { usd:1 },
                                sort: { _id: -1 },
                                limit: 1
                            },
                        ).fetch();
                        shrPrices.push({
                            date: getDateString(new Date(middaySeconds * 1000)),
                            usd: shrPricesResult[0].usd
                        });
                        // console.log(shrPricesResult)
                    }
                    // console.log(shrPrices)
                }
                console.log(result)
                for(let i = 0; i < result.length; i++) {
                    const dailyTxRecord = result[i];
                    console.log(shrPrices)
                    console.log(dailyTxRecord)
                    const shrPriceObj = shrPrices.find(shrPriceObj => {
                        return shrPriceObj.date === dailyTxRecord._id;
                    })
                    if(shrPriceObj) {
                        const shrPriceUsd = shrPriceObj.usd;
                        dailyTxRecord.shrPriceUsd = shrPriceUsd;
                        dailyTxRecord.sumFeeUsd = dailyTxRecord.sumFeeShr * shrPriceUsd;
                        for(txType in dailyTxRecord.txTypes) {
                            txType.sumFeeUsd = txType.sumFeeShr * shrPriceUsd;
                        }
                    }
                    console.log(dailyTxRecord)
                    DailyTransactionData.insert(dailyTxRecord);
                }
            }
        }); 
        return true;
    },
})
