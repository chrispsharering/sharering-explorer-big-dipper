/* eslint-disable no-labels */
import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http';
import { Promise } from "meteor/promise";
import { Blockscon } from '/imports/api/blocks/blocks.js';
import { Chain } from '/imports/api/chain/chain.js';
import { ValidatorSets } from '/imports/api/validator-sets/validator-sets.js';
import { Validators } from '/imports/api/validators/validators.js';
import { ValidatorRecords, Analytics, VPDistributions} from '/imports/api/records/records.js';
import { VotingPowerHistory } from '/imports/api/voting-power/history.js';
import { Transactions } from '../../transactions/transactions.js';
import { Evidences } from '../../evidences/evidences.js';
import { sha256 } from 'js-sha256';
import { getAddress } from 'tendermint/lib/pubkey';
import * as cheerio from 'cheerio';

// import Block from '../../../ui/components/Block';

// getValidatorVotingPower = (validators, address) => {
//     for (v in validators){
//         if (validators[v].address == address){
//             return parseInt(validators[v].voting_power);
//         }
//     }
// }

function formatDate(date) {
    let d = new Date(date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear(),
        hour = d.getUTCHours(),
        minute = d.getUTCMinutes(),
        second = d.getUTCSeconds();

    if (month.length < 2) 
        month = '0' + month;
    if (day.length < 2) 
        day = '0' + day;

    return `${year}-${month}-${day}, time: ${hour}:${minute} and ${second} sec`;
}

getRemovedValidators = (prevValidators, validators) => {
    // let removeValidators = [];
    for (p in prevValidators){
        for (v in validators){
            if (prevValidators[p].address == validators[v].address){
                prevValidators.splice(p,1);
            }
        }
    }

    return prevValidators;
}

getValidatorProfileUrl = (identity) => {
    if (identity.length == 16){
        beforeDate = new Date();
        const url = `https://keybase.io/_/api/1.0/user/lookup.json?key_suffix=${identity}&fields=pictures`;
        let response = HTTP.get(url)
        afterDate = new Date();
        console.log("Height:, HTTP call (" + url + ") took: "+((afterDate-beforeDate)/1000)+"seconds.");
        if (response.statusCode == 200) {
            let them = response.data.them
            return them && them.length && them[0].pictures && them[0].pictures.primary && them[0].pictures.primary.url;
        } else {
            console.log(JSON.stringify(response))
        }
    } else if (identity.indexOf("keybase.io/team/")>0){
        beforeDate = new Date();
        let teamPage = HTTP.get(identity);
        afterDate = new Date();
        console.log("Height:, HTTP call (" + identity + ") took: "+((afterDate-beforeDate)/1000)+"seconds.");
        if (teamPage.statusCode == 200){
            let page = cheerio.load(teamPage.content);
            return page(".kb-main-card img").attr('src');
        } else {
            console.log(JSON.stringify(teamPage))
        }
    }
}

// var filtered = [1, 2, 3, 4, 5].filter(notContainedIn([1, 2, 3, 5]));
// console.log(filtered); // [4]

Meteor.methods({
    'blocks.averageBlockTime'(address){
        let blocks = Blockscon.find({proposerAddress:address}).fetch();
        let heights = blocks.map((block, i) => {
            return block.height;
        });
        let blocksStats = Analytics.find({height:{$in:heights}}).fetch();
        // console.log(blocksStats);

        let totalBlockDiff = 0;
        for (b in blocksStats){
            totalBlockDiff += blocksStats[b].timeDiff;
        }
        return totalBlockDiff/heights.length;
    },
    'blocks.findUpTime'(address){
        let collection = ValidatorRecords.rawCollection();
        // let aggregateQuery = Meteor.wrapAsync(collection.aggregate, collection);
        var pipeline = [
            {$match:{"address":address}},
            // {$project:{address:1,height:1,exists:1}},
            {$sort:{"height":-1}},
            {$limit:(Meteor.settings.public.uptimeWindow-1)},
            {$unwind: "$_id"},
            {$group:{
                "_id": "$address",
                "uptime": {
                    "$sum":{
                        $cond: [{$eq: ['$exists', true]}, 1, 0]
                    }
                }
            }
            }];
        // let result = aggregateQuery(pipeline, { cursor: {} });

        return Promise.await(collection.aggregate(pipeline).toArray());
        // return .aggregate()
    },
    'blocks.getLatestHeight': function() {
        this.unblock();
        let url = RPC+'/status';
        try{
            let response = HTTP.get(url);
            let status = JSON.parse(response.content);
            return (status.result.sync_info.latest_block_height);
        }
        catch (e){
            return 0;
        }
    },
    'blocks.getCurrentHeight': function() {
        this.unblock();
        let currHeight = Blockscon.find({},{sort:{height:-1},limit:1}).fetch();
        // console.log("currentHeight:"+currHeight);
        let startHeight = Meteor.settings.params.startHeight;
        if (currHeight && currHeight.length == 1) {
            let height = currHeight[0].height;
            if (height > startHeight)
                return height
        }
        return startHeight
    },
    'blocks.blocksUpdate': function() {
        if (SYNCING)
            return "Syncing...";
        else console.log("start to sync");
        // Meteor.clearInterval(Meteor.timerHandle);
        // get the latest height
        let until = Meteor.call('blocks.getLatestHeight');
        // console.log(until);
        // get the current height in db
        let curr = Meteor.call('blocks.getCurrentHeight');
        let beforeDate;
        let afterDate;
        console.log(curr);
        // loop if there's update in db
        if (until > curr) {
            SYNCING = true;

            let validatorSet = {}
            // get latest validator candidate information
            url = LCD+'/staking/validators';
            
            stakingValidators: try{
                beforeDate = new Date();
                response = HTTP.get(url);
                afterDate = new Date();
                console.log("HTTP call (" + url + ") took: "+((afterDate-beforeDate)/1000)+"seconds.");
                let responseContent;
                try {
                    responseContent = JSON.parse(response.content);
                } catch(e) {
                    console.error(url);
                    console.error('Error parsing response content to JSON - Likely due to LCD not responding fast enough and with only part of the json object');
                    break stakingValidators;
                }
                responseContent.result.forEach((validator) => validatorSet[validator.consensus_pubkey] = validator);
            }
            catch(e){
                console.log(url);
                console.log(e);
            }

            url = LCD+'/staking/validators?status=unbonding';

            stakingValidatorsUnbonding: try {
                beforeDate = new Date();
                response = HTTP.get(url);
                afterDate = new Date();
                console.log("HTTP call (" + url + ") took: "+((afterDate-beforeDate)/1000)+"seconds.");
                let responseContent;
                try {
                    responseContent = JSON.parse(response.content);
                } catch(e) {
                    console.error(url);
                    console.error('Error parsing response content to JSON - Likely due to LCD not responding fast enough and with only part of the json object');
                    break stakingValidatorsUnbonding;
                }
                responseContent.result.forEach((validator) => validatorSet[validator.consensus_pubkey] = validator)
            }
            catch(e){
                console.log(url);
                console.log(e);
            }

            url = LCD+'/staking/validators?status=unbonded';

            stakingValidatorsUnbonded: try{
                beforeDate = new Date();
                response = HTTP.get(url);
                afterDate = new Date();
                console.log("HTTP call (" + url + ") took: "+((afterDate-beforeDate)/1000)+"seconds.");
                let responseContent;
                try {
                    responseContent = JSON.parse(response.content);
                } catch(e) {
                    console.error(url);
                    console.error('Error parsing response content to JSON - Likely due to LCD not responding fast enough and with only part of the json object');
                    break stakingValidatorsUnbonded;
                }
                responseContent.result.forEach((validator) => validatorSet[validator.consensus_pubkey] = validator)
            }
            catch(e){
                console.log(url);
                console.log(e);
            }
            let totalValidators = Object.keys(validatorSet).length;
            console.log("all validators: "+ totalValidators);
            for (let height = curr+1 ; height <= until ; height++) {
                let startBlockTime = new Date();
                console.log("\n\nAbout to get Height: " + height + ", at time: " + formatDate(startBlockTime) + "\n\n");
                // add timeout here? and outside this loop (for catched up and keep fetching)?
                this.unblock();
                let url = RPC+'/block?height=' + height;
                let analyticsData = {};

                console.log(url);
                try{
                    const bulkValidators = Validators.rawCollection().initializeUnorderedBulkOp();
                    const bulkValidatorRecords = ValidatorRecords.rawCollection().initializeUnorderedBulkOp();
                    const bulkVPHistory = VotingPowerHistory.rawCollection().initializeUnorderedBulkOp();
                    const bulkTransations = Transactions.rawCollection().initializeUnorderedBulkOp();

                    let startGetHeightTime = new Date();
                    beforeDate = new Date();
                    let response = HTTP.get(url);
                    afterDate = new Date();
                    console.log("Height: " + height + ", HTTP call (" + url + ") took: "+((afterDate-beforeDate)/1000)+"seconds.");
                    if (response.statusCode == 200){
                        const endGetHeightSuccessTime = new Date();
                        // i need to figure out if the call to get the recent height is taking ages
                        // if so, it might be that the rpc server is too shit 
                        // its in a for loop so will just go around making this call
                        // see if there any other http calls and check the logs for the console log i added below to see
                        // how long the api clal takes
                        console.log("Get height success time: "+((endGetHeightSuccessTime-startGetHeightTime)/1000)+"seconds.");
                        let block = JSON.parse(response.content);
                        block = block.result;
                        // store height, hash, numtransaction and time in db
                        let blockData = {};
                        blockData.height = height;
                        blockData.hash = block.block_id.hash;
                        blockData.transNum = block.block.data.txs?block.block.data.txs.length:0;
                        blockData.time = new Date(block.block.header.time);
                        blockData.lastBlockHash = block.block.header.last_block_id.hash;
                        blockData.proposerAddress = block.block.header.proposer_address;
                        blockData.validators = [];

                        // Tendermint v0.33 start using "signatures" in last block instead of "precommits"
                        let precommits = block.block.last_commit.signatures; 
                        if (precommits != null){
                            // console.log(precommits.length);
                            for (let i=0; i<precommits.length; i++){
                                if (precommits[i] != null){
                                    blockData.validators.push(precommits[i].validator_address);
                                }
                            }

                            analyticsData.precommits = precommits.length;
                            // record for analytics
                            // PrecommitRecords.insert({height:height, precommits:precommits.length});
                        }

                        // save txs in database
                        if (block.block.data.txs && block.block.data.txs.length > 0){
                            beforeDate = new Date();
                            for (t in block.block.data.txs){
                                Meteor.call('Transactions.index', sha256(Buffer.from(block.block.data.txs[t], 'base64')), blockData.time, (err, result) => {
                                    if (err){
                                        console.log(err);
                                    }
                                });
                            }
                            afterDate = new Date();
                            console.log("Height: " + height + ", Meteor call (Transactions.index (for loop - " + block.block.data.txs.length + " txs)) took: "+((afterDate-beforeDate)/1000)+"seconds.");
                        }

                        // save double sign evidences
                        if (block.block.evidence.evidence){
                            beforeDate = new Date();
                            Evidences.insert({
                                height: height,
                                evidence: block.block.evidence.evidence
                            });
                            afterDate = new Date();
                            console.log("Height: " + height + ", Evidences.insert took: "+((afterDate-beforeDate)/1000)+"seconds.");
                        }

                        blockData.precommitsCount = blockData.validators.length;

                        analyticsData.height = height;

                        let endGetHeightTime = new Date();
                        console.log("Get height time: "+((endGetHeightTime-startGetHeightTime)/1000)+"seconds.");


                        let startGetValidatorsTime = new Date();
                        // update chain status
                        url = RPC+`/validators?height=${height}&page=1&per_page=100`;
                        beforeDate = new Date();
                        response = HTTP.get(url);
                        afterDate = new Date();
                        console.log("Height: " + height + ", HTTP call (" + url + ") took: "+((afterDate-beforeDate)/1000)+"seconds.");
                        console.log(url);
                        let validators = JSON.parse(response.content);
                        validators.result.block_height = parseInt(validators.result.block_height);
                        beforeDate = new Date();
                        ValidatorSets.insert(validators.result);
                        afterDate = new Date();
                        console.log("Height: " + height + ", ValidatorSets.insert took: "+((afterDate-beforeDate)/1000)+"seconds.");
                        blockData.validatorsCount = validators.result.validators.length;
                        let startBlockInsertTime = new Date();
                        beforeDate = new Date();
                        Blockscon.upsert({"height": blockData.height},{$set: blockData});
                        afterDate = new Date();
                        console.log("Height: " + height + ", Blockscon.upsert took: "+((afterDate-beforeDate)/1000)+"seconds.");
                        let endBlockInsertTime = new Date();
                        console.log("Block upsert time: "+((endBlockInsertTime-startBlockInsertTime)/1000)+"seconds.");

                        // store valdiators exist records
                        beforeDate = new Date();
                        let existingValidators = Validators.find({address:{$exists:true}}).fetch();
                        afterDate = new Date();
                        console.log("Height: " + height + ", Validators.find took: "+((afterDate-beforeDate)/1000)+"seconds.");

                        

                        if (height > 1){
                            // record precommits and calculate uptime
                            // only record from block 2
                            for (i in validators.result.validators){
                                let address = validators.result.validators[i].address;
                                let record = {
                                    height: height,
                                    address: address,
                                    exists: false,
                                    voting_power: parseInt(validators.result.validators[i].voting_power)//getValidatorVotingPower(existingValidators, address)
                                }

                                for (j in precommits){
                                    if (precommits[j] != null){
                                        if (address == precommits[j].validator_address){
                                            record.exists = true;
                                            precommits.splice(j,1);
                                            break;
                                        }
                                    }
                                }

                                // calculate the uptime based on the records stored in previous blocks
                                // only do this every 15 blocks ~

                                if ((height % 15) == 0){
                                    // let startAggTime = new Date();
                                    beforeDate = new Date();
                                    let numBlocks = Meteor.call('blocks.findUpTime', address);
                                    afterDate = new Date();
                                    console.log("Height: " + height + ", meteor.call blocks.findUpTime took: "+((afterDate-beforeDate)/1000)+"seconds.");

                                    
                                    let uptime = 0;
                                    // let endAggTime = new Date();
                                    // console.log("Get aggregated uptime for "+existingValidators[i].address+": "+((endAggTime-startAggTime)/1000)+"seconds.");
                                    if ((numBlocks[0] != null) && (numBlocks[0].uptime != null)){
                                        uptime = numBlocks[0].uptime;
                                    }

                                    let base = Meteor.settings.public.uptimeWindow;
                                    if (height < base){
                                        base = height;
                                    }

                                    if (record.exists){
                                        if (uptime < base){
                                            uptime++;
                                        }
                                        uptime = (uptime / base)*100;
                                        beforeDate = new Date();
                                        bulkValidators.find({address:address}).upsert().updateOne({$set:{uptime:uptime, lastSeen:blockData.time}});
                                        afterDate = new Date();
                                        console.log("Height: " + height + ", bulkValidators.find.upsert 1 took: "+((afterDate-beforeDate)/1000)+"seconds.");
                                    }
                                    else{
                                        uptime = (uptime / base)*100;
                                        beforeDate = new Date();
                                        bulkValidators.find({address:address}).upsert().updateOne({$set:{uptime:uptime}});

                                        afterDate = new Date();
                                        console.log("Height: " + height + ", bulkValidators.find.upsert 2 took: "+((afterDate-beforeDate)/1000)+"seconds.");

                                    }
                                }
                                beforeDate = new Date();
                                bulkValidatorRecords.find({address:record.address, height: record.height}).upsert().updateOne({$set:record});

                                afterDate = new Date();
                                console.log("Height: " + height + ", bulkValidatorRecords.find.upsert took: "+((afterDate-beforeDate)/1000)+"seconds.");
                                // ValidatorRecords.update({height:height,address:record.address},record);
                            }
                        }
                        beforeDate = new Date();
                        let chainStatus = Chain.findOne({chainId:block.block.header.chain_id});
                        afterDate = new Date();
                        console.log("Height: " + height + ", Chain.findOne took: "+((afterDate-beforeDate)/1000)+"seconds.");

                        let lastSyncedTime = chainStatus?chainStatus.lastSyncedTime:0;
                        let timeDiff;
                        let blockTime = Meteor.settings.params.defaultBlockTime;
                        if (lastSyncedTime){
                            let dateLatest = blockData.time;
                            let dateLast = new Date(lastSyncedTime);
                            timeDiff = Math.abs(dateLatest.getTime() - dateLast.getTime());
                            blockTime = (chainStatus.blockTime * (blockData.height - 1) + timeDiff) / blockData.height;
                        }

                        let endGetValidatorsTime = new Date();
                        console.log("Get height validators time: "+((endGetValidatorsTime-startGetValidatorsTime)/1000)+"seconds.");

                        beforeDate = new Date();
                        Chain.update({chainId:block.block.header.chain_id}, {$set:{lastSyncedTime:blockData.time, blockTime:blockTime}});
                        afterDate = new Date();
                        console.log("Height: " + height + ", Chain.update took: "+((afterDate-beforeDate)/1000)+"seconds.");


                        analyticsData.averageBlockTime = blockTime;
                        analyticsData.timeDiff = timeDiff;

                        analyticsData.time = blockData.time;

                        // initialize validator data at first block
                        // if (height == 1){
                        //     Validators.remove({});
                        // }

                        analyticsData.voting_power = 0;

                        let startFindValidatorsNameTime = new Date();
                        if (validators.result){
                            // validators are all the validators in the current height
                            console.log("validatorSet size: "+validators.result.validators.length);
                            for (v in validators.result.validators){
                                // Validators.insert(validators.result.validators[v]);
                                let validator = validators.result.validators[v];
                                validator.voting_power = parseInt(validator.voting_power);
                                validator.proposer_priority = parseInt(validator.proposer_priority);
                                beforeDate = new Date();
                                let valExist = Validators.findOne({"pub_key.value":validator.pub_key.value});
                                afterDate = new Date();
                                console.log("Height: " + height + ", Validators.findOne took: "+((afterDate-beforeDate)/1000)+"seconds.");
        
                                if (!valExist){
                                    console.log(`validator pub_key ${validator.address} ${validator.pub_key.value} not in db`);
                                    // let command = Meteor.settings.bin.gaiadebug+" pubkey "+validator.pub_key.value;
                                    // console.log(command);
                                    // let tempVal = validator;
                                    beforeDate = new Date();
                                    validator.address = getAddress(validator.pub_key);
                                    afterDate = new Date();
                                    console.log("Height: " + height + ", getAddress took: "+((afterDate-beforeDate)/1000)+"seconds.");
            
                                    beforeDate = new Date();
                                    validator.accpub = Meteor.call('pubkeyToBech32', validator.pub_key, Meteor.settings.public.bech32PrefixAccPub);
                                    afterDate = new Date();
                                    console.log("Height: " + height + ", Meteor.call for accpub took: "+((afterDate-beforeDate)/1000)+"seconds.");

                                    beforeDate = new Date();
                                    validator.operator_pubkey = Meteor.call('pubkeyToBech32', validator.pub_key, Meteor.settings.public.bech32PrefixValPub);
                                    afterDate = new Date();
                                    console.log("Height: " + height + ", Meteor.call for operator_pubkey took: "+((afterDate-beforeDate)/1000)+"seconds.");

                                    beforeDate = new Date();
                                    validator.consensus_pubkey = Meteor.call('pubkeyToBech32', validator.pub_key, Meteor.settings.public.bech32PrefixConsPub);
                                    afterDate = new Date();
                                    console.log("Height: " + height + ", Meteor.call for consensus_pubkey took: "+((afterDate-beforeDate)/1000)+"seconds.");

                                    let validatorData = validatorSet[validator.consensus_pubkey]
                                    if (validatorData){
                                        if (validatorData.description.identity)
                                            validator.profile_url =  getValidatorProfileUrl(validatorData.description.identity)
                                        validator.operator_address = validatorData.operator_address;
                                        beforeDate = new Date();
                                        validator.delegator_address = Meteor.call('getDelegator', validatorData.operator_address);
                                        afterDate = new Date();
                                        console.log("Height: " + height + ", Meteor.call for delegator_address took: "+((afterDate-beforeDate)/1000)+"seconds.");
                                        validator.jailed = validatorData.jailed;
                                        validator.status = validatorData.status;
                                        validator.min_self_delegation = validatorData.min_self_delegation;
                                        validator.tokens = validatorData.tokens;
                                        validator.delegator_shares = validatorData.delegator_shares;
                                        validator.description = validatorData.description;
                                        validator.bond_height = validatorData.bond_height;
                                        validator.bond_intra_tx_counter = validatorData.bond_intra_tx_counter;
                                        validator.unbonding_height = validatorData.unbonding_height;
                                        validator.unbonding_time = validatorData.unbonding_time;
                                        validator.commission = validatorData.commission;
                                        validator.self_delegation = validator.delegator_shares;
                                        // validator.removed = false,
                                        // validator.removedAt = 0
                                        // validatorSet.splice(val, 1);
                                    } else {
                                        console.log('no con pub key?')
                                    }

                                    // bulkValidators.insert(validator);
                                    beforeDate = new Date();
                                    bulkValidators.find({address: validator.address}).upsert().updateOne({$set:validator});
                                    afterDate = new Date();
                                    console.log("Height: " + height + ", bulkValidators.find.upsert 3 took: "+((afterDate-beforeDate)/1000)+"seconds.");
                                    // console.log("validator first appears: "+bulkValidators.length);
                                    beforeDate = new Date();
                                    bulkVPHistory.insert({
                                                        address: validator.address,
                                                        prev_voting_power: 0,
                                                        voting_power: validator.voting_power,
                                                        type: 'add',
                                                        height: blockData.height,
                                                        block_time: blockData.time
                                                    });
                                    afterDate = new Date();
                                    console.log("Height: " + height + ", bulkVPHistory.insert took: "+((afterDate-beforeDate)/1000)+"seconds.");
                                    

                                    // Meteor.call('runCode', command, function(error, result){
                                    // validator.address = result.match(/\s[0-9A-F]{40}$/igm);
                                    // validator.address = validator.address[0].trim();
                                    // validator.hex = result.match(/\s[0-9A-F]{64}$/igm);
                                    // validator.hex = validator.hex[0].trim();
                                    // validator.cosmosaccpub = result.match(/cosmospub.*$/igm);
                                    // validator.cosmosaccpub = validator.cosmosaccpub[0].trim();
                                    // validator.operator_pubkey = result.match(/cosmosvaloperpub.*$/igm);
                                    // validator.operator_pubkey = validator.operator_pubkey[0].trim();
                                    // validator.consensus_pubkey = result.match(/cosmosvalconspub.*$/igm);
                                    // validator.consensus_pubkey = validator.consensus_pubkey[0].trim();



                                    // });
                                }
                                else{
                                    let validatorData = validatorSet[valExist.consensus_pubkey]
                                    if (validatorData){
                                        if (validatorData.description && (!valExist.description || validatorData.description.identity !== valExist.description.identity))
                                            validator.profile_url =  getValidatorProfileUrl(validatorData.description.identity)
                                        validator.jailed = validatorData.jailed;
                                        validator.status = validatorData.status;
                                        validator.tokens = validatorData.tokens;
                                        validator.delegator_shares = validatorData.delegator_shares;
                                        validator.description = validatorData.description;
                                        validator.bond_height = validatorData.bond_height;
                                        validator.bond_intra_tx_counter = validatorData.bond_intra_tx_counter;
                                        validator.unbonding_height = validatorData.unbonding_height;
                                        validator.unbonding_time = validatorData.unbonding_time;
                                        validator.commission = validatorData.commission;

                                        // calculate self delegation percentage every 30 blocks

                                        if (height % 30 == 1){
                                            try{
                                                beforeDate = new Date();
                                                const url = LCD + '/staking/delegators/'+valExist.delegator_address+'/delegations/'+valExist.operator_address;
                                                let response = HTTP.get(url);
                                                afterDate = new Date();
                                                console.log("Height: " + height + ", HTTP call (" + url + ") took: "+((afterDate-beforeDate)/1000)+"seconds.");

                                                if (response.statusCode == 200){
                                                    let selfDelegation = JSON.parse(response.content).result;
                                                    if (selfDelegation.shares){
                                                        validator.self_delegation = parseFloat(selfDelegation.shares)/parseFloat(validator.delegator_shares);
                                                    }
                                                }
                                            }
                                            catch(e){
                                                // console.log(e);
                                            }
                                        }
                                        beforeDate = new Date();
                                        bulkValidators.find({consensus_pubkey: valExist.consensus_pubkey}).updateOne({$set:validator});
                                        afterDate = new Date();
                                        console.log("Height: " + height + ", bulkValidators.find.updateOne took: "+((afterDate-beforeDate)/1000)+"seconds.");
                                        // console.log("validator exisits: "+bulkValidators.length);
                                        // validatorSet.splice(val, 1);
                                    }  else {
                                        console.log('no con pub key?')
                                    }
                                    beforeDate = new Date();
                                    let prevVotingPower = VotingPowerHistory.findOne({address:validator.address}, {height:-1, limit:1});
                                    afterDate = new Date();
                                    console.log("Height: " + height + ", VotingPowerHistory.findOne took: "+((afterDate-beforeDate)/1000)+"seconds.");

                                    if (prevVotingPower){
                                        if (prevVotingPower.voting_power != validator.voting_power){
                                            let changeType = (prevVotingPower.voting_power > validator.voting_power)?'down':'up';
                                            let changeData = {
                                                address: validator.address,
                                                prev_voting_power: prevVotingPower.voting_power,
                                                voting_power: validator.voting_power,
                                                type: changeType,
                                                height: blockData.height,
                                                block_time: blockData.time
                                            };
                                            // console.log('voting power changed.');
                                            // console.log(changeData);
                                            beforeDate = new Date();
                                            bulkVPHistory.insert(changeData);
                                            afterDate = new Date();
                                            console.log("Height: " + height + ", bulkVPHistory.insert took: "+((afterDate-beforeDate)/1000)+"seconds.");
                                        }
                                    }

                                }


                                // console.log(validator);

                                analyticsData.voting_power += validator.voting_power;
                            }

                            // if there is validator removed
                            beforeDate = new Date();
                            let prevValidators = ValidatorSets.findOne({block_height:height-1});
                            afterDate = new Date();
                            console.log("Height: " + height + ", ValidatorSets.findOne took: "+((afterDate-beforeDate)/1000)+"seconds.");

                            if (prevValidators){
                                let removedValidators = getRemovedValidators(prevValidators.validators, validators.result.validators);
                                beforeDate = new Date();
                                for (r in removedValidators){
                                    bulkVPHistory.insert({
                                        address: removedValidators[r].address,
                                        prev_voting_power: removedValidators[r].voting_power,
                                        voting_power: 0,
                                        type: 'remove',
                                        height: blockData.height,
                                        block_time: blockData.time
                                    });
                                }
                                afterDate = new Date();
                                console.log("Height: " + height + ", bulkVPHistory.insert (for " + removedValidators.length + " inserts) took: "+((afterDate-beforeDate)/1000)+"seconds.");
                            }
                        }

                        // check if there's any validator not in db 14400 blocks(~1 day)
                        if (height % 14400 == 0){
                            try {
                                console.log('Checking all validators against db...')
                                let dbValidators = {}
                                beforeDate = new Date();
                                response = HTTP.get(url);Validators.find({}, {fields: {consensus_pubkey: 1, status: 1}}
                                    ).forEach((v) => dbValidators[v.consensus_pubkey] = v.status)
                                afterDate = new Date();
                                console.log("Height: " + height + ", HTTP call (" + url + ") took: "+((afterDate-beforeDate)/1000)+"seconds.");
                                beforeDate = new Date();
                                Object.keys(validatorSet).forEach((conPubKey) => {
                                    let validatorData = validatorSet[conPubKey];
                                    // Active validators should have been updated in previous steps
                                    if (validatorData.status === 2)
                                        return

                                    if (dbValidators[conPubKey] == undefined) {
                                        console.log(`validator with consensus_pubkey ${conPubKey} not in db`);

                                        validatorData.pub_key = {
                                            "type" : "tendermint/PubKeyEd25519",
                                            "value": Meteor.call('bech32ToPubkey', conPubKey)
                                        }
                                        validatorData.address = getAddress(validatorData.pub_key);
                                        validatorData.delegator_address = Meteor.call('getDelegator', validatorData.operator_address);

                                        validatorData.accpub = Meteor.call('pubkeyToBech32', validatorData.pub_key, Meteor.settings.public.bech32PrefixAccPub);
                                        validatorData.operator_pubkey = Meteor.call('pubkeyToBech32', validatorData.pub_key, Meteor.settings.public.bech32PrefixValPub);
                                        console.log(JSON.stringify(validatorData))
                                        bulkValidators.find({consensus_pubkey: conPubKey}).upsert().updateOne({$set:validatorData});
                                    } else if (dbValidators[conPubKey] == 2) {
                                        bulkValidators.find({consensus_pubkey: conPubKey}).upsert().updateOne({$set:validatorData});
                                    }
                                });
                                afterDate = new Date();
                                console.log("Height: " + height + ", all bulkValidators.find.upsert.updateOne for validatorSet object keys took: "+((afterDate-beforeDate)/1000)+"seconds.");
                                
                            } catch (e){
                                console.log(e)
                            }
                        }

                        // fetching keybase every 14400 blocks(~1 day)
                        if (height % 14400 == 1){
                            console.log('Fetching keybase...')
                            // eslint-disable-next-line no-loop-func
                            Validators.find({}).forEach((validator) => {
                                try {
                                    let profileUrl =  getValidatorProfileUrl(validator.description.identity)
                                    if (profileUrl) {
                                        beforeDate = new Date();
                                        bulkValidators.find({address: validator.address}
                                            ).upsert().updateOne({$set:{'profile_url':profileUrl}});
                                        afterDate = new Date();
                                        console.log("Height: " + height + ", bulkValidators.find.upsert.updateOne took: "+((afterDate-beforeDate)/1000)+"seconds.");
                                        
                                    }
                                } catch (e) {
                                    console.log(profileUrl);
                                    console.log(e)
                                }
                            })
                        }

                        let endFindValidatorsNameTime = new Date();
                        console.log("Get validators name time: "+((endFindValidatorsNameTime-startFindValidatorsNameTime)/1000)+"seconds.");

                        // record for analytics
                        let startAnayticsInsertTime = new Date();
                        beforeDate = new Date();
                        Analytics.upsert({"height": analyticsData.height},{$set: analyticsData});
                        afterDate = new Date();
                        console.log("Height: " + height + ", Analystics.upsert took: "+((afterDate-beforeDate)/1000)+"seconds.");
                        let endAnalyticsInsertTime = new Date();
                        console.log("Analytics upsert time: "+((endAnalyticsInsertTime-startAnayticsInsertTime)/1000)+"seconds.");

                        let startVUpTime = new Date();
                        if (bulkValidators.length > 0){
                            // console.log(bulkValidators.length);
                            beforeDate = new Date();
                            bulkValidators.execute((err, result) => {
                                if (err){
                                    console.log(err);
                                }
                                if (result){
                                    // console.log(result);
                                }
                            });
                            afterDate = new Date();
                            console.log("Height: " + height + ", bulkValidators.execute took: "+((afterDate-beforeDate)/1000)+"seconds.");
                            
                        }

                        let endVUpTime = new Date();
                        console.log("Validator update time: "+((endVUpTime-startVUpTime)/1000)+"seconds.");

                        let startVRTime = new Date();
                        if (bulkValidatorRecords.length > 0){
                            beforeDate = new Date();
                            bulkValidatorRecords.execute((err, result) => {
                                if (err){
                                    console.log(err);
                                }
                            });
                            afterDate = new Date();
                            console.log("Height: " + height + ", bulkValidatorRecords.execute took: "+((afterDate-beforeDate)/1000)+"seconds.");
                            
                        }

                        let endVRTime = new Date();
                        console.log("Validator records update time: "+((endVRTime-startVRTime)/1000)+"seconds.");

                        if (bulkVPHistory.length > 0){
                            beforeDate = new Date();
                            bulkVPHistory.execute((err, result) => {
                                if (err){
                                    console.log(err);
                                }
                            });
                            afterDate = new Date();
                            console.log("Height: " + height + ", bulkVPHistory.execute took: "+((afterDate-beforeDate)/1000)+"seconds.");
                            
                        }

                        if (bulkTransations.length > 0){
                            beforeDate = new Date();
                            bulkTransations.execute((err, result) => {
                                if (err){
                                    console.log(err);
                                }
                            });
                            afterDate = new Date();
                            console.log("Height: " + height + ", bulkTransactions.execute took: "+((afterDate-beforeDate)/1000)+"seconds.");
                            
                        }

                        // calculate voting power distribution every 60 blocks ~ 5mins

                        if (height % 60 == 1){
                            console.log("===== calculate voting power distribution =====");
                            beforeDate = new Date();
                            let activeValidators = Validators.find({status:2,jailed:false},{sort:{voting_power:-1}}).fetch();
                            afterDate = new Date();
                            console.log("Height: " + height + ", Validators.find for activeValidators took: "+((afterDate-beforeDate)/1000)+"seconds.");
                            let numTopTwenty = Math.ceil(activeValidators.length*0.2);
                            let numBottomEighty = activeValidators.length - numTopTwenty;

                            let topTwentyPower = 0;
                            let bottomEightyPower = 0;

                            let numTopThirtyFour = 0;
                            let numBottomSixtySix = 0;
                            let topThirtyFourPercent = 0;
                            let bottomSixtySixPercent = 0;



                            for (v in activeValidators){
                                if (v < numTopTwenty){
                                    topTwentyPower += activeValidators[v].voting_power;
                                }
                                else{
                                    bottomEightyPower += activeValidators[v].voting_power;
                                }


                                if (topThirtyFourPercent < 0.34){
                                    topThirtyFourPercent += activeValidators[v].voting_power / analyticsData.voting_power;
                                    numTopThirtyFour++;
                                }
                            }

                            bottomSixtySixPercent = 1 - topThirtyFourPercent;
                            numBottomSixtySix = activeValidators.length - numTopThirtyFour;

                            let vpDist = {
                                height: height,
                                numTopTwenty: numTopTwenty,
                                topTwentyPower: topTwentyPower,
                                numBottomEighty: numBottomEighty,
                                bottomEightyPower: bottomEightyPower,
                                numTopThirtyFour: numTopThirtyFour,
                                topThirtyFourPercent: topThirtyFourPercent,
                                numBottomSixtySix: numBottomSixtySix,
                                bottomSixtySixPercent: bottomSixtySixPercent,
                                numValidators: activeValidators.length,
                                totalVotingPower: analyticsData.voting_power,
                                blockTime: blockData.time,
                                createAt: new Date()
                            }

                            console.log(vpDist);
                            beforeDate = new Date();
                            VPDistributions.insert(vpDist);
                            afterDate = new Date();
                            console.log("Height: " + height + ", VPDistributions.insert took: "+((afterDate-beforeDate)/1000)+"seconds.");
                        }
                    }
                }
                catch (e){
                    console.log(url);
                    console.log(e);
                    SYNCING = false;
                    return "Stopped";
                }
                let endBlockTime = new Date();
                console.log("This block used: "+((endBlockTime-startBlockTime)/1000)+"seconds.");
            }
            SYNCING = false;
            Chain.update({chainId:Meteor.settings.public.chainId}, {$set:{lastBlocksSyncedTime:new Date(), totalValidators:totalValidators}});
        }

        return until;
    },
    'addLimit': function(limit) {
        // console.log(limit+10)
        return (limit+10);
    },
    'hasMore': function(limit) {
        if (limit > Meteor.call('getCurrentHeight')) {
            return (false);
        } else {
            return (true);
        }
    }
});
