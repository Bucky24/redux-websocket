import {
	setUserData,
	getUserData,
	removeUser,
	setConnectionID,
	getConnectionID,
	setConnected,
	clearUserData,
} from '../webSocketReducer';

export const SpecialActionType = {
	IGNORED: 'ignored',
	USER_DATA: 'user_data',
	FORCE_USER_DATA: 'force_user_data',
};

const PING_SEC = 5;

class ReduxWebSocketClient {
	constructor(url, protocol, settings={}) {
		this.sessionID = null;
		this._connected = false;
		this._authenticated = false;

		this.connect(url, protocol);
		
		this.eventHandlers = {};
		this.rootReducer = null;
		this.connectionID = null;
		this.pushUserState = false;
		
		this.debug = !!settings.debug;
		
		this.ignoredActions = [];
		this.ignoredTree = [];
		this.userDataActions = [];
		this.userDataTree = [];
		this.forceUserDataActions = [];
		this.forceUserDataTree = [];
		
		settings.specialActions.forEach((action) => {
			const { type, actions, tree } = action;
			
			if (type === SpecialActionType.IGNORED) {
				this.ignoredActions = [
					...this.ignoredActions,
					...actions,
				];
				this.ignoredTree = [
					...this.ignoredTree,
					...tree,
				]
			} else if (type === SpecialActionType.USER_DATA) {
				this.userDataActions = [
					...this.userDataActions,
					...actions,
				];
				this.userDataTree = [
					...this.userDataTree,
					...tree,
				]
			} else if (type === SpecialActionType.FORCE_USER_DATA) {
				this.forceUserDataActions = [
					...this.forceUserDataActions,
					...actions,
				];
				this.forceUserDataTree = [
					...this.forceUserDataTree,
					...tree,
				]
			}
		})
	}
	
	on(event, cb) {
		if (!this.eventHandlers[event]) {
			this.eventHandlers[event] = [];
		}
		this.eventHandlers[event].push(cb);
	}
	
	triggerEvent(event, data) {
		if (!this.eventHandlers[event]) {
			return;
		}
		
		let response;
		this.eventHandlers[event].forEach((cb) => {
			response = cb(data);
		});
		
		return response;
	}
	
	setReducers(reducers) {
		this.rootReducer = reducers;
	}
	
	setAuthentication(code) {
		this.sessionID = code;
		this.doAuth();
	}
	
	doPushUserState() {
		const currentState = this._store.getState();
		const userData = {};
		this.userDataTree.forEach((tree) => {
			userData[tree] = currentState[tree];
		});
		this.forceUserDataTree.forEach((tree) => {
			userData[tree] = currentState[tree];
		});
		const id = getConnectionID(currentState);
		
		if (this.debug) {
			console.log('Sending user state', userData);
		}
		this.send({
			messageType: 'setUserData',
			connectionID: id,
			state: userData,
		});
	}
	
	// This function should be called once a sessionID has been set.
	doAuth() {
		this.send({
			messageType: 'getState'
		});
		
		// if we have a store already, we're reconnecting.
		// repush the user data
		if (this._store) {
			this.pushUserState = true;
		}
	}
	
	handleConnection() {
		console.log('Connected to websocket');
		this._connected = true;
		
		this.triggerEvent('connected');
		
		if (this.sessionID) {
			this.doAuth();
		}
		
		this._ping_interval = setInterval(() => {
			this.send({
				messageType: 'ping',
				time: (new Date()).getTime(),
			});
		}, PING_SEC * 1000);
	}
	
	connect(url, protocol) {
		const fullUrl = url + '/' + protocol;
		console.log('Attempting connection to', fullUrl);
		const webSocket = new WebSocket(fullUrl);
		this._socket = webSocket;
		this._connected = false;
		
        webSocket.onopen = (event) => {
			this.handleConnection();
        };
		
        webSocket.onclose = (event) => {
			this._connected = false;
			if (this._store) {
				this._store.dispatch(setConnectionID(null));
				this._store.dispatch(setConnected(false));
				this._store.dispatch(clearUserData());
			}
			if (this._ping_interval) {
				clearInterval(this._ping_interval);
				this._ping_inteval = null;
			}
			// reattempt connection after a delay
			setTimeout(() => {
				this.connect(url, protocol);
			}, 1000);
        };
		
        webSocket.onerror = (event) => {
			console.log('error', event);
        };
		
		webSocket.onmessage = (event) => {
			const data = JSON.parse(event.data);
			if (data.messageType === 'redux_action') {
				if (this.debug) console.log('got redux action', data.action);
				this._store.dispatch({
					...data.action,
					__webpack_processed: true,
				});
			} else if (data.messageType === 'redux_user_action') {
				if (this.debug) console.log('got redux user action from ', data.connectionID);
				// run the reducers manually on the specific user's data tree
				const currentState = this._store.getState();
				const userData = getUserData(currentState);
				const specificUserData = userData[data.connectionID]
				
				let result = this.rootReducer(specificUserData, data.action);
				result = {
					...result
				};
				delete result.__websocket;
				
				// clean up all non user data
				Object.keys(result).forEach((key) => {
					if (
						!this.userDataTree.includes(key) &&
						!this.forceUserDataTree.includes(key)
					) {
						delete result[key];
					}
				})

				const newUserData = setUserData(data.connectionID, result);
				this._store.dispatch(newUserData);
			} else if (data.messageType === "getState") {
				this.connectionID = data.connectionID;
				// we know at this point the server had no state for us,
				// so we should just continue forward
				this._authenticated = true;
				console.log('Got a request for state. This is master connection with id', this.connectionID);
				if (!this._store) {
					console.log('Getting state without store');
					const store = this.triggerEvent("stateReceived", {
						initialState: {},
						reducers: this.rootReducer,
					});
					this._store = store;
				}
				if (!this._store) {
					console.error('Unable to get store, cannot continue');
					return;
				}
				let state = this._store.getState();
				state = {
					...state,
				};
				this._store.dispatch(setConnectionID(this.connectionID));
				this._store.dispatch(setConnected(true));
				// now strip out all user data
				for (const dataKey of this.userDataTree) {
					delete state[dataKey];
				}
				// also strip ignored data
				for (const dataKey of this.ignoredTree) {
					delete state[dataKey];
				}
				// also strip force user data
				for (const dataKey of this.forceUserDataTree) {
					delete state[dataKey];
				}
				this.send({
					messageType: "setState",
					state,
				});
				this.doPushUserState();
			} else if (data.messageType === "setState") {
				// emit event on state received
				this._authenticated = true;
				this.connectionID = data.connectionID;
				console.log('We have received state. Our connection id is', this.connectionID);
				if (!this._store) {
					const store = this.triggerEvent("stateReceived", {
						initialState: data.state,
						reducers: this.rootReducer,
					});
					this._store = store;
				}
				this._store.dispatch(setConnectionID(this.connectionID));
				this._store.dispatch(setConnected(true));
				
				if (this.pushUserState) {
					this.doPushUserState();
					this.pushUserState = false;
				}
			} else if (data.messageType === 'userLeft') {
				console.log("Got message that user", data.connectionID, 'left');
				this._store.dispatch(removeUser(data.connectionID));
			} else if (data.messageType === 'setUserData') {
				console.log("Got message with user state for ", data.connectionID);
				const newData = {
					...data.state,
				};
				if (this.debug) {
					console.log('Data is', newData);
				}
				const newUserData = setUserData(data.connectionID, newData);
				this._store.dispatch(newUserData);
			} else if (data.messageType === 'pong') {
				const time = data.time;
				if (time) {
					const nowTime = (new Date()).getTime();
					if (this.debug) {
						console.log('Ping took', nowTime - time, 'ms');
					}
				} else {
					if (this.debug) {
						console.log('Got ping with no time');
					}
				}
			} else {
				console.log('Unknown message of type', data.messageType);
			}
		}
	}
	
	send(data) {
		if (this._connected) {
			const workingData = {
				...data,
				_websocket_session: this.sessionID,
			}
			this._socket.send(JSON.stringify(workingData));
		}
	}
	
	sendLog(data) {
		this.send({
			messageType: "clientLog",
			data,
		});
	}
	
	shutdown() {
		if (this._client) {
			this._client.disconnect();
			this._client = null;
		}
 	}
	
	getMiddleware() {
		return (store) => {
			this._store = store;
			return next => action => {
				if (!action.__webpack_processed && action.type && !action.type.includes('__WEBSOCKET__')) {		
					if (
						!this.ignoredActions.includes(action.type) &&
						!this.userDataActions.includes(action.type) &&
						!this.forceUserDataActions.includes(action.type)
					) {
						const actionObj = {
							messageType: 'redux_action',
							action,
						};
						this.send(actionObj);
					}
					
					if (this.userDataActions.includes(action.type)) {
						const actionObj = {
							messageType: 'redux_user_action',
							action,
							connectionID: this.connectionID,
						}
						this.send(actionObj);
					}
					
					if (this.forceUserDataActions.includes(action.type)) {
						// do this push as soon as redux updates
						setTimeout(() => {
							this.doPushUserState();
						}, 1);
						return next(action);
					}
				}
				
				
				return next(action);
			}
		}
	}
}

export default ReduxWebSocketClient;
