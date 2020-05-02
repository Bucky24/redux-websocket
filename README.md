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
import { ReduxWebSocketClient, SpecialActionType } "@bucky24/redux-websocket";
import React from 'react';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import { render } from 'react-dom';

import reducers from './reducerRoot.js';
import App from './App';

const url = "ws://localhost:5000";
const protocol = "protocol";
const sessionID = "session";

const socketHandler = new ReactWebSocketClient(url, protocol);

socketHandler.setAuthentication(sessionID);
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
```

### Client Options

The client can treat different actions and parts of the state tree differently. Perhaps you want certain actions or parts of the state to not sync to all clients. Or perhaps you want certian actions or parts of the state to sync to clients, but for each client to maintain their own state, and not have it overwritten by others.

#### Ignored State

Actions that are ignored are not broadcast to other clients, and state tree that is ignored is stripped out by the master connection when giving the initial state for a client.

To add ignored state, you'll need to do the following in the client:

```
import { ReduxWebSocketClient, SpecialActionType } from "@bucky24/redux-websocket";
// ... other imports

const socketHandler = new ReactWebSocketClient(url, protocol, {
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
import { ReduxWebSocketClient, SpecialActionType } from "@bucky24/redux-websocket";
// ... other imports

const socketHandler = new ReactWebSocketClient(url, protocol, {
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
import { WebSocketReducer } from '@bucky24/redux-websocket';
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


### Handling Session Codes After App Init

It may be very useful to have your user not enter the code until later. This could be because you want to show them some UI before entering a code. Or, in the case of the first user to enter, perhaps you want to auto-generated the code that they need to share to other users.

This gets somewhat complicated because the socket handler itself needs to create the main Redux store (due to setting initial state). This means you won't be able to use your main store until the user has entered the code, so this should be among the first things your application does.

See the `delayed_connect_example` for a more in-depth example on how to do this.

Essentially, your socket handler should be created in a way that can be acessed by your UI. Use the following code in your main app index:

```
import socketHandler from './path/to/your/handler';

socketHandler.on('stateReceived', ({ initialState, reducers }) => {
	// your normal app initialization, as above
});

render(
	<PreSocketApp/>,
	document.getElementById('root')
);
```

Then inside PreSocketApp, somewhere you would need to have:
```
import socketHandler from './path/to/your/handler';

class PreSocketApp extends React.Component {
	handleSubmit(code) {
		socketHandler.setAuthentication(code);
	}
	
	// the rest of the class
}
```

At this point, the system will attempt to authenticate with that code, and will load the correct initial state from the server. The main app initialization will fire, and the page will be reloaded.

### Fetching State

At any point, from the server, you can fetch the current state for any session by calling the `getState` method on the server socket.

```
import socket from './path/to/your/handler';

async function foo() {
	const state = await socket.getState();
}
```

### Event Handling

The socket server will emit various events. To listen for them, use the `on` method:

```
import socket from './path/to/your/handler';

socket.on(event, (data) => {
	// do something
});

```

The various event types and the data they return can be found below:
| Event | When | Callback Data |
| ---- | ------ | ---- |
| message | Fired when the websocket gets a message it does not know how to process. | An object containing "message" and "id" (being the ID of the connection that fired the message) |
| getInitialState | Fired when the first socket connects for a session. From here you can return an object that will make up the initial state passed into redux. Response can be a promise. | An object containining "session" |

### Custom Messages

The websocket frontend client can be told to fire a custom message to the server. Such a message can be listened to with the "message" event handler.

```
import socket from './socket';

socket.sendMessage(messageType, data);
```

## Similar Modules

The main module I have seen that appears similar is https://github.com/giantmachines/redux-websocket

The main difference here is that `@giantmatchines/redux-websocket` (and similar packages) uses redux to control the websocket, while `@bucky24/redux-websocket` uses the websocket to control redux.
