import ReactWebSocketClient, { SpecialActionType } from "../../src/client";
import React from 'react';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import { render } from 'react-dom';

import reducers from './reducerRoot.js';
import App from './App';
import { Constants } from './store';
import { Constants as UserConstants } from './user_reducer';

const socketHandler = new ReactWebSocketClient(
	'ws://localhost:5000/',
	'protocol',
	'code',
	{
		specialActions: [
			{
				type: SpecialActionType.IGNORED,
				actions: [Constants.SET_SAMPLE_2],
				tree: [],
			},
			{
				type: SpecialActionType.USER_DATA,
				actions: [UserConstants.SET_NAME],
				tree: ['user'],
			}
		]
	}
);

socketHandler.setReducers(reducers);

socketHandler.on('stateReceived', (initialState) => {
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
