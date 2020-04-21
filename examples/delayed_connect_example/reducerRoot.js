import { combineReducers } from 'redux';
import { WebSocketReducer} from '@bucky24/redux-websocket';
import sample from './store';
import user from './user_reducer';

// reducers here

const reducers = {
	sample,
	user,
	__websocket: WebSocketReducer,
};

export default combineReducers(reducers);