import { Meteor } from 'meteor/meteor';
// import React, { Component } from 'react';
import { withTracker } from 'meteor/react-meteor-data';
import { Blockscon } from '/imports/api/blocks/blocks.js';
import { Transactions } from '/imports/api/transactions/transactions.js';

import Blocks from './List.jsx';

export default BlocksContainer = withTracker((props) => {
    let heightHandle, transactionsHandle;
    let loading = true;

    if (Meteor.isClient){
        heightHandle = Meteor.subscribe('blocks.height', props.limit);
        transactionsHandle = Meteor.subscribe('transactions.list', props.limit);
        loading = (!heightHandle.ready() && !transactionsHandle.ready() && props.limit == Meteor.settings.public.initialPageSize);
    }

    let blocks;
    let blocksExist;
    let transactions;

    if (Meteor.isServer || (!loading)){
        blocks = Blockscon.find({}, {sort: {height:-1}}).fetch();

        // Fetch the transactions for each block
        if(blocks && blocks.length > 0) {
            blocks.forEach(b => {
                transactions = Transactions.find({height: b.height}).fetch();
                b.txFees = 0;
                // b.txFees = transactions.length > 0 ? transactions.tx.value.fee.amount[0].amount : 0;
                console.log(transactions)
                if(transactions && transactions.length > 0) {
                    transactions.forEach(t => {
                        // b.txFees += t.tx.value.fee.amount[0].amount;
                        b.txFees += t.tx.value.fee.gas;
                    })
                }
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
console.log(blocks)
    return {
        loading: loading,
        blocksExist,
        blocks: blocksExist ? blocks : {},
        isHomePage: props.isHomePage
    };
})(Blocks);
