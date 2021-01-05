import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';
import { Transactions } from '/imports/api/transactions/transactions.js';
import List from './List.jsx';
import { CoinStats } from '../../api/coin-stats/coin-stats.js';

export default ValidatorDetailsContainer = withTracker((props) => {
    let transactionsHandle, transactions, transactionsExist, chainStatesHandle;
    let loading = true;
    let coinStats;

    if (Meteor.isClient){
        transactionsHandle = Meteor.subscribe('transactions.list', props.limit);
        chainStatesHandle = Meteor.subscribe('chainStates.latest');
        loading = (!transactionsHandle.ready() && !chainStatesHandle.ready() && props.limit == Meteor.settings.public.initialPageSize);
    }

    if (Meteor.isServer || !loading){
        coinStats = CoinStats.findOne({}, {sort:{last_updated_at:-1}, limit:1});
        transactions = Transactions.find({}, {sort:{height:-1}}).fetch();

        // Fetch the transactions fee for each tx
        if(transactions && transactions.length > 0) {
            transactions.forEach(t => {
                t.feeShr = t.tx.value.fee.amount.length > 0 ? parseInt(t.tx.value.fee.amount[0].amount) : 0;
                t.feeUsd = t.feeShr * coinStats.usd;
            });
        }

        if (Meteor.isServer){
            // loading = false;
            transactionsExist = !!transactions;
        }
        else{
            transactionsExist = !loading && !!transactions;
        }
    }
    
    return {
        loading,
        transactionsExist,
        transactions: transactionsExist ? transactions : {},
        isHomePage: props.isHomePage
    };
})(List);