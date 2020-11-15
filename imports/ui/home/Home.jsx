  
import React, { Component } from 'react';
import {Container, Row, Col, Card, CardBody, NavLink } from 'reactstrap';
import ChainStatus from './ChainStatusContainer.js';
import ChainInfo from '../components/ChainInfo.jsx'
import Consensus from './ConsensusContainer.js';
import TopValidators from './TopValidatorsContainer.js';
import Chart from './ChartContainer.js';
import { Helmet } from "react-helmet";
import HeaderRecord from '../blocks/HeaderRecord.jsx';
import Blocks from '/imports/ui/blocks/ListContainer.js';
import i18n from 'meteor/universe:i18n';
import { Link } from 'react-router-dom';

const T = i18n.createComponent();
export default class Home extends Component{
    constructor(props){
        super(props);
        this.state = {
            limit: Meteor.settings.public.homePageBlockCount
        };
    }

    render() {
        return <div id="home">
            <Helmet>
                <title>ShareRing Explorer | ShareLedger Block Explorer</title>
                <meta name="description" content="ShareLedger is the custom Tendemint blockchain built for the ShareRing ecosystem." />
            </Helmet>
            <ChainInfo/>
            <Consensus />
            <ChainStatus />
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
                    <Chart />
                </Col>
            </Row>
            <Row>
                <Col md={12}>
                    <TopValidators />
                </Col>
            </Row>
        </div>
    }

}