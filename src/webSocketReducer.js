export const Constants = {
	SET_USER_DATA: '__WEBSOCKET__/SET_USER_DATA',
	REMOVE_USER: '__WEBSOCKET__/REMOVE_USER',
};

const defaultState = {
	userData: {}
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

// Getters

export const getUserData = (state) => {
	return state.__websocket.userData;
}
