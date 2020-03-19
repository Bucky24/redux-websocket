export const Constants = {
	SET_SAMPLE: 'SAMPLE/SET_SAMPLE'
};

const defaultState = {
	sample: 'test'
};

export default (state = defaultState, action) => {
	switch (action.type) {
		case Constants.SET_SAMPLE:
			const newState = {
				...state,
				sample: action.sample
			}
			
			return newState;
		default:
			return state;
	}
}

// Actions

export const setSample = (sample) => {
	return {
		type: Constants.SET_SAMPLE,
		sample
	};
};


// Getters

export const getSample = (state) => {
	return state.sample.sample;
}