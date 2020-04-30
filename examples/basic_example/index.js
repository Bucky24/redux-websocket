import { ReduxWebSocketClient, SpecialActionType } from "@bucky24/redux-websocket";
import React from 'react';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import { render } from 'react-dom';


import reducers from './reducerRoot.js';
import App from './App';
import { Constants } from './store';
import { Constants as UserConstants } from './user_reducer';

const socketHandler = new ReduxWebSocketClient(
	'ws://localhost:5000/',
	'protocol',
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

socketHandler.setAuthentication('code');

socketHandler.setReducers(reducers);

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
