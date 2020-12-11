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
    idTxColor = 'rgba(71, 131, 196, 1)';
    idTxLineColor = 'rgba(71, 131, 196, 0.7)';
    paymentTxColor = 'rgba(0, 158, 115, 1)';
    paymentTxLineColor = 'rgba(0, 158, 115, 0.7)';
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
    sumTotalIdTx = 0;
    sumTotalAssetTx = 0;
    sumTotalBookingTx = 0;
    sumTotalPaymentTx = 0;
    sumTotalStandardTx = 0;

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
            case 'asset/Create':
                return 'asset';
            case 'asset/Delete':
                return 'asset';
            case 'asset/Update':
                return 'asset';
            case 'book/Book':
                return 'booking';
            case 'book/Complete':
                return 'booking';
            case 'gentlemint/LoadSHR':
                return 'payment';
            case 'gentlemint/LoadSHRP':
                return 'payment';
            case 'gentlemint/SendSHR':
                return 'payment';
            case 'gentlemint/SendSHRP':
                return 'pament';
            case 'identity/CreateId':
                return 'id';
            case 'identity/DeleteId':
                return 'id';
            case 'identity/UpdateId':
                return 'id';
            default:
                // if(txType.includes('/')) {
                //     return txType.substring(txType.indexOf('/') + 1, txType.length);
                // }
                return 'standard';
        }
    }

    buildChartData(data) {
          const chartLabels = [];
          const txAssetData = [];
          const txBookingData = [];
          const txPaymentData = [];
          const txIdData = [];
          const txStandardData = [];
          const txTypes = [];
          for (let i in data) {
              const date = new Date(data[i]._id);
              txStandardData.push({x: date, y: 0});
              txAssetData.push({x: date, y: 0});
              txBookingData.push({x: date, y: 0});
              txPaymentData.push({x: date, y: 0});
              txIdData.push({x: date, y: 0});
              for(let j in data[i].txTypes) {
                  const txType = data[i].txTypes[j];
                  txTypes.push(txType.txType) //used for testing to log out later
                  const txTypeGroup = this.getTxTypeGroup(txType.txType);
                  console.log('tx types')
                  console.log(txType)
                  console.log(txTypeGroup)
                  switch(txTypeGroup) {
                    case 'standard':
                        txStandardData[i].y += txType.txs;
                        this.sumTotalStandardTx += txType.txs;
                        break;
                    case 'asset':
                        txAssetData[i].y += txType.txs;
                        this.sumTotalAssetTx += txType.txs;
                        break;
                    case 'booking':
                        txBookingData[i].y += txType.txs;
                        this.sumTotalBookingTx += txType.txs;
                        break;
                    case 'payment':
                        txPaymentData[i].y += txType.txs;
                        this.sumTotalPaymentTx += txType.txs;
                        break;
                    case 'id':
                        txIdData[i].y += txType.txs;
                        this.sumTotalIdTx += txType.txs;
                        break;
                    default: // Standard Tx
                        txStandardData[i].y += txType.txs;
                        this.sumTotalStandardTx += txType.txs;
                }
              }

            chartLabels.push(new Date(data[i]._id));
        }
        const distinctTxTypes = [...new Set(txTypes)];
        console.log('distincttxtypes: ')
        console.log(distinctTxTypes)
        console.log(txTypes.filter.distinct)

        return {
            labels: chartLabels,
            datasets:[
              {
                label: 'ID',
                data:  txIdData,
                borderColor: this.idTxLineColor,
                backgroundColor: this.idTxColor,
              },
              {
                label: 'Asset',
                data:  txAssetData,
                borderColor: 'yellow',
                backgroundColor: 'yellow',
              },
              {
                label: 'Booking',
                data:  txBookingData,
                borderColor: 'red',
                backgroundColor: 'red',
              },
              {
                label: 'Payment',
                data:  txPaymentData,
                borderColor: this.paymentTxLineColor,
                backgroundColor: this.paymentTxColor,
              },
              {
                label: 'Standard',
                data: txStandardData,
                borderColor: 'purple',
                backgroundColor: 'purple',
              }
            ]
        };
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
                    title: 'time',
                    type: 'time',
                    gridLines: {
                        drawOnChartArea: false
                    },
                    time: {
                        unit: 'day',
                        unitStepSize: 1
                    },
                    ticks: {
                        maxRotation: 0,
                        beginAtZero: false,
                        maxTicksLimit: 10
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
                        beginAtZero: true,
                        callback: function(value, index, values) {
                            return yAxesTickCallback(value, index, values);
                        }
                    }
                }]
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
                        const primaryValue = data.datasets[0].data[dataIndex].y;
                        const secondaryValue = data.datasets[1].data[dataIndex].y;
                        const ternaryValue = data.datasets[2].data[dataIndex].y;
                        const fourthValue = data.datasets[3].data[dataIndex].y;
                        const fifthValue = data.datasets[4].data[dataIndex].y;
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
                    <div className="card-header"><T>analytics.transactionTypeHistory</T></div>
                    <CardBody id="transaction-count-bar-chart">
                        <SentryBoundary><Bar data={this.state.data} options={this.state.options} height={null} width={null} /></SentryBoundary>
                    </CardBody>
                    <CardFooter>
                        <Row>
                            <Col xs={5} md={{size: 2, offset: 4}}><small><span><T>transactions.idTx</T>:</span> <strong>{numbro(this.sumTotalIdTx).format({average: true, mantissa: 2})}</strong></small></Col>
                            <Col xs={7} md={6}><small><span><T>transactions.assetTx</T>:</span> <strong>{numbro(this.sumTotalAssetTx).format({average: true, mantissa: 2})}</strong></small></Col>
                        </Row>
                        <Row>
                            <Col xs={5} md={{size: 2, offset: 4}}><small><span><T>transactions.bookingTx</T>:</span> <strong>{numbro(this.sumTotalBookingTx).format({average: true, mantissa: 2})}</strong></small></Col>
                            <Col xs={7} md={6}><small><span><T>transactions.paymentTx</T>:</span> <strong>{numbro(this.sumTotalPaymentTx).format({average: true, mantissa: 2})}</strong></small></Col>
                        </Row>
                        <Row>
                            <Col xs={5} md={{size: 2, offset: 4}}><small><span><T>transactions.standardTx</T>:</span> <strong>{numbro(this.sumTotalStandardTx).format({average: true, mantissa: 2})}</strong></small></Col>
                        </Row>
                    </CardFooter>
                </Card>
            );
        }
    }
}    
