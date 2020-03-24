export const Constants = {
	SET_USER_DATA: '__WEBSOCKET__/SET_USER_DATA',
	REMOVE_USER: '__WEBSOCKET__/REMOVE_USER',
	SET_MY_ID: '__WEBSOCKET__/SET_MY_ID',
	SET_CONNECTED: '__WEBSOCKET__/SET_CONNECTED',
};

const defaultState = {
	userData: {},
	connectionData: {
		connected: false,
	},
};

export default (state = defaultState, action) => {
	if (action.type === Constants.SET_USER_DATA) {
		const newState = {
			...state,
			userData: {
				...state.userData,
				[action.id]: action.data,
			}
		};
		
		return newState;
	} else if (action.type === Constants.REMOVE_USER) {
		const newUsers = {
			...state.userData
		};
		delete newUsers[action.id];
		
		return {
			...state,
			userData: newUsers,
		};
	} else if (action.type === Constants.SET_MY_ID) {
		return {
			...state,
			connectionData: {
				...state.connectionData,
				connectionID: action.id,
			},
		};
	} else if (action.type === Constants.SET_CONNECTED) {
		return {
			...state,
			connectionData: {
				...state.connectionData,
				connected: action.connected,
			},
		};
	} else {
		return state;
	}
}

// Actions

export const setUserData = (id, data) => {
	return {
		type: Constants.SET_USER_DATA,
		id,
		data,
	};
};

export const removeUser = (id) => {
	return {
		type: Constants.REMOVE_USER,
		id,
	};
}

export const setConnectionID = (id) => {
	return {
		type: Constants.SET_MY_ID,
		id,
	};
}

export const setConnected = (connected) => {
	return {
		type: Constants.SET_CONNECTED,
		connected,
	};
}


// Getters

export const getUserData = (state) => {
	return state.__websocket.userData;
}

export const getConnectionID = (state) => {
	return state.__websocket.connectionData.connectionID;
}

export const getConnected = (state) => {
	return state.__websocket.connectionData.connected;
}
