import React, { Component } from 'react';
import { Row, Col } from 'reactstrap';
import ChainStates from '../components/ChainStatesContainer.js';
import TransactionCountLineChart from './TransactionCountLineChart.jsx';
import { Helmet } from 'react-helmet';
import i18n from 'meteor/universe:i18n';

const T = i18n.createComponent();

export default class Charts extends Component{
    constructor(props){
        super(props);
    }

    render(){
        return <div id="charts">
            <Helmet>
                <title>Charts for ShareLedger | ShareLedger Explorer</title>
                <meta name="description" content="We would like to keep track how voting power are distributed over time among validators." />
            </Helmet>
            <Row>
                <Col md={3} xs={12}><h1 className="d-none d-lg-block"><T>charts.shareledgerCharts</T></h1></Col>
                <Col md={9} xs={12} className="text-md-right"><ChainStates /></Col>
            </Row>
            {/* <Row>
                <Col md={6}><TwentyEighty /></Col>
                <Col md={6}><ThirtyFour /></Col>
            </Row> */}
            <Row>
                <Col>
                    <TransactionCountLineChart />
                </Col>
            </Row>

        </div>
    }
}