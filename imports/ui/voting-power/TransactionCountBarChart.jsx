import React, { Component } from 'react';
import {HorizontalBar, Line} from 'react-chartjs-2';
import { Row, Col, Card, CardImg, CardText, CardBody,
    CardTitle, CardSubtitle, Button, Progress, Spinner } from 'reactstrap';
import numbro from 'numbro';
import i18n from 'meteor/universe:i18n';
import SentryBoundary from '../components/SentryBoundary.jsx';

const T = i18n.createComponent();

export default class TransactionCountBarChart extends Component{
    isLoading = true;
    constructor(props){
        super(props);
        this.state = {
            data: {},
            options: {}
        }
    }

    componentDidMount(){
        this.getTxHistory();
    }

    getTxHistory = () => {
        const self = this;
        Meteor.call('Transactions.txHistory', (error, result) => {
            if (error) {
                console.log("Transactions.txHistory: " + error);
                self.txHistoryGlobal = false;
                self.isLoading = true;
            }
            else {
                const resultAsArray = Object.values(result);
                const chartData = this.buildChart(resultAsArray);
                self.setState(chartData);
            }
        })
    }

    buildChart(txData){
        console.log('in buildChart')

        let labels = [];
        let data = [];
        let totalVotingPower = 0;
        let accumulatePower = [];
        let backgroundColors = [];
        
        for (let i in txData){
            console.log(txData[i]);
            totalVotingPower += txData[i].txs;
            if (i > 0){
                accumulatePower[i] = accumulatePower[i-1] + txData[i].txs;
            }
            else{
                accumulatePower[i] = txData[i].txs;
            }

            labels.push(txData[i].date);
            data.push(txData[i].txs);
            let alpha = (txData.length+1-i)/txData.length*0.8+0.2;
            backgroundColors.push('rgba(71, 131, 196,'+alpha+')');
        }
        this.setState({
            data:{
                labels:labels,
                datasets: [
                    {
                        label: "Transactions",
                        data: data,
                        backgroundColor: backgroundColors
                    }
                ]
            },
            options:{
                tooltips: {
                    callbacks: {
                        label: function(tooltipItem, data) {
                            return numbro(data.datasets[0].data[tooltipItem.index]).format("0,0")+" ("+ data.labels[tooltipItem.index] + ": "+(numbro(data.datasets[0].data[tooltipItem.index]/totalVotingPower).format("0.00%")+", Cumulative: "+numbro(accumulatePower[tooltipItem.index]/totalVotingPower).format("0.00%"))+")";
                        }
                    }
                },
                maintainAspectRatio: false,
                scales: {
                    xAxes: [{
                        ticks: {
                            beginAtZero:true,
                            userCallback: function(value, index, values) {
                                // Convert the number to a string and splite the string every 3 charaters from the end
                                return numbro(value).format("0,0");
                            }
                        }
                    }]
                }
            }
        });

        // $("#transaction-count-bar-chart").height(16*data.length);
        this.isLoading = false;
        return txData;
    }

    render(){
        console.log('state:')
        console.log(this.state)
        if (this.isLoading){
            return <Spinner type="grow" color="primary" />
        }
        else{
            return (                    
                <Card>
                    <div className="card-header"><T>Transaction History</T></div>
                    <CardBody id="transaction-count-bar-chart">
                        {/* <SentryBoundary><HorizontalBar data={this.state.data} options={this.state.options} /></SentryBoundary> */}
                        <SentryBoundary><Line data={this.state.data} /></SentryBoundary>
                    </CardBody>
                </Card>
            );
        }
    }
}    
