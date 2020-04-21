import React, { useState } from 'react';
import PropTypes from 'prop-types';
import socketConnection from './socket';

const PreApp = () => {
	const [code, setCode] = useState('');
	
	return (<div>
		Enter code here:
		<input type='text' value={code} onChange={(e) => {
			setCode(e.target.value);
		}}/><br/>
		<input type='button' value='Set Code' onClick={() => {
			socketConnection.setAuthentication(code);
		}} />
	</div>);
};

export default PreApp;
