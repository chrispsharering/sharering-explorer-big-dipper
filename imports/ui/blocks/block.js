import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col } from 'reactstrap';
import numbro from 'numbro';
import Avatar from '../components/Avatar.jsx';
import TimeStamp from '../components/TimeStamp.jsx';
import moment from 'moment';

export default class Block extends Component {
    current = FlowRouter.getRouteName();
    
    constructor(props){
        super(props);
        // console.log('Blocks props')
        // console.log(props)
        // i need to find out how to alter the props being passed into this component
        // to include the boolean isHomePage, then if it is we can alter the columsn shown
        // same needed for HeaderRecord.jsx
        // also, need to work out how to use FlowRouter or generally how to get the route, or maybe
        // i could just manually pass it alll the way down from the parent component
        // being home or BlocksTable.jsx
    }

    render() {
        console.log('current route:')
        console.log(this.current);
        console.log(this.props)
        // let proposer = this.props.block.proposer();
        let proposer = false;
        if (proposer){
            let moniker = (proposer.description&&proposer.description.moniker)?proposer.description.moniker:proposer.address;
            return (true?
                <Row className="block-info">
                    <Col><Link to={"/blocks/"+this.props.block.height}>{numbro(this.props.block.height).format('0,0')}</Link></Col>
                    <Col>{numbro(this.props.block.transNum).format('0,0')}</Col>
                    <Col>{moment(this.props.block.time).fromNow()}</Col>
                </Row>
                :
                <Row className="block-info">
                    <Col xs={8} sm={4} lg={3}><i className="far fa-clock d-sm-none"></i><TimeStamp time={this.props.block.time}/></Col>
                    <Col xs={4} sm={2} className="text-truncate"><i className="fas fa-hashtag d-sm-none"></i> { this.props.block.hash}</Col>
                    <Col xs={8}sm={3} md={2} lg={3} className="text-truncate"><Link to={"/validator/"+this.props.block.proposerAddress}><Avatar moniker={moniker} profileUrl={proposer.profile_url} address={this.props.block.proposerAddress} list={true} /> {moniker}</Link></Col>
                    <Col xs={4} sm={1} md={2}><i className="fas fa-sync d-sm-none"></i> {numbro(this.props.block.transNum).format('0,0')}</Col>
                    <Col xs={{size:4, offset:8}} sm={{size:2, offset:0}}><i className="fas fa-database d-sm-none"></i> <Link to={"/blocks/"+this.props.block.height}>{numbro(this.props.block.height).format('0,0')}</Link></Col>
                </Row>
            )}
        else{
            return <div className="blockrow"></div>
        }
    }
}