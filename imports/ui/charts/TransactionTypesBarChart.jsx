import React, { Component } from 'react';
import { Chart, Bar } from 'react-chartjs-2';
import { Row, Col, Card, CardImg, CardText, CardBody,
    CardTitle, CardSubtitle, Button, Progress, Spinner, CardFooter} from 'reactstrap';
import numbro from 'numbro';
import i18n from 'meteor/universe:i18n';
import SentryBoundary from '../components/SentryBoundary.jsx';
import { buildBlockchainDatasets, buildBlockchainOptions, yAxesTickCallback } from './ChartService.js';

const T = i18n.createComponent();

export default class TransactionTypesBarChart extends Component{
    isLoading = true;
    transactionsColor = 'rgba(255, 159, 0, 1)';
    transactionsLineColor = 'rgba(255, 159, 0, 0.7)';
    feeShrColor = 'rgba(71, 131, 196, 1)';
    feeShrLineColor = 'rgba(71, 131, 196, 0.7)';
    flowbacksUsdColor = 'rgba(0, 158, 115, 1)';
    flowbacksUsdLineColor = 'rgba(0, 158, 115, 0.7)';
    fontFamily = '"Lucida Grande", "Lucida Sans Unicode", Arial, Helvetica, sa';
    colorScheme = {
        fontColor: 'rgb(0, 0, 0)',
        tooltipBackgroundColor: 'rgba(255,255,255, 0.8)',
        tooltipBorderColor: 'rgb(0, 0, 0)',
        tooltipTitleFontColor: 'rgba(23, 24, 27, 0.85)',
        tooltipBodyFontColor: 'rgb(0, 0, 0)',
        gridLinesColor: 'rgba(0, 0, 0, 0.1)',
        backgroundColor: 'rgb(255, 255, 255)'
    }
    sumTotalTx = 0;
    dailyAverageTx = 0;
    sumTotalFeeShr = 0;
    dailyAverageFeeShr = 0;
    sumTotalFeeUsd = 0;
    dailyAverageFeeUsd = 0;

    constructor(props){
        super(props);
        this.state = {
            data: {},
            options: {}
        }
    }

    setupCustomChartSettings() {
        //register custome positioner
        Chart.Tooltip.positioners.custom = function(elements, position) {
            if (!elements.length) {
                return false;
            }
            let offset = 0;
            //adjust the offset left or right depending on the event position
            if (elements[0]._chart.width / 2 > position.x) {
                offset = 15;
            } else {
                offset = -15;
            }
            return {
                x: position.x + offset,
                y: position.y
            }
        }
    }

    getDailyTxData = () => {
        const self = this;
        Meteor.call('Transactions.getDailyTxData', (error, result) => {
            if (error) {
                console.error("Transactions.getDailyTxData: " + error);
                self.isLoading = true;
            }
            else {
                const chartData = this.buildChart(result);
                self.setState(chartData); // Simply used to kick off the render lifecycle function
            }
        })
    }

    getTxTypeGroup(txType) { // Change this to return a group for the tx, such as 'Booking', 'ID', 'Standard Tx'...
        switch(txType) {
            case 'asset/msgCreateAsset':
                return 'asset';
            case 'asset/msgDeleteAsset':
                return 'asset';
            case 'asset/msgUpdateAsset':
                return 'asset';
            case 'booking/msgBookBook':
                return 'booking';
            case 'booking/msgBookComplete':
                return 'booking';
            case 'gentlemint/msgLoadSHR':
                return 'payment';
            case 'gentlemint/msgLoadSHRP':
                return 'payment';
            case 'gentlemint/msgSendSHR':
                return 'payment';
            case 'gentlemint/msgSendSHRP':
                return 'pament';
            case 'id/msgCreateId':
                return 'id';
            case 'id/msgDeleteId':
                return 'id';
            case 'id/msgUpdateId':
                return 'id';
            default:
                // if(txType.includes('/')) {
                //     return txType.substring(txType.indexOf('/') + 1, txType.length);
                // }
                return 'standard';
        }
    }

    buildChartData(data) {
          const txData = [];
          const feeShrData = [];
          const flowbacksUsdData = [];
          const chartLabels = [];

          const txAsset = [];
          const txBooking = [];
          const txPayment = [];
          const txId = [];
          const txStandard = [];
          for (let i in data) {
              for(let j in data[i].txTypes) {
                  const txType = data[i].txTypes[j];
                  const txTypeGroup = this.getTxTypeGroup(txType.txType);
                  switch(txTypeGroup) {
                    case 'standard':
                        txStandard.push(txType.txs);
                        break;
                    case 'asset':
                        txAsset.push(txType.txs);
                        break;
                    case 'booking':
                        txBooking.push(txType.txs);
                        break;
                    case 'payment':
                        txPayment.push(txType.txs);
                        break;
                    case 'id':
                        txId.push(txType.txs);
                        break;
                    default: // Standard Tx
                        txStandard.push(txType.txs)
                  }
              }
            // if any txTypes array hasnt got the same numbe rof elements as i currently is, add 0 to each one to show
            // 0 transactions of that type for this day
            txStandard.length <= parseInt(i) ? txStandard.push(0) : null;
            txAsset.length <= parseInt(i) ? txAsset.push(0) : null;
            txBooking.length <= parseInt(i) ? txBooking.push(0) : null;
            txPayment.length <= parseInt(i) ? txPayment.push(0) : null;
            txId.length <= parseInt(i) ? txId.push(0) : null;

            chartLabels.push(new Date(data[i]._id));
            txData.push(data[i].txs);
            feeShrData.push(data[i].sumFeeShr);
            flowbacksUsdData.push(data[i].sumFeeUsd);
            this.sumTotalTx += data[i].txs;
            this.sumTotalFeeShr += data[i].sumFeeShr;
            this.sumTotalFeeUsd += data[i].sumFeeUsd;
        }
        this.dailyAverageTx = this.sumTotalTx / data.length;
        this.dailyAverageFeeShr = this.sumTotalFeeShr / data.length;
        this.dailyAverageFeeUsd = this.sumTotalFeeUsd / data.length;
        console.log(txId)

        return {
            labels: chartLabels,
            datasets:[
              {
                label: 'ID',
                data:  txId,
                borderColor: 'yellow',
                backgroundColor: 'yellow',
              },
              {
                label: 'Asset',
                data:  txAsset,
                borderColor: this.feeShrLineColor,
                backgroundColor: this.feeShrColor,
              },
              {
                label: 'Booking',
                data:  txBooking,
                borderColor: 'red',
                backgroundColor: 'red',
              },
              {
                label: 'Payment',
                data:  txPayment,
                borderColor: 'green',
                backgroundColor: 'green',
              },
              {
                label: 'Standard',
                data: txStandard,
                borderColor: this.transactionsLineColor,
                backgroundColor: this.transactionsColor,
              }]
        };

        return {
            labels: chartLabels,
            datasets: [
                {
                    label: 'Transactions',
                    yAxisID: 'Transactions',
                    data: txData,
                    fill: false,
                    borderColor: this.transactionsLineColor,
                    backgroundColor: this.transactionsColor,
                    pointRadius: 1.5,
                    pointHitRadius: 1,
                    gridLines: {
                        drawBorder: false,
                        display: true,
                        color: this.colorScheme.gridLinesColor,
                        zeroLineColor: this.colorScheme.gridLinesColor
                        // tickMarkLength: 8
                    },
                },
                {
                    label: 'Fee SHR',
                    yAxisID: 'Fee-SHR',
                    data: feeShrData,
                    fill: false,
                    borderColor: this.feeShrLineColor,
                    backgroundColor: this.feeShrColor,
                    pointRadius: 1.5,
                    pointHitRadius: 1,
                    gridLines: {
                        drawBorder: false,
                        display: true,
                        color: this.colorScheme.gridLinesColor,
                        zeroLineColor: this.colorScheme.gridLinesColor
                    },
                },
                // {
                //     label: 'Flowbacks USD',
                //     yAxisID: 'Flowbacks-USD',
                //     data: flowbacksUsdData,
                //     fill: false,
                //     borderColor: this.flowbacksUsdLineColor,
                //     backgroundColor: this.flowbacksUsdColor,
                //     pointRadius: 1.5,
                //     pointHitRadius: 1,
                //     gridLines: {
                //         drawBorder: false,
                //         display: true,
                //         color: this.colorScheme.gridLinesColor,
                //         zeroLineColor: this.colorScheme.gridLinesColor
                //     },
                // }
            ]
        }
      }

      buildChartOptions() {
          return {
            responsive: true,
            // These two together allow you to change the height of the chart
            maintainAspectRatio: false,
            aspectRatio: 0.75,
            scales: {
                 xAxes: [{
                     stacked: true,
                    //  type: 'time',
                     ticks: {
                        beginAtZero: false,
                        // maxTicksLimit: 10
                    },
                    gridLines: {
                        drawOnChartArea: false
                    }
                 }],
                 yAxes: [{
                    stacked: true,
                    id: 'Transactions',
                    type: 'linear',
                    position: 'left',
                    gridLines: {
                        drawBorder: false
                    },
                    scaleLabel: {
                        display: true,
                        labelString: 'Transactions',
                        fontSize: 12,
                        fontStyle: 'bold',
                        fontFamily: this.fontFamily,
                    },
                    ticks: {
                        maxTicksLimit: 5,
                        callback: function(value, index, values) {
                            return yAxesTickCallback(value, index, values);
                        }
                    }
                },]
            },
            tooltips: {
                mode: 'x',
                position: 'custom',
                displayColors: false,
                intersect: false,
                backgroundColor: this.colorScheme.tooltipBackgroundColor,
                borderColor: this.colorScheme.tooltipBorderColor,
                borderWidth: 0.3,
                cornerRadius: 2,
                caretSize: 0,
                titleFontSize: 10,
                titleFontColor: this.colorScheme.tooltipTitleFontColor,
                bodyFontColor: this.colorScheme.tooltipBodyFontColor,
                bodyFontSize: 13,
                titleFontFamily: this.fontFamily,
                bodyFontFamily: this.fontFamily,
                callbacks: {
                    title: function(tooltipItem, data) {
                        console.log(tooltipItem);
                        const dateString = tooltipItem[0].label;
                        return dateString.substring(0, dateString.lastIndexOf(','));
                    },
                    label: function(tooltipItem, data) {
                        // Ensures this is only called once for the first dataset (0)
                        if(tooltipItem.datasetIndex !== 0) {
                            return;
                        }
                        this.tooltipCalledAlready = true;
                        const dataIndex = tooltipItem.index;
                        const primaryValue = data.datasets[0].data[dataIndex];
                        const secondaryValue = data.datasets[1].data[dataIndex];
                        const ternaryValue = data.datasets[2].data[dataIndex];
                        const fourthValue = data.datasets[3].data[dataIndex];
                        const fifthValue = data.datasets[4].data[dataIndex];
                        const primaryMantissa = primaryValue >= 1000 ? 2 : 0;
                        const secondaryMantissa = secondaryValue >= 1000 ? 2 : 0;
                        const ternaryMantissa = ternaryValue >= 1000 ? 2 : 0;
                        const fourthMantissa = fourthValue >= 1000 ? 2 : 0;
                        const fifthMantissa = fifthValue >= 1000 ? 2 : 0;
                        const primaryValueFormatted = numbro(primaryValue).format({
                            average: true,
                            mantissa: primaryMantissa,
                        });
                        const secondaryValueFormatted = numbro(secondaryValue).format({
                            average: true,
                            mantissa: secondaryMantissa,
                        });
                        const ternaryValueFormatted = numbro(ternaryValue).format({
                            average: true,
                            mantissa: ternaryMantissa,
                        });
                        const fourthValueFormatted = numbro(fourthValue).format({
                            average: true,
                            mantissa: fourthMantissa,
                        });
                        const fifthValueFormatted = numbro(fifthValue).format({
                            average: true,
                            mantissa: fifthMantissa,
                        });
                        return [`• ID:             ${primaryValueFormatted}`,
                                `• Asset:        ${secondaryValueFormatted}`,
                                `• Booking:    ${ternaryValueFormatted}`,
                                `• Payment:   ${fourthValueFormatted}`,
                                `• Standard:  ${fifthValueFormatted}`];
                    }
                },
            }
          };
          return {
            responsive: true,
            // These two together allow you to change the height of the chart
            maintainAspectRatio: false,
            aspectRatio: 0.75,
            lineOnHover: {
                enabled: true,
                lineColor: '#bbb',
                lineWidth: 0.5
            },
            legend: {
                onClick: (e) => e.stopPropagation()
            },
            tooltips: {
                mode: 'x',
                position: 'custom',
                displayColors: false,
                intersect: false,
                backgroundColor: this.colorScheme.tooltipBackgroundColor,
                borderColor: this.colorScheme.tooltipBorderColor,
                borderWidth: 0.3,
                cornerRadius: 2,
                caretSize: 0,
                titleFontSize: 10,
                titleFontColor: this.colorScheme.tooltipTitleFontColor,
                bodyFontColor: this.colorScheme.tooltipBodyFontColor,
                bodyFontSize: 13,
                titleFontFamily: this.fontFamily,
                bodyFontFamily: this.fontFamily,
                callbacks: {
                    title: function(tooltipItem, data) {
                        const dateString = tooltipItem[0].label;
                        return dateString.substring(0, dateString.lastIndexOf(','));
                    },
                    label: function(tooltipItem, data) {
                        // Ensures this is only called once for the first dataset (0)
                        if(tooltipItem.datasetIndex !== 0) {
                            return;
                        }
                        this.tooltipCalledAlready = true;
                        const dataIndex = tooltipItem.index;
                        const primaryValue = data.datasets[0].data[dataIndex];
                        const secondaryValue = data.datasets[1].data[dataIndex];
                        // const ternaryValue = data.datasets[2].data[dataIndex];
                        const primaryMantissa = primaryValue >= 1000 ? 2 : 0;
                        const secondaryMantissa = secondaryValue >= 1000 ? 2 : 0;
                        // const ternaryMantissa = ternaryValue >= 1000 ? 2 : 0;
                        const primaryValueFormatted = numbro(primaryValue).format({
                            average: true,
                            mantissa: primaryMantissa,
                        });
                        const secondaryValueFormatted = numbro(secondaryValue).format({
                            average: true,
                            mantissa: secondaryMantissa,
                        });
                        // const ternaryValueFormatted = numbro(ternaryValue).format({
                        //     average: true,
                        //     mantissa: ternaryMantissa,
                        // });
                        return [`• TXs:             ${primaryValueFormatted}`,
                                `• Fee:             ${secondaryValueFormatted} SHR`,];
                                //`• Flowbacks:  $${ternaryValueFormatted}`];
                    }
                },
            },
            scales: {
                xAxes: [
                    {
                        type: 'time',
                        ticks: {
                            beginAtZero: false,
                            maxTicksLimit: 10
                        },
                        gridLines: {
                            drawOnChartArea: false
                        }
                    }
                ],
                    yAxes: [
                            {
                            id: 'Transactions',
                            type: 'linear',
                            position: 'left',
                            gridLines: {
                                drawBorder: false
                            },
                            scaleLabel: {
                                display: true,
                                labelString: 'Transactions',
                                fontColor: this.transactionsColor,
                                fontSize: 12,
                                fontStyle: 'bold',
                                fontFamily: this.fontFamily,
                            },
                            ticks: {
                                maxTicksLimit: 5,
                                fontColor: this.transactionsColor,
                                callback: function(value, index, values) {
                                    return yAxesTickCallback(value, index, values);
                                }
                            }
                        },
                        // {
                        //     id: 'Fee-SHR',
                        //     type: 'linear',
                        //     position: 'right',
                        //     gridLines: {
                        //         drawBorder: false
                        //     },
                        //     scaleLabel: {
                        //         display: true,
                        //         labelString: 'Fee SHR',
                        //         fontColor: this.feeShrColor,
                        //         fontSize: 12,
                        //         fontStyle: 'bold',
                        //         fontFamily: this.fontFamily,
                        //     },
                        //     ticks: {
                        //         maxTicksLimit: 5,
                        //         fontColor: this.feeShrColor,
                        //         callback: function(value, index, values) {
                        //             return yAxesTickCallback(value, index, values);
                        //         }
                        //     }
                        // },
                        // {
                        //     id: 'Flowbacks-USD',
                        //     type: 'linear',
                        //     position: 'right',
                        //     gridLines: {
                        //         drawBorder: false
                        //     },
                        //     scaleLabel: {
                        //         display: true,
                        //         labelString: 'Flowbacks USD',
                        //         fontColor: this.flowbacksUsdColor,
                        //         fontSize: 12,
                        //         fontStyle: 'bold',
                        //         fontFamily: this.fontFamily,
                        //     },
                        //     ticks: {
                        //         maxTicksLimit: 5,
                        //         fontColor: this.flowbacksUsdColor,
                        //         callback: function(value, index, values) {
                        //             return yAxesTickCallback(value, index, values, true);
                        //         }
                        //     }
                        // }
                    ]
                }
            }
      }

    buildChart(txData){
        const chartData = this.buildChartData(txData);
        const chartOptions = this.buildChartOptions();
        this.isLoading = false;

        return {
            data: chartData,
            options: chartOptions,
        };
    }

    componentDidMount() {
        this.setupCustomChartSettings();
        this.getDailyTxData();
    }

    render() {
        if (this.isLoading) {
            return <Spinner type="grow" color="primary" />
        }
        else {
            return (                    
                <Card>
                    <div className="card-header"><T>analytics.transactionHistory</T></div>
                    <CardBody id="transaction-count-bar-chart">
                        <SentryBoundary><Bar data={this.state.data} options={this.state.options} height={null} width={null} /></SentryBoundary>
                        {/* <SentryBoundary><Line data={this.state.data} options={this.state.options} height={null} width={null} /></SentryBoundary> */}
                    </CardBody>
                    <CardFooter>
                        <Row>
                            <Col xs={5} md={{size: 2, offset: 4}}><small><span><T>Tx</T>:</span> <strong>{numbro(this.sumTotalTx).format({average: true, mantissa: 2})}</strong></small></Col>
                            <Col xs={7} md={6}><small><span><T>transactions.dailyTx</T>:</span> <strong>{numbro(this.dailyAverageTx).format({average: true, mantissa: 2})}</strong></small></Col>
                        </Row>
                        <Row>
                            <Col xs={5} md={{size: 2, offset: 4}}><small><span><T>transactions.fee</T>:</span> <strong>{numbro(this.sumTotalFeeShr).format({average: true, mantissa: 2})}</strong> SHR</small></Col>
                            <Col xs={7} md={6}><small><span><T>transactions.dailyFee</T>:</span> <strong>{numbro(this.dailyAverageFeeShr).format({average: true, mantissa: 2})}</strong> SHR</small></Col>
                        </Row>
                        {/* <Row>
                            <Col xs={5} md={{size: 2, offset: 4}}><small><span><T>flowbacks.flowbacks</T>:</span> <strong>${numbro(this.sumTotalFeeUsd).format({average: true, mantissa: 2})}</strong></small></Col>
                            <Col xs={7} md={6}><small><span><T>flowbacks.dailyFlowbacks</T>:</span> <strong>${numbro(this.dailyAverageFeeUsd).format({average: true, mantissa: 2})}</strong></small></Col>
                        </Row> */}
                    </CardFooter>
                </Card>
            );
        }
    }
}    
