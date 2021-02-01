import React, { Component } from 'react';
import { Row, Col } from 'reactstrap';
import ChainStates from '../components/ChainStatesContainer.js';
import TransactionCountLineChart from './TransactionCountLineChart.jsx';
import TransactionTypesBarChart from './TransactionTypesBarChart.jsx';
import TransactionTypesStackedLineChart from './TransactionTypesStackedLineChart.jsx';
import FlowbacksBarChart from './FlowbacksBarChart.jsx';
import { Helmet } from 'react-helmet';
import i18n from 'meteor/universe:i18n';
import CirculatingSupplyPieChart from './CirculatingSupplyPieChart.jsx';

const T = i18n.createComponent();

export default class Charts extends Component{
    isLoadingDailyTxData = true;
    isLoadingChainSuppliesData = true;
    constructor(props){
        super(props);
        this.state = {
            dailyTxData: {},
            chainSuppliesData: {}
        }
    }

    getDailyTxData = () => {
        const self = this;
        Meteor.call('Transactions.getDailyTxData', (error, result) => {
            if (error) {
                console.error("Transactions.getDailyTxData: " + error);
                self.isLoadingDailyTxData = true;
            }
            else {
                self.isLoadingDailyTxData = false;
                self.setState({dailyTxData: result}); // Simply used to kick off the render lifecycle function
            }
        });
    }

    getChainSuppliesData = () => {
        const self = this;
        Meteor.call('chain.getChainSuppliesData', (error, result) => {
            if (error) {
                console.error("chain.getChainSuppliesData: " + error);
                self.isLoadingChainSuppliesData = true;
            }
            else {
                self.isLoadingChainSuppliesData = false;
                self.setState({chainSuppliesData: result}); // Simply used to kick off the render lifecycle function
            }
        });
    }

    componentDidMount() {
        this.getDailyTxData();
        this.getChainSuppliesData();
    }

    render(){
        return <div id="charts">
            <Helmet>
                <title>ShareLedger Charts | ShareLedger Explorer</title>
                <meta name="description" content="Displaying ShareLedger statistics via charts" />
            </Helmet>
            <Row>
                <Col md={3} xs={12}><h1 className="d-none d-lg-block"><T>charts.shareledgerCharts</T></h1></Col>
                <Col md={9} xs={12} className="text-md-right"><ChainStates /></Col>
            </Row>
            {/* <Row>
                <Col md={6}><TwentyEighty /></Col>
                <Col md={6}><ThirtyFour /></Col>
            </Row> */}
            {/* <div>state:</div>
            <div>{this.state}</div> */}
            {this.isLoadingDailyTxData ?
                <div>Loading Transaction data from database</div>
                :
                <div>
                    <Row>
                        <Col>
                            <TransactionCountLineChart dailyTxData={this.state.dailyTxData} />
                        </Col>
                    </Row>
                    <Row>
                        <Col>
                            <TransactionTypesBarChart dailyTxData={this.state.dailyTxData} />
                        </Col>
                    </Row>
                    <Row>
                        <Col>
                            <TransactionTypesStackedLineChart dailyTxData={this.state.dailyTxData} />
                        </Col>
                    </Row>
                    {/* <Row>
                        <Col>
                            <FlowbacksBarChart dailyTxData={this.state.dailyTxData} />
                        </Col>
                    </Row> */}
                </div>
            }
            {this.isLoadingChainSuppliesData ?
                <div>Loading Chain Supplies data from database</div>
                :
                <div>
                    <Row>
                        <Col>
                            <CirculatingSupplyPieChart chainSuppliesData={this.state.chainSuppliesData} />
                        </Col>
                    </Row>
                </div>
            }
        </div>
    }
}