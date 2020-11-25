import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';
import { Blockscon } from '/imports/api/blocks/blocks.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import Block from './Block.jsx';
import { CoinStats } from '../../api/coin-stats/coin-stats.js';

export default BlockContainer = withTracker((props) => {
    let blockHandle, transactionHandle;
    let loading = true;

    if (Meteor.isClient) {
        blockHandle = Meteor.subscribe('blocks.findOne', parseInt(props.match.params.blockId));
        transactionHandle = Meteor.subscribe('transactions.height', parseInt(props.match.params.blockId));
        chainStatesHandle = Meteor.subscribe('chainStates.latest');
        loading = !blockHandle.ready() && !transactionHandle.ready() && !chainStatesHandle.ready();
    }

    let block, txs, transactionsExist, blockExist, coinStats;

    if (Meteor.isServer || !loading) {
        coinStats = CoinStats.findOne({}, {sort:{last_updated_at:-1}, limit:1});
        block = Blockscon.findOne({ height: parseInt(props.match.params.blockId) });
        txs = Transactions.find({ height: parseInt(props.match.params.blockId) }).fetch();
        if(txs && txs.length > 0) {
            txs.forEach(t => {
                t.feeShr = t.tx.value.fee.amount.length > 0 ? parseInt(t.tx.value.fee.amount[0].amount) : 0;
                t.feeUsd = t.feeShr * coinStats.usd;
            })
        }

        if (Meteor.isServer) {
            loading = false;
            transactionsExist = !!txs;
            blockExist = !!block;
        }
        else {
            transactionsExist = !loading && !!txs;
            blockExist = !loading && !!block;
        }

    }

    const queryOptions = { sort: { 'height': -1 } };

    return {
        loading,
        blockExist,
        transactionsExist,
        block: blockExist ? block : {},
        txs,
        transferTxs: transactionsExist ? Transactions.find({
            $or: [
                { "tx.value.msg.type": "gentlemint/SendSHR" },
                { "tx.value.msg.type": "cosmos-sdk/MsgMultiSend" }
            ]
        }, queryOptions).fetch() : {},
        cdpTxs: transactionsExist ? Transactions.find({
            $or: [
                { "tx.value.msg.type": "cdp/MsgCreateCDP" },
                { "tx.value.msg.type": "cdp/MsgDeposit" },
                { "tx.value.msg.type": "cdp/MsgWithdraw" },
                { "tx.value.msg.type": "cdp/MsgDrawDebt" },
                { "tx.value.msg.type": "cdp/MsgRepayDebt" }
            ]
        }, queryOptions).fetch() : {},
        swapTxs: transactionsExist ? Transactions.find({
            $or: [
                { "tx.value.msg.type": "bep3/MsgClaimAtomicSwap" },
                { "tx.value.msg.type": "bep3/MsgCreateAtomicSwap" }
            ]
        }, queryOptions).fetch() : {},
        incentiveTxs: transactionsExist ? Transactions.find({
            $or: [
                { "tx.value.msg.type": "incentive/MsgClaimReward" },
            ]
        }, queryOptions).fetch() : {},
        auctionTxs: transactionsExist ? Transactions.find({
            $or: [
                { "tx.value.msg.type": "auction/MsgPlaceBid" },
            ]
        }, queryOptions).fetch() : {},
        priceTxs: transactionsExist ? Transactions.find({
            $or: [
                { "tx.value.msg.type": "pricefeed/MsgPostPrice" }
            ]
        }, queryOptions).fetch() : {},
        stakingTxs: transactionsExist ? Transactions.find({
            $or: [
                { "tx.value.msg.type": "cosmos-sdk/MsgCreateValidator" },
                { "tx.value.msg.type": "cosmos-sdk/MsgEditValidator" },
                { "tx.value.msg.type": "cosmos-sdk/MsgDelegate" }, //is this working?
                { "tx.value.msg.type": "cosmos-sdk/MsgUndelegate" },
                { "tx.value.msg.type": "cosmos-sdk/MsgBeginRedelegate" }
            ]
        }, queryOptions).fetch() : {},
        distributionTxs: transactionsExist ? Transactions.find({
            $or: [
                { "tx.value.msg.type": "cosmos-sdk/MsgWithdrawValidatorCommission" },
                { "tx.value.msg.type": "cosmos-sdk/MsgWithdrawDelegationReward" },
                { "tx.value.msg.type": "cosmos-sdk/MsgModifyWithdrawAddress" }
            ]
        }, queryOptions).fetch() : {},
        governanceTxs: transactionsExist ? Transactions.find({
            $or: [
                { "tx.value.msg.type": "cosmos-sdk/MsgSubmitProposal" },
                { "tx.value.msg.type": "cosmos-sdk/MsgDeposit" },
                { "tx.value.msg.type": "cosmos-sdk/MsgVote" }
            ]
        }, queryOptions).fetch() : {},
        slashingTxs: transactionsExist ? Transactions.find({
            $or: [
                { "tx.value.msg.type": "cosmos-sdk/MsgUnjail" }
            ]
        }, queryOptions).fetch() : {},
        IBCTxs: transactionsExist ? Transactions.find({
            $or: [
                { "tx.value.msg.type": "cosmos-sdk/IBCTransferMsg" },
                { "tx.value.msg.type": "cosmos-sdk/IBCReceiveMsg" }
            ]
        }, queryOptions).fetch() : {},
        loadShrTxs: transactionsExist ? Transactions.find({
            $or: [
                { "tx.value.msg.type": "gentlemint/LoadSHR" },
            ]
        }, queryOptions).fetch() : {},
    };
})(Block);

// i need to find out every single type of transaction possible
// group them into groups (tab per group)
// then within each tab/group, i need to show info for each different type of tx type within that group

// why at https://explorer.shareri.ng/blocks/952011 
// does it not show all the most recent staking transactions, only the one 20 days ago