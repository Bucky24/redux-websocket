# redux-websocket


## What is it?

redux-websocket is a module that allows for a easy to setup sync of state between multiple clients. It does this by hooking directly into Redux and broadcasting every redux dispatch to any remote clients that are connected.

## Similar Modules

The main module I've seen that appears similar is https://github.com/giantmachines/redux-websocket

The main difference here is that redux-websocket uses redux to control the websocket, while this redux-websocket uses the websocket to control redux.
