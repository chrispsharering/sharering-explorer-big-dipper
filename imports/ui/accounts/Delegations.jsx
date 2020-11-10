import React, { Component } from 'react';
import { Card, CardHeader, CardBody, Container, Row, Col, Spinner } from 'reactstrap';
import AccountTooltip from '../components/AccountTooltip.jsx';
import i18n from 'meteor/universe:i18n';
import Coin from '/both/utils/coins.js';
import SentryBoundary from '../components/SentryBoundary.jsx';
import numbro from 'numbro';

const T = i18n.createComponent();


export default class AccountDelegations extends Component{
    constructor(props){
        super(props);

    }


    render(){
        let numDelegations = this.props.delegations.length;
        let denomType = this.props.denom;
        let rewardDenom = '';

        return <div>
            <h6>{(numDelegations > 0)?numDelegations:<T>accounts.no</T>} <T>accounts.delegation</T>{(numDelegations>1)?<T>accounts.plural</T>:''}</h6>
            {(numDelegations > 0)?<div className="list overflow-auto"> 
                <Container fluid>
                    <Row className="header text-nowrap d-none d-lg-flex">
                        <Col xs={5} md={5}><i className="fas fa-at"></i> <span><T>accounts.validators</T></span></Col>

                        <Col xs={4} md={3}><i className="fas fa-wallet"></i> <span><T>{(Coin.StakingCoin.denom).toUpperCase()}</T></span></Col>
                        <Col xs={3} md={4}><i className="fas fa-gift"></i> <span><T>common.rewards</T></span></Col>
                    </Row>
                    <Row className="header text-nowrap d-flex d-lg-none">
                        <Col xs={5} md={5}><i className="fas fa-at"></i> <span><T>accounts.validators</T></span></Col>

                        <Col xs={4} md={3}><i className="fas fa-wallet"></i> <span><T>{(Coin.StakingCoin.denom).toUpperCase()}</T></span></Col>
                        <Col xs={3} md={4}><i className="fas fa-gift"></i></Col>
                    </Row>
                    <SentryBoundary>
                    {this.props.delegations.sort((b, a) => (a.balance - b.balance)).map((d, i) => {
                        let reward = this.props.rewardsForEachDel[d.validator_address];
                            rewardDenom =(reward)?reward.find(({denom}) => denom === denomType): null;
                        
                        return <Row key={i} className="delegation-info">
                            <Col xs={5} md={5} className="text-nowrap overflow-auto"><AccountTooltip address={d.validator_address} /></Col>
                            <Col xs={4} md={3} className="text-nowrap overflow-hidden">{d?numbro(d.balance.amount).format({average: true, mantissa: 1}):'0'}</Col>
                            <Col xs={3} md={4}>{rewardDenom?numbro(rewardDenom.amount).format({average: true, mantissa: 1}):'0.00'}</Col>
                        </Row>
                    })}</SentryBoundary>
                </Container>
            </div>:''}
        </div>
    }
}
