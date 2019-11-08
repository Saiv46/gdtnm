# GDTNM | Nepethe Multiplayer
*[GDTMP](https://forum.greenheartgames.com/t/wip-gdtmp-multiplayer-mod-client-0-5-11-server-1-5-5-0-now-in-10-languages/10509)-compatible multiplayer server implementation on [Node.JS](https://nodejs.org)*

## Why?
* **Easier development & integration**
Original GDTMP server is written in C++, unlike the game written in JavaScript.
It's even possible to integrate this server with web frameworks such as [Express](https://expressjs.com).
* **Progressive enhancement**
Server will let know what it supports GDTMP-incompatible enhancements such as network compression and server-side plugins.
* **Cross-platform**
Start this server by editing only `config.json` configuration.
Or `require()` this package and make server on your own.

## When?
- Alpha: 12/19
- Beta: 03/20

## Features
### Implemented
- Basic server API
- Chat features
### To-Do
- Basic API for mods
- Trading
- Co-developing games
- Spying
- Advanced spying and sabotage
- Own multiplayer mod

## Installation
1. Clone this repository
2. Edit `config.json`
3. Enable logging `set DEBUG="gdtnm:*,-gdtnm:socket"`
3. Run `npm start`
