import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { getUserData } from '@bucky24/redux-websocket';

import {
	getSample,
	setSample,
	getSample2,
	setSample2,
} from './store';
import {
	getName,
	setName,
} from './user_reducer';

import styles from './styles.css';

const App = ({
	sample,
	setSample,
	sample2,
	setSample2,
	name,
	setName,
	userData,
}) => {
	const [text, setText] = useState(sample);
	const [text2, setText2] = useState(sample2);
	const [tempName, setTempName] = useState(name);
	
	useEffect(() => {
		setText(sample);
	}, [sample]);
	
	useEffect(() => {
		setText2(sample2);
	}, [sample2]);
	
	useEffect(() => {
		setTempName(name);
	}, [name]);
	
	return (<div className={styles.appRoot}>
		<div>Test App Page sample1: { sample }</div>
		<div>
			New Text:
			<input type="text" value={text} onChange={(e) => {
				setText(e.target.value);
			}}/>
			<input type="button" onClick={() => {
				setSample(text);
			}} value="Set Text"/>
		</div>
		<div>Test App Page sample2: { sample2 }</div>
		<div>
			New Text:
			<input type="text" value={text2} onChange={(e) => {
				setText2(e.target.value);
			}}/>
			<input type="button" onClick={() => {
				setSample2(text2);
			}} value="Set Text"/>
		</div>
		<div>Your name: { name }</div>
		<div>
			New name:
			<input type="text" value={tempName} onChange={(e) => {
				setTempName(e.target.value);
			}}/>
			<input type="button" onClick={() => {
				setName(tempName);
			}} value="Set Name"/>
		</div>
		{ Object.keys(userData).map((id) => {
			const data = userData[id];
			
			return <div key={id}>
				{ data.user.name }: { id }
			</div>;
		})}
	</div>);
};

const mapStateToProps = (state) => {
	return {
		sample: getSample(state),
		sample2: getSample2(state),
		name: getName(state),
		userData: getUserData(state),
	};
};

const mapDispatchToProps = (dispatch) => {
	return {
		setSample: (text) => {
			dispatch(setSample(text));
		},
		setSample2: (text) => {
			dispatch(setSample2(text));
		},
		setName: (name) => {
			dispatch(setName(name));
		}
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(App);
