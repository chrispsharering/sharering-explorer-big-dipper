import React, { Component } from 'react';
import {HorizontalBar, Line, Chart } from 'react-chartjs-2';
import { Row, Col, Card, CardImg, CardText, CardBody,
    CardTitle, CardSubtitle, Button, Progress, Spinner, CardFooter} from 'reactstrap';
import numbro from 'numbro';
import i18n from 'meteor/universe:i18n';
import SentryBoundary from '../components/SentryBoundary.jsx';
import { buildBlockchainDatasets, buildBlockchainOptions, yAxesTickCallback } from './ChartService.js';
import cloneDeep from 'lodash/cloneDeep';

const T = i18n.createComponent();

export default class TransactionCountBarChart extends Component {
    isLoading = true;
    originalState;
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

    buildChartData(data) {
          const txData = [];
          const feeShrData = [];
          const flowbacksUsdData = [];
          const chartLabels = [];
          for (let i in data) {
            chartLabels.push(new Date(data[i]._id));
            txData.push(data[i].txs);
            feeShrData.push(data[i].sumFeeShr);
            flowbacksUsdData.push(data[i].sumFeeUsd);
            this.sumTotalTx += data[i].txs;
            this.sumTotalFeeShr += data[i].sumFeeShr;
            this.sumTotalFeeUsd += data[i].sumFeeUsd;
        }
        this.dailyAverageTx = this.sumTotalTx / chartLabels.length;
        this.dailyAverageFeeShr = this.sumTotalFeeShr / chartLabels.length;
        this.dailyAverageFeeUsd = this.sumTotalFeeUsd / chartLabels.length;

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
                        {
                            id: 'Fee-SHR',
                            type: 'linear',
                            position: 'right',
                            gridLines: {
                                drawBorder: false
                            },
                            scaleLabel: {
                                display: true,
                                labelString: 'Fee SHR',
                                fontColor: this.feeShrColor,
                                fontSize: 12,
                                fontStyle: 'bold',
                                fontFamily: this.fontFamily,
                            },
                            ticks: {
                                maxTicksLimit: 5,
                                fontColor: this.feeShrColor,
                                callback: function(value, index, values) {
                                    return yAxesTickCallback(value, index, values);
                                }
                            }
                        },
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
        this.originalState = {
            data: chartData,
            options: chartOptions,
        };
        return cloneDeep(this.originalState);
    }

    changeTimeRange(days) {
        if(days < 0 || this.originalState.data.labels.length <= days) {
            this.setState(cloneDeep(this.originalState));
            return;
        }
        this.state.data.datasets[0].data = this.originalState.data.datasets[0].data.slice(this.originalState.data.datasets[0].data.length - days);
        this.state.data.datasets[1].data = this.originalState.data.datasets[1].data.slice(this.originalState.data.datasets[1].data.length - days);
        this.state.data.labels = this.originalState.data.labels.slice(this.originalState.data.labels.length - days);
        this.setState(this.state);
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
            const timeButtonStyling = {padding: "5px", color: "rgba(1, 1, 1, 0.55)", textTransform: "none", boxShadow: "0 1px 1px rgba(0, 0, 0, 0.4)"};
            return (
                <Card>
                    <div className="card-header">
                        <T>analytics.transactionHistory</T>
                    </div>
                    <Row style={{paddingTop: "0.5em"}}>
                        <Col xs={3} sm={{size: 3, offset: 1}} md={{size: 1, offset: 4}}>
                            <Button style={timeButtonStyling} onClick={() => this.changeTimeRange(-1)}>All Time</Button>
                        </Col>
                        <Col xs={3} sm={2} md={1}>
                            <Button style={timeButtonStyling} onClick={() => this.changeTimeRange(365)}>1 Year</Button>
                        </Col>
                        <Col xs={3} md={1}>
                            <Button style={timeButtonStyling} onClick={() => this.changeTimeRange(90)}>90 Days</Button>
                        </Col>
                        <Col xs={3} md={1}>
                            <Button style={timeButtonStyling} onClick={() => this.changeTimeRange(30)}>30 Days</Button>
                        </Col>
                    </Row>
                    {/* <div>
                            <Button secondary style={{padding: "5px"}} onClick={() => this.changeTimeRange(-1)}>All Time</Button>{' '}
                        
                            <Button style={{padding: "5px"}} onClick={() => this.changeTimeRange(365)}>1 Year</Button>{' '}
                        
                            <Button style={{padding: "5px"}} onClick={() => this.changeTimeRange(90)}>90 Days</Button>{' '}
                        
                            <Button style={{padding: "5px"}} onClick={() => this.changeTimeRange(2)}>30 Days</Button>
                    </div> */}
                    <CardBody id="transaction-count-line-chart">
                        {/* <SentryBoundary><HorizontalBar data={this.state.data} options={this.state.options} /></SentryBoundary> */}
                        <SentryBoundary><Line data={this.state.data} options={this.state.options} height={null} width={null} /></SentryBoundary>
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
