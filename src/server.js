import { createServer } from "http";
import { promisify } from "util";
import EventEmitter from "events";
import WebSocket from "websocket";

import nClient, {
	PROTOCOL_VERSION,
	LEGACY_SERVERVERSION
} from "./client.js";
import nLogger from "./logger.js";
import nPlugin from "./plugin.js";
import nNAT from "./nat.js";
import nException from "./exception.js";

/**
 * Server instance
 */
export class nServer extends EventEmitter {
	/**
	 * Player connected
	 * @event nServer#playerAdded
	 * @prop {nClient} client
	 *//**
	 * Player joined to game
	 * @event nServer#playerJoined
	 * @prop {nClient} client
	 *//**
	 * Player disconnect
	 * @event nServer#playerRemoved
	 * @prop {nClient} client
	 *//**
	 * Server initializated and started
	 * @event nServer#serverStarted
	 * @prop {nServer} self
	 *//**
	 * Server stopped and de-initializated
	 * @event nServer#serverStopped
	 * @prop {nServer} self
	 */

	/**
	 * Default configuration
	 * @returns {Object}
	 */
	static get DefaultConfig() {
		return {
			standalone: true,
			origin: {
				host: "0.0.0.0",
				port: 1080,
				keepalive: true
			},
			gameplay: {
				motd: "GDTMP-compatible server",
				description: "GDTMP-compatible server",
				timesync: false,
				syncconsoles: false,
				offlineconsoles: false,
				syncconsoles: false,
				reviewbattle: false,
				serversidesave: true,
				cheatmodallowed: false
			},
			users: {
				banned: [],
				opped: []
			}
		};
	}
	
	/**
	 * Constructs server instance
	 * @param {Object} config Configuration to use
	 */
	constructor(config = nServer.DefaultConfig) {
		super();
		/// Init variables
		this.clients = new Set();
		this.plugins = new Set();
		this.http = null;
		this.server = null;
		this.config = config;
		/// Init critical components
		this.nat = new nNAT();
		this.logger = new nLogger("server");
	}
	/**
	 * Initializes server
	 */
	async init() {
		if (this._init) return;
		this._init = true;
		this.logger("Server initializating...");
		const {
			origin: { host, port, keepalive },
			gameplay: { motd, description }
		} = this.config;
		if (!this.server && !this.http) {
			const server = createServer((_, res) => {
				res.writeHead(200, {"Content-Type": "application/json"});
				res.end(JSON.stringify({
					agent: `GDTMP/${LEGACY_SERVERVERSION} Nepenthe/${PROTOCOL_VERSION}`,
					status: "running",
					motd,
					description
				}));
			});
			server.once("error", err => {
				try {
					if (err.code === "EADDRINUSE") {
						throw new Error("Port already in use");
					}
					throw err;
				} catch(e) {
					throw new nException("Failed to launch HTTP(S) server", e);
				}
			});
			await promisify(server.listen).call(server, port, host, 511);
			this.http = server;
			this.logger(`HTTP server running on ${host}:${port}`);
		}
		if (!this.server) {
			this.server = new WebSocket.server({
				httpServer: [ this.http ],
				maxReceivedFrameSize: 8*1024,
				maxReceivedMessageSize: 8*1024*1024,
				fragmentOutgoingMessages: true,
				fragmentationThreshold: 8*1024,
				keepaliveInterval: (!!keepalive)*1e3,
				autoAcceptConnections: true,
				closeTimeout: 500,
				disableNagleAlgorithm: false,
				ignoreXForwardedFor: true
			});
			this.logger(`WebSocket server running on ${host}:${port}`);
		}

		this.server.on("connect", socket => {
			const client = new nClient(socket);
			this.emit("clientAdded", client);
			this.clients.add(client);
			client.on("@join", () => this.emit("clientJoined", client));
			client.on("@close", () => {
				this.emit("clientRemoved", client);
				this.clients.delete(client);
			});
		});

		this.logger("Server started!");
		this.emit("serverStarted", this);
	}
	/**
	 * Stops server
	 */
	async stop() {
		if (!this._init) return;
		this.logger("Server shutting down...");
		this.server.shutDown();
		this.server = null;
		this.logger("WebSocket server closed");
		await promisify(this.http.close).call(this.http);
		this.http = null;
		this.logger("HTTP server closed");
		if (this.clients.size) {
			this.logger("Closing client connections");
			this.clients.forEach(v => v._socket.close());
		}
		this._init = false;
		this.logger("Server stopped!");
		this.emit("serverStopped", this);
	}
	/**
	 * Register server plugin
	 * @param {nPlugin} plugin Plugin class
	 */
	register(plugin) {
		const inst = new plugin(this);
		if (!(inst instanceof nPlugin)) {
			throw new nException("Plugin class must extend nPlugin");
		}
		this.setMaxListeners(this.getMaxListeners() + 1);
		this.on("clientAdded", inst.onClientAdded = inst.onClientAdded.bind(inst));
		this.on("clientJoined", inst.onClientJoined = inst.onClientJoined.bind(inst));
		this.on("clientRemoved", inst.onClientRemoved = inst.onClientRemoved.bind(inst));
		this.plugins.add(inst);
	}
	/**
	 * Register server plugin
	 * @param {nPlugin} plugin Plugin class
	 */
	unregister(plugin) {
		for (const target in this.plugins.values()) {
			if (target.constructor === plugin) {
				target.onDestroy();
				this.off("clientAdded", target.onClientAdded);
				this.off("clientJoined", target.onClientJoined);
				this.off("clientRemoved", target.onClientRemoved);
				this.setMaxListeners(this.getMaxListeners() - 1);
				this.plugins.delete(target);
			}
		}
	}
}
export default nServer;
