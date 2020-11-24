import React, { Component } from 'react';
import { Container, Row, Col, Card, CardBody, Spinner } from 'reactstrap';
import { Link, } from 'react-router-dom';
import numbro from 'numbro';
import moment from 'moment';
import Avatar from '../components/Avatar.jsx';
import TransactionTabs from '../transactions/TransactionTabs.jsx';
import { Helmet } from 'react-helmet';
import i18n from 'meteor/universe:i18n';
import TimeStamp from '../components/TimeStamp.jsx';

const T = i18n.createComponent();
export default class Block extends Component {
    constructor(props) {
        super(props);

        this.state = {
            transferTxs: {},
            cdpTxs: {},
            swapTxs: {},
            priceTxs: {},
            stakingTxs: {},
            distributionTxs: {},
            governanceTxs: {},
            slashingTxs: {},
            incentiveTxs: {},
            auctionTxs: {},
            loadShrTxs: {}
        };
    }

    componentDidUpdate(prevProps) {
        if (this.props != prevProps) {
            if (this.props.transactionsExist) {
                this.setState({
                    transferTxs: this.props.transferTxs,
                    cdpTxs: this.props.cdpTxs,
                    swapTxs: this.props.swapTxs,
                    priceTxs: this.props.priceTxs,
                    stakingTxs: this.props.stakingTxs,
                    distributionTxs: this.props.distributionTxs,
                    governanceTxs: this.props.governanceTxs,
                    slashingTxs: this.props.slashingTxs,
                    incentiveTxs: this.props.incentiveTxs,
                    auctionTxs: this.props.auctionTxs,
                    loadShrTxs: this.props.loadShrTxs
                })
            }
        }
    }

    buildTransactionsRows(txs) {
        if(txs && txs.length > 0) {
            return txs.map(tx => {
                tx.type = this.getTxType(tx);
                return <Row className="block-info">
                    <Col sm={6} md={3} lg={3} className="text-truncate"><Link to={"/transactions/" + tx.txhash}>{tx.txhash}</Link></Col>
                    <Col sm={6} md={3} lg={3}>{tx.type}</Col>
                    <Col md={2} lg={2} className="d-none d-md-inline">{moment(tx.timestamp).fromNow()}</Col>
                    <Col xs={8} sm={6} md={2} lg={2}><span className="fas d-md-none">Fee:</span> {tx.feeShr} SHR</Col>
                    <Col xs={4} sm={6} md={2} lg={2}><span className="fas d-md-none">Fee:</span> ${numbro(tx.feeUsd).format({ mantissa: 2 })}</Col>
                    {/* Add hover over tooltip explaining type of transaction */}
                </Row>
            });
        } else {
            return null;
        }
    }

    // TODO This can be used later to add description for each tx type
    getTxType(tx) {
        const txType = tx.tx.value.msg[0].type;
        switch(txType) {
            case 'asset/msgCreateAsset':
                return 'msgCreateAsset';
            case 'asset/msgDeleteAsset':
                return 'msgDeleteAsset';
            case 'asset/msgUpdateAsset':
                return 'msgUpdateAsset';
            case 'booking/msgBookBook':
                return 'msgBookBook';
            case 'booking/msgBookComplete':
                return 'msgBookComplete';
            case 'gentlemint/msgLoadSHR':
                return 'msgLoadSHR';
            case 'gentlemint/msgLoadSHRP':
                return 'msgLoadSHRP';
            case 'gentlemint/msgSendSHR':
                return 'msgSendSHR';
            case 'gentlemint/msgSendSHRP':
                return 'msgSendSHRP';
            case 'id/msgCreateId':
                return 'msgCreateId';
            case 'id/msgDeleteId':
                return 'msgDeleteId';
            case 'id/msgUpdateId':
                return 'msgUpdateId';
            default:
                if(txType.includes('/')) {
                    return txType.substring(txType.indexOf('/') + 1, txType.length);
                }
                return 'Transaction';
        }
    }

    render() {
        if (this.props.loading) {
            return <Container id="block">
                <Spinner type="grow" color="primary" />
            </Container>
        }
        else {
            if (this.props.blockExist) {
                let block = this.props.block;
                const txs = this.props.txs;
                let proposer = block.proposer();
                let moniker = proposer ? proposer.description.moniker : '';
                let profileUrl = proposer ? proposer.profile_url : '';
                const transactionsRows = this.buildTransactionsRows(txs);

                return <Container id="block">
                    <Helmet>
                        <title>Block {numbro(block.height).format("0,0")} on ShareLedger | ShareLedger Explorer</title>
                        <meta name="description" content={"Block details of height " + numbro(block.height).format("0,0")} />
                    </Helmet>
                    <h4><T>blocks.block</T> {numbro(block.height).format("0,0")}</h4>
                    <Card>
                        <div className="card-header"><T>common.information</T></div>
                        <CardBody>
                            <Row>
                                <Col md={4} className="label"><T>common.hash</T></Col>
                                <Col md={8} className="value text-truncate address">{block.hash}</Col>
                                <Col md={4} className="label"><T>blocks.proposer</T></Col>
                                <Col md={8} className="value"><Link to={"/validator/" + ((proposer) ? proposer.operator_address : '')}><Avatar moniker={moniker} profileUrl={profileUrl} address={block.proposerAddress} list={true} /> {moniker}</Link></Col>
                                <Col md={4} className="label"><T>blocks.numOfTransactions</T></Col>
                                <Col md={8} className="value">{numbro(block.transNum).format("0,0")}</Col>
                                <Col md={4} className="label"><T>common.time</T></Col>
                                <Col md={8} className="value"><TimeStamp time={block.time} /> ({moment(block.time).fromNow()})</Col>
                            </Row>
                        </CardBody>
                    </Card>
                    {txs.length > 0 ?
                        <Card>
                            <div className="card-header"><T>transactions.transactions</T> <small>(<T>blocks.inBlock</T> {numbro(block.height).format("0,0")})</small></div>
                            <CardBody>
                                <Row className="block-info d-none d-md-flex">
                                    <Col md={3} lg={3} className="text-truncate">TX Hash</Col>
                                    <Col md={3} lg={3}>Type</Col>
                                    <Col md={2} lg={2}><i className="far fa-clock"></i> <T>common.time</T> (UTC)</Col>
                                    <Col md={2} lg={2}>
                                        <img src="/img/logo-sharering-black.png" height="20" width="20" /> <span><T>transactions.fee</T></span>
                                    </Col>
                                    <Col md={2} lg={2}>
                                        <img src="/img/monetization_on.png" height="24" width="24" /><span><T>transactions.fee</T></span>
                                    </Col>
                                </Row>
                                {transactionsRows}
                            </CardBody>
                        </Card>
                    : null }
                    <TransactionTabs
                        transferTxs={this.state.transferTxs}
                        cdpTxs={this.state.cdpTxs}
                        swapTxs={this.state.swapTxs}
                        priceTxs={this.state.priceTxs}
                        loadShrTxs={this.state.loadShrTxs}
                        stakingTxs={this.state.stakingTxs}
                        distributionTxs={this.state.distributionTxs}
                        governanceTxs={this.state.governanceTxs}
                        slashingTxs={this.state.slashingTxs}
                        incentiveTxs={this.state.incentiveTxs}
                        auctionTxs={this.state.auctionTxs}
                    />
                </Container>
            }
            else {
                return <Container id="block"><div><T>block.notFound</T></div></Container>
            }
        }
    }
}