import React from 'react';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import { render } from 'react-dom';

import App from './App';
import PreApp from './PreApp';
import socketHandler from './socket';

//socketHandler.setAuthentication('code');

socketHandler.on('stateReceived', ({ initialState, reducers }) => {
	const store = createStore(
		reducers, initialState, applyMiddleware(socketHandler.getMiddleware())
	);

	render(
		<Provider store={store}>
			<App />
		</Provider>,
		document.getElementById('root')
	);
	
	return store;
});

render(
	<PreApp/>,
	document.getElementById('root')
);
