import React, { useState } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { getSample, setSample } from './store';

import styles from './styles.css';

const App = ({ sample, setSample }) => {
	const [text, setText] = useState(sample)
	
	return (<div className={styles.appRoot}>
		<div>Test App Page: { sample }</div>
		<div>
			New Text:
			<input type="text" value={text} onChange={(e) => {
				setText(e.target.value);
			}}/>
			<input type="button" onClick={() => {
				setSample(text);
			}} value="Set Text"/>
		</div>
	</div>);
};

const mapStateToProps = (state) => {
	return {
		sample: getSample(state)
	};
};

const mapDispatchToProps = (dispatch) => {
	return {
		setSample: (text) => {
			dispatch(setSample(text));
		}
	};
};

export default connect(mapStateToProps, mapDispatchToProps)(App);
