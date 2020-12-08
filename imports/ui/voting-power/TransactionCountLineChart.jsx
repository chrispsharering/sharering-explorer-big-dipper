import React, { Component } from 'react';
import {HorizontalBar, Line} from 'react-chartjs-2';
import { Row, Col, Card, CardImg, CardText, CardBody,
    CardTitle, CardSubtitle, Button, Progress, Spinner } from 'reactstrap';
import numbro from 'numbro';
import i18n from 'meteor/universe:i18n';
import SentryBoundary from '../components/SentryBoundary.jsx';
import { buildBlockchainDatasets, buildBlockchainOptions } from './ChartService.js';

const T = i18n.createComponent();

function yAxesTickCallback(value, index, values) {
    return numbro(value).format({
        spaceSeparated: false,
        average: true
    });
}

export default class TransactionCountBarChart extends Component{
    isLoading = true;
    transactionsColor = 'rgba(0, 158, 115, 1)';
    feeShrColor = 'rgb(71, 131, 196)';
    labelFontFamily = '"Lucida Grande", "Lucida Sans Unicode", Arial, Helvetica, sa';

    constructor(props){
        super(props);
        this.state = {
            data: {},
            options: {}
        }
    }

    componentDidMount(){
        this.getDailyTxData();
    }

    getDailyTxData = () => {
        const self = this;
        Meteor.call('Transactions.getDailyTxData', (error, result) => {
            if (error) {
                console.error("Transactions.getDailyTxData: " + error);
                self.isLoading = true;
            }
            else {
                // const resultAsArray = Object.values(result);
                const chartData = this.buildChart(result);
                self.setState(chartData); // Simply used to kick off the render lifecycle function
            }
        })
    }

    buildChartData(data) {
//         const txDataset = [];
//         const feeShrDataset = [];
//         const shrFeeBackgroundColors = [];
//         const txsBackgroundColors = [];
//         for(let i in txData) {
//             txDataset.push(txData[i].txs);
//             feeShrDataset.push(txData[i].sumFeeShr);
//             shrFeeBackgroundColors.push('rgba(71, 131, 196,1)');
//             txsBackgroundColors.push('rgba(71, 131, 196,1)');
//         }
// // make this a time chart
// // make it have two axis, one for txs and the other for shr fees 
// // dont fill
// // have seperate scales
// // use my coinstats blockchains as an exmaple but probs use a simple example from the internet
// // break it right down to the basics and build it up slowly
// // first thing to add is two datasets, with serpeate axis, google how
// // or look at how the validors chart on home page does it
//         console.log(txDataset)
//         const a =  [{
//             label: 'Transactions',
//             // yAxisID: 'transactionsId',
//             data: txDataset,
//             fill: false,
//             radius: 0,
//             lineTension: 2,
//             // pointHitRadius: this.pointHitRadiusValue,
//             // pointHitRadius: 1,
//             borderWidth: 2,//this.lineBorderWith,
//             pointRadius: 0,
//             pointHoverRadius: 5,
//             // pointHoverBackgroundColor: 'white',
//             pointHoverBorderWidth: 0,
//             backgroundColor: txsBackgroundColors,
//             borderColor: txsBackgroundColors
//           },
//           {
//             label: 'Fee SHR',
//             // yAxisID: 'transactionsId',
//             data: feeShrDataset,
//             fill: false,
//             radius: 0,
//             lineTension: 0,
//             // pointHitRadius: this.pointHitRadiusValue,
//             // pointHitRadius: 1,
//             borderWidth: 2,//this.lineBorderWith,
//             pointRadius: 0,
//             pointHoverRadius: 5,
//             // pointHoverBackgroundColor: 'white',
//             pointHoverBorderWidth: 0,
//             backgroundColor: shrFeeBackgroundColors,
//             borderColor: shrFeeBackgroundColors
//           },
//         //   {
//         //     label: 'Transfer Volume',
//         //     yAxisID: 'transferVolumeUsdsId',
//         //     data: graphData.transferVolumeUsds,
//         //     fill: false,
//         //     radius: 0,
//         //     lineTension: 0,
//         //     // pointHitRadius: this.pointHitRadiusValue,
//         //     // pointHitRadius: 1,
//         //     borderWidth: this.lineBorderWith,
//         //     pointRadius: 0,
//         //     pointHoverRadius: 5,
//         //     // pointHoverBackgroundColor: 'white',
//         //     pointHoverBorderWidth: 0
//         //   },
//         //   {
//         //     label: 'Tx Adoption Score',
//         //     yAxisID: 'txAdoptionScoresId',
//         //     data: graphData.txAdoptionScores,
//         //     fill: false,
//         //     radius: 0,
//         //     lineTension: 0,
//         //     // pointHitRadius: this.pointHitRadiusValue,
//         //     // pointHitRadius: 1,
//         //     borderWidth: this.lineBorderWith,
//         //     pointRadius: 0,
//         //     pointHoverRadius: 5,
//         //     // pointHoverBackgroundColor: 'white',
//         //     pointHoverBorderWidth: 0
//         //   }
//         //   // {
//         //   //   data: temp_min,
//         //   //   borderColor: '#ffcc00',
//         //   //   fill: false
//         //   // },
//         ];

//         const b = [   
      
//             {
//               label: "Maximo",
//               data: [165, 159, 180, 181, 156, 155, 140],
//               type: 'line',
//               borderColor:'#eddb1c',
//               backgroundColor:'#FFF3D6',
//               fill: false
//             },
//             {
//               label: "Promedio",
//               data: [115, 109, 130, 131, 106, 105, 90],
//               type: 'line',
//               borderColor:'#FF7A96',
//               backgroundColor:'#EAC3CC',
//               fill: false
//             },
//             {
//               label: "Minimo",
//               data: [65, 59, 80, 81, 56, 55, 40],
//               type: 'line',
//               borderColor:'#4BB7FF',
//               backgroundColor:'#CDEBFF',
//               fill: false
//             }
//             ,{
//               label: "Error",
//               data: [65, 59, 80, 81, 56, 55, 40],
//               borderColor:'#FF7A96',
//               borderWidth: 1,
//               backgroundColor:'#EAC3CC'
//             },
//             {
//               label: "NOK",
//               data: [5, 9, 10, 11,6, 5, 10],
//               borderColor:'#4BB7FF',
//               borderWidth: 1,
//               backgroundColor:'#CDEBFF'
//             },
//             {
//               label: "PROCESING",
//               data: [51, 19, 110, 111,16, 15, 110],
//               borderColor:'#FFD36C',
//               borderWidth: 1,
//               backgroundColor:'#FFF3D6'
//             }
//           ];

          const chartData = {
              labels: [],
              datasets: [],
          };
          const txData = [];
          const txBackgroundColorArray = [];
          const feeShrData = [];
          const chartLabels = [];
          for (let i in data){
            chartLabels.push(new Date(data[i]._id));
            txData.push(data[i].txs);
            feeShrData.push(data[i].sumFeeShr);
            // let alpha = (txData.length+1-i)/txData.length*0.8+0.2;
            // backgroundColors.push('rgba(71, 131, 196,'+alpha+')');
        }

        return {
            labels: chartLabels,
            datasets: [
                {
                    label: 'Transactions',
                    yAxisID: 'Transactions',
                    data: txData,
                    fill: false,
                    borderColor: this.transactionsColor,
                    backgroundColor: this.transactionsColor
                },
                {
                    label: 'Fee SHR',
                    yAxisID: 'Fee-SHR',
                    data: feeShrData,
                    fill: false,
                    borderColor: this.feeShrColor,
                    backgroundColor: this.feeShrColor,
                }
            ]
        }
      }

      buildChartOptions() {
          return {
            tooltips: {
                displayColors: false,
                callbacks: {
                    title: function(tooltipItem, data) {
                        const dateString = tooltipItem[0].label;
                        return dateString.substring(0, dateString.lastIndexOf(','));
                    },
                    label: function(tooltipItem, data) {
                        const dataIndex = tooltipItem.index;
                        const primaryValue = data.datasets[0].data[dataIndex];
                        const secondaryValue = data.datasets[1].data[dataIndex];
                        const primaryMantissa = primaryValue >= 1000 ? 2 : 0;
                        const secondaryMantissa = secondaryValue >= 1000 ? 2 : 0;
                        const primaryValueFormatted = numbro(primaryValue).format({
                            average: true,
                            mantissa: primaryMantissa,
                        });
                        const secondaryValueFormatted = numbro(secondaryValue).format({
                            average: true,
                            mantissa: secondaryMantissa,
                        });
                        return [`• TXs: ${primaryValueFormatted}`,
                                `• Fee: ${secondaryValueFormatted} SHR`];
                    }
                }
            },
            // this changes the height of the chart
            // maintainAspectRatio: false,
            scales: {
                xAxes: [
                    {
                        type: 'time',
                        ticks: {
                            beginAtZero: false,
                            maxTicksLimit: 10
                        }
                    }
                ],
                    yAxes: [
                            {
                            id: 'Transactions',
                            type: 'linear',
                            position: 'left',
                            scaleLabel: {
                                display: true,
                                labelString: 'Transactions',
                                fontColor: this.transactionsColor,
                                fontSize: 12,
                                fontStyle: 'bold',
                                fontFamily: this.labelFontFamily,
                            },
                            ticks: {
                                maxTicksLimit: 5,
                                fontColor: this.transactionsColor,
                                callback: function(value, index, values) {
                                    return yAxesTickCallback(value, index, values);
                                }
                            }
                        },
                        {
                            id: 'Fee-SHR',
                            type: 'linear',
                            position: 'right',
                            scaleLabel: {
                                display: true,
                                labelString: 'Fee SHR',
                                fontColor: this.feeShrColor,
                                fontSize: 12,
                                fontStyle: 'bold',
                                fontFamily: this.labelFontFamily,
                            },
                            ticks: {
                                maxTicksLimit: 5,
                                fontColor: this.feeShrColor,
                                callback: function(value, index, values) {
                                    return yAxesTickCallback(value, index, values);
                                }
                            }
                        }
                    ]
                }
            }
      }

    buildChart(txData){
        const chartData = this.buildChartData(txData);
        const chartOptions = this.buildChartOptions();


        // const datasets = buildBlockchainDatasets(txData, false);
        // const chartColors = [{ borderColor: 'rgba(86, 180, 233, 1)' },
        //                     { borderColor: 'rgba(0, 158, 115, 1)' },
        //                     { borderColor: 'rgba(255, 159, 0, 1)' },
        //                     { borderColor: 'rgba(213, 94, 0, 1)' }];
        // const options = buildBlockchainOptions(0, 1, 2, true,
        //                                        chartColors, false, true);

        // $("#transaction-count-bar-chart").height(16*data.length);
        this.isLoading = false;

        return {
            data: chartData,
            options: chartOptions,
        };

        // scales: {
        //     xAxes: [{
        //       gridLines: {
        //         display: false,
        //       },
        //       type: 'time',
        //       // ticks: {
        //       //   padding: 50,
        //       // },
        //       // ticks: {
        //       //   tickMarkLength: 10
        //       // },
        //       ticks: {
        //         fontColor: colorScheme.fontColor,
        //       },
        //       afterUpdate: (chart: Chart) => {
        //         this.afterZoomUpdate(chart);
        //       },
        //     }],
        //     yAxes: this.getYAxesScales(yAxesScales, false, mirrorTicks, colorScheme.gridLinesColor)
        //   },
    }

    render(){
        if (this.isLoading){
            return <Spinner type="grow" color="primary" />
        }
        else{
            return (                    
                <Card>
                    <div className="card-header"><T>Transaction History</T></div>
                    <CardBody id="transaction-count-bar-chart">
                        {/* <SentryBoundary><HorizontalBar data={this.state.data} options={this.state.options} /></SentryBoundary> */}
                        <SentryBoundary><Line data={this.state.data} options={this.state.options} /></SentryBoundary>
                    </CardBody>
                </Card>
            );
        }
    }
}    
