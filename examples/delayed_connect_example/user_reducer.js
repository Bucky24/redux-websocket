export const Constants = {
	SET_NAME: 'USER/SET_NAME',
};

const defaultState = {
	name: '',
};

export default (state = defaultState, action) => {
	if (action.type === Constants.SET_NAME) {
		const newState = {
			...state,
			name: action.name,
		};
		
		return newState;
	} else {
		return state;
	}
}

// Actions

export const setName = (name) => {
	return {
		type: Constants.SET_NAME,
		name,
	};
}

// Getters

export const getName = (state) => {
	return state.sample.name;
}
