
class WebpackClient {
	constructor(url, protocol) {
		this.connect(url, protocol);
	}
	
	connect(url, protocol) {
		console.log('Attempting connection to', url);
		const webSocket = new WebSocket(url, [protocol]);
		this._socket = webSocket;
		this._connected = false;
		
        webSocket.onopen = (event) => {
			console.log('Connected to websocket');
			this._connected = true;
        };
		
        webSocket.onclose = (event) => {
			this._connected = false;
			this.connect(url, protocol);
        };
		
        webSocket.onerror = (event) => {
			console.log('error', event);
        };
		
		webSocket.onmessage = (event) => {
			const data = JSON.parse(event.data);
			this._dispatch({
				...data,
				__webpack_processed: true,
			});
		}
	}
	
	send(data) {
		if (this._connected) {
			this._socket.send(data);
		}
	}
	
	shutdown() {
		if (this._client) {
			this._client.disconnect();
			this._client = null;
		}
 	}
	
	getMiddleware() {
		return ({ getState, dispatch }) => {
			this._dispatch = dispatch;
			return next => action => {
				if (!action.__webpack_processed) {
					this.send(JSON.stringify(action));
				}
				return next(action);
			}
		}
	}
}

export default WebpackClient;
