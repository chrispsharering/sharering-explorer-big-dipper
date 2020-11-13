import React, { Component } from 'react';
import { Row, Col } from 'reactstrap';
import i18n from 'meteor/universe:i18n';

const T = i18n.createComponent();
class HeaderRecord extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        return(this.props.isHomePage?
            <Row className="header text-nowrap d-flex">
                <Col><i className="fas fa-database"></i> <span className="d-none d-md-inline"><T>common.height</T></span></Col>
                <Col><i className="fas fa-sync d-none d-md-inline"></i> <span><T>blocks.numOfTxs</T></span></Col>
                <Col><i className="far fa-clock"></i> <span className="d-none d-md-inline"><T>common.age</T></span></Col>
            </Row>
            :
            <Row className="header text-nowrap d-none d-sm-flex">
                <Col sm={2}><i className="fas fa-database"></i> <span className="d-none d-md-inline"><T>common.height</T></span></Col>
                <Col sm={4} lg={2}><i className="far fa-clock"></i> <span className="d-none d-md-inline"><T>common.time</T> (UTC)</span></Col>
                <Col sm={3} md={2} lg={2}><i className="material-icons">perm_contact_calendar</i> <span className="d-none d-md-inline"><T>blocks.proposer</T></span></Col>
                <Col sm={1} md={2}><i className="fas fa-sync"></i> <span className="d-none d-md-inline"><T>blocks.numOfTxs</T></span></Col>
                <Col sm={1} md={1} lg={2}>
                    <span className="d-none d-lg-inline"><T>transactions.fee</T> (</span>
                    <span>SHR</span>
                    <span className="d-none d-lg-inline">)</span>
                </Col>
                <Col sm={1} md={1} lg={2}>
                    <span className="d-none d-lg-inline"><T>transactions.fee</T> (</span>
                    <span>$</span>
                    <span className="d-none d-lg-inline">)</span>
                </Col>
            </Row>
        );
    }
}

export default HeaderRecord;