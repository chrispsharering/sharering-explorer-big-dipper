import React, { Component } from 'react';
import { Chart, Bar } from 'react-chartjs-2';
import { Row, Col, Card, CardImg, CardText, CardBody,
    CardTitle, CardSubtitle, Button, Progress, Spinner, CardFooter} from 'reactstrap';
import numbro from 'numbro';
import i18n from 'meteor/universe:i18n';
import SentryBoundary from '../components/SentryBoundary.jsx';
import { buildBlockchainDatasets, buildBlockchainOptions, yAxesTickCallback, changeDataForNewTimeRange } from './ChartService.js';
import cloneDeep from 'lodash/cloneDeep';

const T = i18n.createComponent();

export default class FlowbacksBarChart extends Component {
    timeButtonStyling = {padding: "5px", color: "rgba(1, 1, 1, 0.55)", textTransform: "none", boxShadow: "0 1px 1px rgba(0, 0, 0, 0.4)"};
    isLoading = true;
    originalState;
    flowbacksColor = 'rgba(0, 158, 115, 1)';
    flowbacksLineColor = 'rgba(0, 158, 115, 0.7)';
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
    sumTotalFlowbacks = 0;
    sumTotalFeeShr = 0;
    dailyAverageFlowbacks;
    dailyAverageFeeShr;

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
    }

    buildChartData(data) {
          const chartLabels = [];
          const flowbacksData = [];
          const feeShrData = [];
          for (let i in data) {
            flowbacksData.push(data[i].sumFeeUsd);
            feeShrData.push(data[i].sumFeeShr);
            this.sumTotalFlowbacks += data[i].sumFeeUsd;
            this.sumTotalFeeShr += data[i].sumFeeShr;
            chartLabels.push(new Date(data[i]._id));
        }
        this.dailyAverageFlowbacks = this.sumTotalFlowbacks / flowbacksData.length;
        this.dailyAverageFeeShr = this.sumTotalFeeShr / flowbacksData.length;

        return {
            labels: chartLabels,
            datasets:[
              {
                label: 'Flowbacks',
                data:  flowbacksData,
                feeShr: feeShrData,
                borderColor: this.flowbacksColor,
                backgroundColor: this.flowbacksLineColor,
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
                    id: 'Flowbacks',
                    type: 'linear',
                    position: 'left',
                    gridLines: {
                        drawBorder: false
                    },
                    scaleLabel: {
                        display: true,
                        labelString: 'Flowbacks USD',
                        fontSize: 12,
                        fontStyle: 'bold',
                        fontFamily: this.fontFamily,
                    },
                    ticks: {
                        maxTicksLimit: 5,
                        beginAtZero: true,
                        callback: function(value, index, values) {
                            return yAxesTickCallback(value, index, values, true);
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
                        this.tooltipCalledAlready = true;
                        const dataIndex = tooltipItem.index;
                        const primaryValue = data.datasets[0].data[dataIndex];
                        const secondaryValue = data.datasets[0].feeShr[dataIndex];
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
                        return [`• Flowbacks:             $${primaryValueFormatted}`,
                                `• Bought:                  ${secondaryValueFormatted} SHR`];
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
                    <div className="card-header"><T>flowbacks.flowbacks</T></div>
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
                    <CardBody id="flowbacks-bar-chart">
                        <SentryBoundary><Bar data={this.state.data} options={this.state.options} height={null} width={null} /></SentryBoundary>
                    </CardBody>
                    <CardFooter>
                        <Row>
                            <Col xs={5} md={{size: 2, offset: 4}}><small><span><T>flowbacks.flowbacks</T>:</span> <strong>${numbro(this.sumTotalFlowbacks).format({average: true, mantissa: 2})}</strong></small></Col>
                            <Col xs={7} md={6}><small><span><T>flowbacks.dailyFlowbacks</T>:</span> <strong>${numbro(this.dailyAverageFlowbacks).format({average: true, mantissa: 2})}</strong></small></Col>
                        </Row>
                        <Row>
                            <Col xs={5} md={{size: 2, offset: 4}}><small><span><T>flowbacks.bought</T>:</span> <strong>{numbro(this.sumTotalFeeShr).format({average: true, mantissa: 2})}</strong> SHR</small></Col>
                            <Col xs={7} md={6}><small><span><T>flowbacks.dailyBought</T>:</span> <strong>{numbro(this.dailyAverageFeeShr).format({average: true, mantissa: 2})}</strong> SHR</small></Col>
                        </Row>
                    </CardFooter>
                </Card>
            );
        }
    }
}    
