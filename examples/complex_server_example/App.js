import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { getUserData } from '@bucky24/redux-websocket';

import {
	getSample,
	setSample,
} from './store';
import socket from './socket';

import styles from './styles.css';

const App = ({
	sample,
	setSample,
}) => {
	const [text, setText] = useState(sample);
	
	useEffect(() => {
		setText(sample);
	}, [sample]);
	
	return (<div className={styles.appRoot}>
		<div>Test App Page sample1: { sample }</div>
		<div>
			New Text:
			<input type="text" value={text} onChange={(e) => {
				setText(e.target.value);
			}}/>
			<input type="button" onClick={() => {
				setSample(text);
			}} value="Set Text"/><br/>
			<input type="button" value="Save" onClick={() => {
				socket.sendMessage('save');
			}}/>
		</div>
	</div>);
};

const mapStateToProps = (state) => {
	return {
		sample: getSample(state),
	};
};

const mapDispatchToProps = (dispatch) => {
	return {
		setSample: (text) => {
			dispatch(setSample(text));
		},
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(App);
