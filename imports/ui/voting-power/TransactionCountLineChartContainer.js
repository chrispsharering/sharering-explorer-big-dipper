// import { Meteor } from 'meteor/meteor';
// import { withTracker } from 'meteor/react-meteor-data';
// import { Validators } from '/imports/api/validators/validators.js';
// import TransactionCountBarChart from './TransactionCountBarChart.jsx';
// let txHistoryGlobal;

// getTxHistory = async () => {
//     return Meteor.call('Transactions.txHistory', (error, result) => {
//         console.log('\n\n\n\n\ngetting tx history\n\n\n\n\n')
//         if (error) {
//             console.log("txHistory: " + error);
//             txHistoryGlobal = false;
//         }
//         else {
//             console.log("txHistory: " + result);
//             console.log(result)
//             console.log('result.logs:')
//             console.log(result[0].txTypes[0])
//             console.log(result[0].txTypes[1])
//             console.log(result[1].txTypes[0])
//             console.log(result[1].txTypes[1])
//             console.log(result[1].txTypes[2])
//             txHistoryGlobal = result;
//         }
//     })
// }

// export default TransactionCountBarChartContainer = withTracker((props) => {
//     let chartHandle, stats, statsExist
//     let loading = true;

//     if (Meteor.isClient){
//         const a = await getTxHistory();
//         // chartHandle = Meteor.subscribe('validators.voting_power');
//         // loading = !chartHandle.ready();
//         let i = 0; 
//         while(txHistoryGlobal !== false && i < 2000) {
//             i++;
//             console.log(i)
//             if(txHistoryGlobal) {
//                 console.log('txHistoryGlobal is:')
//                 console.log(txHistoryGlobal)
//                 loading = false;
//                 statsExist = true;
//                 break;
//             }
//         }
//     }

//     // if (Meteor.isServer || !loading){
//     //     stats = Validators.find({},{sort:{voting_power:-1}}).fetch();

//     //     if (Meteor.isServer){
//     //         // loading = false;
//     //         statsExist = !!stats;
//     //     }
//     //     else{
//     //         statsExist = !loading && !!stats;
//     //     }
//     // }

//     return {
//         loading,
//         statsExist,
//         stats: statsExist ? txHistoryGlobal : {}
//     };
// })(TransactionCountBarChart);

