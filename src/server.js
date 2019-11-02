import { createServer } from "http";
import EventEmitter from "events";
import WebSocket from "websocket";

import nClient, { PROTOCOL_VERSION, LEGACY_SERVERVERSION } from "./client.js";
import { nLogger } from "./logger.js";
import nNAT from "./nat.js";
import nException from "./exception.js";

const version = 1.0;

/**
 * Server instance
 */
export class nServer extends EventEmitter {
	// Configuration
	static BACKUPFOLDER = "old";
	static BANNEDIPSFILE = "bannedips.txt";
	static CLIENTSAVEFOLDER = "clients";
	static CONFIGFOLDER = "config";
	static CUSTOMSETTINGSFILE = "customsettings.txt";
	static ENABLEDEXTENSIONSFILE = "extensions.txt";
	static ENABLEDPLUGINSFILE = "plugins.txt";
	static EXTENSIONFOLDER = "extensions";
	static MINVERSION = "0.5.1";
	static OPPEDIPSFILE = "oppedips.txt";
	static PLUGINFOLDER = "plugins";
	static PRIVATESETTINGSFILE = "privatesettings.txt";
	static SERVERVERSION = "1.5.5.0";
	static SETTINGSFILE = "settings.txt";
	static STARTUPMACROFILE = "startup.txt";
	/**
	 * Default configuration
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
				motd: "GDTMP-compatible Server",
				description: "GDTMP-compatible Server",
				timesync: false,
				syncconsoles: false,
				offlineconsoles: false,
				syncconsoles: false,
				reviewbattle: false,
				serversidesave: true
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
	constructor(config) {
		super();
		/// Init variables
		this.clients = new Set();
		this.http = null;
		this.server = null;
		this.config = Object.assign(nServer.DefaultConfig, config, { version });
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
		this.logger("Initializating server...");
		const {
			origin: { host, port, keepalive },
			gameplay: { motd, description }
		} = this.config;
		if (!this.server && !this.http) {
			const server = createServer((req, res) => {
				response.writeHead(200, {"Content-Type": "application/json"});
				response.end(JSON.stringify({
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
			server.listen(port, host);
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
		
		/**
		 * CLIENT EVENT CYCLE:
		 * 
		 * clientAdded <- Connected
		 *     \|/
		 * clientJoined <- Authenticated
		 *     \|/
		 * clientRemoved <- Disconnected
		 * 
		 */
		this.server.on("connect", socket => {
			const client = new nClient(socket);
			this.emit("clientAdded", client);
			this.clients.add(client);
			
			client.on("REQID", () => {
				client.sendLegacy("SETTINGS", 
					SERVERVERSION,
					gameplay.timesync,
					gameplay.syncconsoles,
					gameplay.offlineconsoles,
					gameplay.reviewbattle,
					gameplay.serversidesave
				);
				this.emit("clientJoined", client);
			});

			client.on("@close", () => {
				this.emit("clientRemoved", client);
				this.clients.delete(client);
			});
		});
	}
}
export default nServer;
