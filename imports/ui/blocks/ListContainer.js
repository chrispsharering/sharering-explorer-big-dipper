import { Meteor } from 'meteor/meteor';
// import React, { Component } from 'react';
import { withTracker } from 'meteor/react-meteor-data';
import { Blockscon } from '/imports/api/blocks/blocks.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { CoinStats } from '../../api/coin-stats/coin-stats.js';

import Blocks from './List.jsx';

export default BlocksContainer = withTracker((props) => {
    let heightHandle, transactionsHandle, chainStatesHandle;
    let loading = true;

    if (Meteor.isClient){
        heightHandle = Meteor.subscribe('blocks.height', props.limit);
        transactionsHandle = Meteor.subscribe('transactions.list', props.limit);
        chainStatesHandle = Meteor.subscribe('chainStates.latest');
        loading = (!heightHandle.ready() && !transactionsHandle.ready() && !chainStatesHandle.ready() 
                    && props.limit == Meteor.settings.public.initialPageSize);
    }

    let blocks;
    let blocksExist;
    let transactions;
    let coinStats;

    if (Meteor.isServer || (!loading)){
        coinStats = CoinStats.findOne({}, {sort:{last_updated_at:-1}, limit:1});
        blocks = Blockscon.find({}, {sort: {height:-1}}).fetch();

        // Fetch the transactions for each block
        if(blocks && blocks.length > 0) {
            blocks.forEach(b => {
                transactions = Transactions.find({height: b.height}).fetch();
                b.txFeeShr = 0;
                if(transactions && transactions.length > 0) {
                    transactions.forEach(t => {
                        b.txFeeShr += parseInt(t.tx.value.fee.amount[0].amount);
                    })
                }
                b.txFeeUsd = b.txFeeShr * coinStats.usd;
                b.transactions = transactions;
            })
        }
        
        if (Meteor.isServer){
            // loading = false;
            blocksExist = !!blocks && !!transactions;
        }
        else{
            blocksExist = !loading && !!blocks && !!transactions;
        }
    }
    return {
        loading: loading,
        blocksExist,
        blocks: blocksExist ? blocks : {},
        isHomePage: props.isHomePage
    };
})(Blocks);
