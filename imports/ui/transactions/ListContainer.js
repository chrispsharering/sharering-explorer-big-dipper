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
            console.log('\n\n\nthere are transaction!\ntransactions for ListContainer are:')
            console.log(transactions)
            transactions.forEach(t => {
                console.log('\ntransaction')
                console.log(t)
                console.log('t.tx.value.fee.amount.length')
                console.log(t.tx.value.fee.amount.length)
                if(t.tx.value.fee.amount.length > 0) {
                    console.log('fee amount > 0 is true')
                    console.log('t.tx.value.fee.amount[0]:')
                    console.log(t.tx.value.fee.amount[0])
                    console.log('t.tx.value.fee.amount[0].amount:')
                    console.log(t.tx.value.fee.amount[0].amount)
                } else {
                    console.log('fee amount > 0 is false')
                }
                t.feeShr = t.tx.value.fee.amount.length > 0 ? parseInt(t.tx.value.fee.amount[0].amount) : 0;
                t.feeUsd = t.feeShr * coinStats.usd;
                console.log('t.feeShr:')
                console.log(t.feeShr)
                console.log('type of t.feeShr')
                console.log(typeof t.feeShr)
                console.log('coinStats.usd')
                console.log(coinStats.usd)
            })
            console.log('\n\n\n\n\n')
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