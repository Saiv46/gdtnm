# GDTNM | Nepethe Multiplayer
*[GDTMP](https://forum.greenheartgames.com/t/wip-gdtmp-multiplayer-mod-client-0-5-11-server-1-5-5-0-now-in-10-languages/10509)-compatible multiplayer server implementation on [Node.JS](https://nodejs.org)*

**INITIAL COMMIT: CRITICAL ERRORS AHEAD**

## Why?
* **Easier development & integrations**
Original GDTMP server is written in C++, unlike the game written in JavaScript.
It's even possible to integrate this server with web frameworks such as [Express](https://expressjs.com).
* **Progressive enhancement**
Server will let know what it supports GDTMP-incompatible enhancements such as network compression and server-side plugins.
* **Cloud-ready**
Configuration stored in single `.json` file. Or `require()` this package and make server on your own.

## When?
- Prototype: 12/19
- Alpha: 03/20
- Beta: *sometimes*

### TODO
- Implement basic GDTMP functionality as optional plugins
- API for server-side mods
- Don't screw up saves with GDTMP's fork