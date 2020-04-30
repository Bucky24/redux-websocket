import { ReduxWebSocketClient, SpecialActionType } from "@bucky24/redux-websocket";

import { Constants } from './store';
import { Constants as UserConstants } from './user_reducer';
import reducers from './reducerRoot.js';

const socketHandler = new ReduxWebSocketClient(
	'ws://localhost:5000/',
	'protocol'
);

socketHandler.setReducers(reducers);

export default socketHandler;
