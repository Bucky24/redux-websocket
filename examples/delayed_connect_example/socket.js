import { ReduxWebSocketClient, SpecialActionType } from "@bucky24/redux-websocket";

import { Constants } from './store';
import { Constants as UserConstants } from './user_reducer';
import reducers from './reducerRoot.js';

const socketHandler = new ReduxWebSocketClient(
	'ws://localhost:5000/',
	'protocol',
	{
		specialActions: [
			{
				type: SpecialActionType.IGNORED,
				actions: [Constants.SET_SAMPLE_2],
				tree: [],
			},
			{
				type: SpecialActionType.USER_DATA,
				actions: [UserConstants.SET_NAME],
				tree: ['user'],
			}
		]
	}
);

socketHandler.setReducers(reducers);

export default socketHandler;
