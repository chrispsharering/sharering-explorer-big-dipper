  
import React, { Component } from 'react';
import {Container, Row, Col, Card, CardBody, NavLink } from 'reactstrap';
import ChainStatus from './ChainStatusContainer.js';
import ChainInfo from '../components/ChainInfo.jsx'
import TransactionCountLineChart from '../charts/TransactionCountLineChart.jsx';
import Consensus from './ConsensusContainer.js';
import TopValidators from './TopValidatorsContainer.js';
import Chart from './ChartContainer.js';
import { Helmet } from "react-helmet";
import HeaderRecord from '../blocks/HeaderRecord.jsx';
import Blocks from '/imports/ui/blocks/ListContainer.js';
import Transactions from '/imports/ui/transactions/ListContainer.js';
import i18n from 'meteor/universe:i18n';
import { Link } from 'react-router-dom';

const T = i18n.createComponent();
export default class Home extends Component {
    isLoadingDailyTxData = true;
    constructor(props){
        super(props);
        this.state = {
            limit: Meteor.settings.public.homePageBlockCount,
            dailyTxData: {}
        };
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

    componentDidMount() {
        this.getDailyTxData();
    }

    render() {
        return <div id="home">
            <Helmet>
                <title>ShareRing Explorer | ShareLedger Block Explorer</title>
                <meta name="description" content="ShareLedger is the custom Tendermint blockchain built for the ShareRing ecosystem." />
            </Helmet>
            <ChainInfo/>
            <Consensus />
            <ChainStatus />
            {this.isLoadingDailyTxData ?
                <div>Loading data from database</div>
                :
                <Row>
                    <Col>
                        <TransactionCountLineChart dailyTxData={this.state.dailyTxData} />
                    </Col>
                </Row>
            }
            <Row>
                <Col md={6}>
                    <Card>
                        <div className="card-header"><T>blocks.latestBlocks</T> <span>(beta Explorer Syncing...)</span>
                            <span className="float-right">
                                <NavLink tag={Link} to="/blocks" className="view-all-button"><T>common.viewAll</T> >></NavLink>
                            </span>
                        </div>
                        <CardBody>
                            <HeaderRecord isHomePage={true}/>
                            <Blocks limit={this.state.limit} isHomePage={true}/>
                        </CardBody>
                    </Card>
                </Col>
                <Col md={6}>
                    <Card>
                        <div className="card-header"><T>transactions.latestTransactions</T> <span>(beta Explorer Syncing...)</span>
                            <span className="float-right">
                                <NavLink tag={Link} to="/transactions" className="view-all-button"><T>common.viewAll</T> >></NavLink>
                            </span>
                        </div>
                        <CardBody>
                            <Transactions limit={this.state.limit} isHomePage={true}/>
                        </CardBody>
                    </Card>
                </Col>
            </Row>
            <Row>
                <Col md={6}>
                    <TopValidators />
                </Col>
                <Col md={6}>
                    <Chart />
                </Col>
            </Row>
        </div>
    }

}