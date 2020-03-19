import ReactWebsocket from "../../src/client";
import React from 'react';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import { render } from 'react-dom';

import reducers from './reducerRoot.js';
import App from './App';

const socketHandler = new ReactWebsocket('ws://localhost:5000/protocol');

const store = createStore(reducers, applyMiddleware(socketHandler.getMiddleware()));

render(
	<Provider store={store}>
		<App />
	</Provider>,
	document.getElementById('root')
);
