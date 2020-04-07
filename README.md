# redux-websocket

## Installation

With NPM

    npm install --save @bucky24/redux-websocket

With Yarn

    yarn install @bucky24/redux-websocket


## What is it?

redux-websocket is a module that allows for a easy to setup sync of state between multiple clients. It does this by hooking directly into Redux and broadcasting every redux dispatch to any remote clients that are connected, as well as receiving dispatch updates from those clients, allowing all clients to stay in sync.

## Usage

redux-websocket has two parts, the server and the client. Both are relatively simple to insert into an application, though the server is certainly simpler.

### Server

To start the redux-websocket server, just run the following code:

```
const ReduxSocketServer = require('@bucky24/redux-websocket/server');

const PORT = process.env.port || 5000;

ReduxSocketServer(PORT);
```

And that's about it! The server will log various messages to the console as it sees connections come and go.

### Client

Setting up the redux client is a bit more complex. The client must be aware of the redux store, however the client must be created before the redux store. This is because the client will inject the current working state into redux when a new user connects, which is important to ensure clients stay up to date.

In order to create a simple redux-websocket client with a redux store, use the following code:

```
import ReactWebSocketClient from "../../src/client";
import React from 'react';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import { render } from 'react-dom';

import reducers from './reducerRoot.js';
import App from './App';

const url = "ws://localhost:5000";
const protocol = "protocol";
const sessionID = "session";

const socketHandler = new ReactWebSocketClient(url, protocol, sessionID);

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
```

### Client Options

The client can treat different actions and parts of the state tree differently. Perhaps you want certain actions or parts of the state to not sync to all clients. Or perhaps you want certian actions or parts of the state to sync to clients, but for each client to maintain their own state, and not have it overwritten by others.

#### Ignored State

Actions that are ignored are not broadcast to other clients, and state tree that is ignored is stripped out by the master connection when giving the initial state for a client.

To add ignored state, you'll need to do the following in the client:

```
import ReactWebSocketClient, { SpecialActionType } from "../../src/client";
// ... other imports

const socketHandler = new ReactWebSocketClient(url, protocol, session, {
	specialActions: [
		{
			type: SpecialActionType.IGNORED,
			actions: [Constants.SET_SAMPLE_2],
			tree: ['top_level_state_tree'_],
		},
	]
});
```

#### User State

Actions that are part of the user state are still broadcast to other clients, but are not stored in the main redux state. Instead, the changed data is stored under another branch of the state, under the user's connection ID, so that it can be referred to in context of that user. An example of where this might be useful is information specific to a user, like a name.

To add user state, you'll need to add the following to the client init code:
```
import ReactWebSocketClient, { SpecialActionType } from "../../src/client";
// ... other imports

const socketHandler = new ReactWebSocketClient(url, protocol, session, {
	specialActions: [
		{
			type: SpecialActionType.USER_DATA,
			actions: [Constants.SET_SAMPLE_2],
			tree: ['top_level_state_tree'_],
		},
	]
});
```

You'll also need to add the websocket reducer into your reducer root, as redux-websocket uses the redux store to store user data (as well as some internal connection data)

```
import { combineReducers } from 'redux';
import { WebSocketReducer} from '@bucky24/redux-websocket';
import sample from './store';

// reducers here

const reducers = {
	sample,
	__websocket: WebSocketReducer,
};

export default combineReducers(reducers);
```

Note that `__websocket` *must* be the name of the reducer.

In order to extract and use the websocket user data, you can use the helpful selectors provided by the client.

```
import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { getUserData } from '@bucky24/redux-websocket';

import styles from './styles.css';

const App = ({
	userData,
}) => {	
	return (<div className={styles.appRoot}>
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
		userData: getUserData(state),
	};
};

const mapDispatchToProps = (dispatch) => {
	return {

	};
};

export default connect(mapStateToProps, mapDispatchToProps)(App);

```

## Similar Modules

The main module I've seen that appears similar is https://github.com/giantmachines/redux-websocket

The main difference here is that redux-websocket uses redux to control the websocket, while redux-websocket uses the websocket to control redux.
