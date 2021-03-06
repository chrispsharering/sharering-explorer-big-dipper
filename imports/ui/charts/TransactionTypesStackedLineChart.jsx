import React, { Component } from 'react';
import { Chart, Bar, Line } from 'react-chartjs-2';
import { Row, Col, Card, CardImg, CardText, CardBody,
    CardTitle, CardSubtitle, Button, Progress, Spinner, CardFooter} from 'reactstrap';
import numbro from 'numbro';
import i18n from 'meteor/universe:i18n';
import SentryBoundary from '../components/SentryBoundary.jsx';
import { buildBlockchainDatasets, buildBlockchainOptions, yAxesTickCallback, changeDataForNewTimeRange } from './ChartService.js';
import cloneDeep from 'lodash/cloneDeep';

const T = i18n.createComponent();

customLegendClickHandler = function (e, legendItem) {
    const index = legendItem.datasetIndex;
    const datasetsAvailable = this.chart.data.datasetsAvailable;
    const indexOfLegendItem = datasetsAvailable.indexOf(index);
    if(indexOfLegendItem >= 0) {
        datasetsAvailable.splice(indexOfLegendItem, 1);
    } else {
        datasetsAvailable.push(index);
    }
    const meta = this.chart.getDatasetMeta(index);
    meta.hidden = meta.hidden === null ? !this.chart.data.datasets[index].hidden : null;
    this.chart.update();
};

export default class TransactionTypesStackedLineChart extends Component {
    timeButtonStyling = {padding: "5px", color: "rgba(1, 1, 1, 0.55)", textTransform: "none", boxShadow: "0 1px 1px rgba(0, 0, 0, 0.4)"};
    isLoading = true;
    originalState;
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

    constructor(props) {
        super(props);
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

        Chart.pluginService.register({
            posX: null,
            isMouseOut: false,
            drawLine(chart, posX) {
              const ctx = chart.ctx,
                  x_axis = chart.scales['x-axis-0'],
                  y_axis = chart.scales['Transactions'];
              let x = posX, topY, bottomY;
              if (!y_axis || !x_axis || posX < x_axis.left || posX > x_axis.right
                  || !chart.options.lineOnHover) {
                return;
              }
              topY = y_axis.top, bottomY = y_axis.bottom;
              // draw line
              ctx.save();
              ctx.beginPath();
              ctx.moveTo(x, topY);
              ctx.lineTo(x, bottomY);
              ctx.lineWidth = chart.options.lineOnHover.lineWidth;
              ctx.strokeStyle = chart.options.lineOnHover.lineColor;
              ctx.stroke();
              ctx.restore();
             },
             beforeInit(chart) {
                chart.options.events.push('mouseover');
             },
             afterEvent(chart, event) {
                if (!chart.options.lineOnHover || !chart.options.lineOnHover.enabled) {
                  return;
                }
                if (event.type !== 'mousemove' && event.type !== 'mouseover') {
                   if (event.type === 'mouseout') {
                     this.isMouseOut = true;
                   }
                   chart.clear();
                   chart.draw();
                   return;
                }
                this.posX = event.x;
                this.isMouseOut = false;
                chart.clear();
                chart.draw();
                this.drawLine(chart, this.posX);
                // This drags the tooltip for the first dataset which is displayed
                let dataSetIndex = -1;
                if (!chart.getDatasetMeta(0).hidden) {
                  dataSetIndex = 0;
                } else if (!chart.getDatasetMeta(1).hidden) {
                  dataSetIndex = 1;
                } else if (!chart.getDatasetMeta(2).hidden) {
                  dataSetIndex = 2;
                }
                if (dataSetIndex > -1) {
                  const metaData = chart.getDatasetMeta(dataSetIndex).data,
                    radius = chart.data.datasets[dataSetIndex].pointHoverRadius,
                    posX = metaData.map(e => e._model.x);
                  posX.forEach(function(pos, posIndex) {
                    if (this.posX < pos + radius && this.posX > pos - radius) {
                        // chart.updateHoverStyle([metaData[posIndex]], null, true);
                        chart.tooltip._active = [metaData[posIndex]];
                    } else {
                      //  chart.updateHoverStyle([metaData[posIndex]], null, false);
                    }
                  }.bind(this));
                  chart.tooltip.update();
                }
             },
             afterDatasetsDraw(chart, ease) {
                 if (this.posX && !this.isMouseOut) {
                  this.drawLine(chart, this.posX);
                }
             }
          });
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
            // txStandardData[i].y += Math.random() * (20 - 1) + 1;
            // txAssetData[i].y += Math.random() * (20 - 1) + 1;
            // txBookingData[i].y += Math.random() * (20 - 1) + 1;
            // txPaymentData[i].y += Math.random() * (20 - 1) + 1;
            // txIdData[i].y += Math.random() * (20 - 1) + 1;
              for(let j in data[i].txTypes) {
                  const txType = data[i].txTypes[j];
                  txTypes.push(txType.txType) //used for testing to log out later
                  const txTypeGroup = this.getTxTypeGroup(txType.txType);
                //   console.log('tx types')
                //   console.log(txType)
                //   console.log(txTypeGroup)
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
        // console.log('distincttxtypes: ')
        // console.log(distinctTxTypes)
        // console.log(txTypes.filter.distinct)

        return {
            datasetsAvailable: [0, 1, 2, 3, 4],
            labels: chartLabels,
            datasets:[
              {
                label: 'ID',
                data:  txIdData,
                borderWidth: 0,
                backgroundColor: this.idTxColor,
                fill: true,
                pointRadius: 1,
                pointHitRadius: 1,
                gridLines: {
                    drawBorder: false,
                    display: false
                },
              },
              {
                label: 'Asset',
                data:  txAssetData,
                borderWidth: 0,
                backgroundColor: 'yellow',
                fill: true,
                pointRadius: 1,
                pointHitRadius: 1,
                gridLines: {
                    drawBorder: false,
                    display: false
                },
              },
              {
                label: 'Booking',
                data:  txBookingData,
                borderWidth: 0,
                backgroundColor: 'red',
                fill: true,
                pointRadius: 1,
                pointHitRadius: 1,
                gridLines: {
                    drawBorder: false,
                    display: false
                },
              },
              {
                label: 'Payment',
                data:  txPaymentData,
                borderWidth: 0,
                backgroundColor: this.paymentTxColor,
                fill: true,
                pointRadius: 1,
                pointHitRadius: 1,
                gridLines: {
                    drawBorder: false,
                    display: false
                },
              },
              {
                label: 'Standard',
                data: txStandardData,
                borderWidth: 0,
                backgroundColor: 'purple',
                fill: true,
                pointRadius: 1,
                pointHitRadius: 1,
                gridLines: {
                    drawBorder: false,
                    display: false
                },
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
            lineOnHover: {
                enabled: true,
                lineColor: '#bbb',
                lineWidth: 0.5
            },
            legend: {
                onClick: customLegendClickHandler
            },
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
                        // Ensures this is only called once for one dataset (the first in the datasetsAvailable array)
                        if(tooltipItem.datasetIndex !== data.datasetsAvailable[0]) {
                            return;
                        }
                        this.tooltipCalledAlready = true;
                        const dataIndex = tooltipItem.index;
                        const primaryValue = data.datasets[0].data[dataIndex].y;
                        const secondaryValue = data.datasets[1].data[dataIndex].y;
                        const ternaryValue = data.datasets[2].data[dataIndex].y;
                        const fourthValue = data.datasets[3].data[dataIndex].y;
                        const fifthValue = data.datasets[4].data[dataIndex].y;
                        const totalValue = primaryValue + secondaryValue + ternaryValue + fourthValue + fifthValue;
                        const primaryMantissa = primaryValue >= 1000 ? 2 : 0;
                        const secondaryMantissa = secondaryValue >= 1000 ? 2 : 0;
                        const ternaryMantissa = ternaryValue >= 1000 ? 2 : 0;
                        const fourthMantissa = fourthValue >= 1000 ? 2 : 0;
                        const fifthMantissa = fifthValue >= 1000 ? 2 : 0;
                        const totalMantissa = totalValue >= 1000 ? 2 : 0;
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
                        const totalValueFormatted = numbro(totalValue).format({
                            average: true,
                            mantissa: totalMantissa,
                        });
                        return [
                                `• ID:             ${primaryValueFormatted}`,
                                `• Asset:        ${secondaryValueFormatted}`,
                                `• Booking:    ${ternaryValueFormatted}`,
                                `• Payment:   ${fourthValueFormatted}`,
                                `• Standard:   ${fifthValueFormatted}`,
                                `-----------------`,
                                `• Total:         ${totalValueFormatted}`,];
                    }
                },
            }
        };
    }

    buildChart(txData){
        const chartData = this.buildChartData(txData);
        const chartOptions = this.buildChartOptions();
        this.isLoading = false;
        this.originalState = {
            data: chartData,
            options: chartOptions,
        };

        return cloneDeep(this.originalState);
    }

    changeTimeRange(days) {
        this.setState(changeDataForNewTimeRange(days, this.originalState, this.state));
    }

    componentDidMount() {
        this.setupCustomChartSettings();
        const chartData = this.buildChart(this.props.dailyTxData);
        this.setState(chartData); // Simply used to kick off the render lifecycle function
    }

    render() {
        if (this.isLoading) {
            return <Spinner type="grow" color="primary" />
        }
        else {
            return (                    
                <Card>
                    <div className="card-header"><T>analytics.transactionTypeHistory</T></div>
                    <Row style={{paddingTop: "0.5em"}}>
                        <Col xs={3} sm={{size: 3, offset: 1}} md={{size: 1, offset: 4}}>
                            <Button style={this.timeButtonStyling} onClick={() => this.changeTimeRange(-1)}>All Time</Button>
                        </Col>
                        <Col xs={3} sm={2} md={1}>
                            <Button style={this.timeButtonStyling} onClick={() => this.changeTimeRange(365)}>1 Year</Button>
                        </Col>
                        <Col xs={3} md={1}>
                            <Button style={this.timeButtonStyling} onClick={() => this.changeTimeRange(90)}>90 Days</Button>
                        </Col>
                        <Col xs={3} md={1}>
                            <Button style={this.timeButtonStyling} onClick={() => this.changeTimeRange(30)}>30 Days</Button>
                        </Col>
                    </Row>
                    <CardBody id="transaction-types-stacked-line-chart">
                        <SentryBoundary><Line data={this.state.data} options={this.state.options} height={null} width={null} /></SentryBoundary>
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
