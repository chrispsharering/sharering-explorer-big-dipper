import React, { Component } from 'react';
import {Pie } from 'react-chartjs-2';
import { Row, Col, Card, CardBody,Spinner, CardFooter} from 'reactstrap';
import numbro from 'numbro';
import i18n from 'meteor/universe:i18n';
import SentryBoundary from '../components/SentryBoundary.jsx';
import cloneDeep from 'lodash/cloneDeep';

const T = i18n.createComponent();

export default class CirculatingSupplyPieChart extends Component {
    timeButtonStyling = {padding: "5px", color: "rgba(1, 1, 1, 0.55)", textTransform: "none", boxShadow: "0 1px 1px rgba(0, 0, 0, 0.4)"};
    isLoading = true;
    originalState;
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
    segmentColours = ["rgba(71, 131, 196, 1)", "rgba(60, 60, 61, 1)", "rgba(243, 186, 47, 1)"]; // SHR color, Ethereum color, Binance color
    dailyAverageFeeUsd = 0;
    nativeCirculating = 0;
    erc20Circulating = 0;
    bep2Circulating = 0;
    nativeCirculatingPercentage = 0
    erc20CirculatingPercentage = 0;
    bep2CirculatingPercentage = 0;

    constructor(props) {
        super(props);
    }

    buildChartData(data) {
        return {
            datasets: [{
                data: [data.native, data.erc20, data.bep2],
                backgroundColor: this.segmentColours,
            }],
            labels: [
                'Native',
                'ERC20',
                "BEP2 (COMING SOON)" //TODO
            ]
        };
      }

      buildChartOptions() {
        let labelFontSize = 14;
        let labelFontStyle = 500;
        return {
          maintainAspectRatio: false,
          responsive: true,
          tooltips: {
            backgroundColor: this.colorScheme.tooltipBackgroundColor,
            borderColor: this.colorScheme.tooltipBorderColor,
            borderWidth: 0.3,
            cornerRadius: 2,
            caretSize: 5,
            titleFontSize: 13,
            titleFontStyle: 'bold',
            titleFontColor: this.colorScheme.tooltipTitleFontColor,
            bodyFontColor: this.colorScheme.tooltipBodyFontColor,
            bodyFontSize: 13,
            titleFontFamily: this.fontFamily,
            bodyFontFamily: this.fontFamily,
            displayColors: false,
            callbacks: {
                title: function(tooltipItem, data) {
                    return data.labels[tooltipItem[0].index];
                },
                label: (tooltipItem, data) => {
                    const dataIndex = tooltipItem.index;
                    const value = data.datasets[0].data[dataIndex]
                    const mantissa = value >= 1000000000 ? 4 : 2;
                    const valueFormatted = numbro(value).format({
                        average: true,
                        mantissa: mantissa,
                    });
                    let percentageValue;
                    if(dataIndex === 0) {
                        percentageValue = this.nativeCirculatingPercentage;
                    } else if(dataIndex === 1) {
                        percentageValue = this.erc20CirculatingPercentage;
                    } else {
                        percentageValue = this.bep2CirculatingPercentage;
                    }
                    const percentageValueFormatted = numbro(percentageValue).format({
                        average: true,
                        mantissa: 2,
                    });
                    return [`• Circulating:    ${percentageValueFormatted}% (${valueFormatted} SHR)`];
                }
            }
          },
          pieceLabel: {
            fontColor: this.colorScheme.tooltipBodyFontColor,
            fontSize: labelFontSize,
            fontStyle: labelFontStyle, // fontWeight
            position: 'outside',
            segment: true,
          },
          title: {
            display: false
          },
          legend: {
            onClick: (e) => e.stopPropagation()
          },
          plugins: {
            datalabels: {
              formatter: (value, ctx) => {
                const label = ctx.chart.data.labels[ctx.dataIndex];
                return label;
              },
            },
          },
          animation: false,
          elements: {
            arc: {
                borderWidth: 1,
                borderColor: this.colorScheme.backgroundColor
                // hoverBorderWidth: 5,
            }
          },
          cutoutPercentage: 50
        };
      }

    buildChart(circulatingSupplies){
        const chartData = this.buildChartData(circulatingSupplies);
        const chartOptions = this.buildChartOptions();
        this.isLoading = false;
        this.originalState = {
            data: chartData,
            options: chartOptions,
        };
        return cloneDeep(this.originalState);
    }

    componentDidMount() {
        console.log('circulating supply')
        console.log(this.props.chainSuppliesData[0].chainSupplies.circulating)
        if(this.props.chainSuppliesData && this.props.chainSuppliesData.length > 0 && this.props.chainSuppliesData[0].chainSupplies
            && this.props.chainSuppliesData[0].chainSupplies.circulating
            && this.props.chainSuppliesData[0].chainSupplies.circulating.native
            && this.props.chainSuppliesData[0].chainSupplies.circulating.erc20
            && this.props.chainSuppliesData[0].chainSupplies.circulating.bep2 >= 0) {
            this.nativeCirculating = this.props.chainSuppliesData[0].chainSupplies.circulating.native;
            this.erc20Circulating = this.props.chainSuppliesData[0].chainSupplies.circulating.erc20;
            this.bep2Circulating = this.props.chainSuppliesData[0].chainSupplies.circulating.bep2;
        } else {
            this.isLoading = true;
            return;
        }
        const totalCirculating = this.nativeCirculating + this.erc20Circulating + this.bep2Circulating;
        this.nativeCirculatingPercentage = (100 / totalCirculating) * this.nativeCirculating;
        this.erc20CirculatingPercentage = (100 / totalCirculating) * this.erc20Circulating;
        this.bep2CirculatingPercentage = (100 / totalCirculating) * this.bep2Circulating;
        const chartData = this.buildChart(this.props.chainSuppliesData[0].chainSupplies.circulating);
        this.setState(chartData); // Simply used to kick off the render lifecycle function
    }

    render() {
        if (this.isLoading) {
            return <Spinner type="grow" color="primary" />
        }
        else {
            return (
                <Card>
                    <div className="card-header"><T>analytics.circulatingSupplies</T></div>
                    <CardBody id="circulating-supplies-pie-chart">
                        <SentryBoundary><Pie data={this.state.data} options={this.state.options} height={null} width={null} /></SentryBoundary>
                    </CardBody>
                    <CardFooter>
                        <Row>
                            <Col xs={5} md={{size: 2, offset: 4}}><small><span><T>analytics.native</T>:</span> <strong>{numbro(this.nativeCirculatingPercentage).format({average: true, mantissa: 2})}</strong>% (<strong>{numbro(this.nativeCirculating).format({average: true, mantissa: 2})}</strong> SHR)</small></Col>
                        </Row>
                        <Row>
                            <Col xs={5} md={{size: 2, offset: 4}}><small><span>ERC20:</span> <strong>{numbro(this.erc20CirculatingPercentage).format({average: true, mantissa: 2})}</strong>% (<strong>{numbro(this.erc20Circulating).format({average: true, mantissa: 2})}</strong> SHR)</small></Col>
                        </Row>
                        <Row>
                            {/* <Col xs={5} md={{size: 2, offset: 4}}><small><span>BEP2:</span> <strong>{numbro(this.bep2CirculatingPercentage).format({average: true, mantissa: 2})}</strong>% (<strong>{numbro(this.bep2Circulating).format({average: true, mantissa: 2})}</strong> SHR)</small></Col> */}
                            <Col xs={5} md={{size: 2, offset: 4}}><small><span>BEP2:</span> COMING SOON</small></Col>
                        </Row>
                    </CardFooter>
                </Card>
            );
        }
    }
}    
