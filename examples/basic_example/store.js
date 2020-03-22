export const Constants = {
	SET_SAMPLE: 'SAMPLE/SET_SAMPLE',
	SET_SAMPLE_2: 'SAMPLE/SET_SAMPLE_2',
	SET_NAME: 'SAMPLE/SET_NAME',
};

const defaultState = {
	sample: 'test',
	sample2: 'test2',
	name: '',
};

export default (state = defaultState, action) => {
	if (action.type === Constants.SET_SAMPLE) {
		const newState = {
			...state,
			sample: action.sample
		};
		
		return newState;
	} else if (action.type === Constants.SET_SAMPLE_2) {
		const newState = {
			...state,
			sample2: action.sample,
		};
		
		return newState;
	} else if (action.type === Constants.SET_NAME) {
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

export const setSample = (sample) => {
	return {
		type: Constants.SET_SAMPLE,
		sample,
	};
};

export const setSample2 = (sample) => {
	return {
		type: Constants.SET_SAMPLE_2,
		sample,
	};
}

export const setName = (name) => {
	return {
		type: Constants.SET_NAME,
		name,
	};
}

// Getters

export const getSample = (state) => {
	return state.sample.sample;
}

export const getSample2 = (state) => {
	return state.sample.sample2;
}

export const getName = (state) => {
	return state.sample.name;
}
