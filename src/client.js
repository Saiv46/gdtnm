import EventEmitter from "events";
import { deflateSync, inflateSync } from "zlib";

import nLogger from "./logger.js";
import nDatastore from "./datastore.js";

/**
 * GDTNM protocol version
 * @memberof nClient
 */
export const PROTOCOL_VERSION = 1;
/**
 * Compatible GDTMP version
 * @memberof nClient
 */
export const LEGACY_SERVERVERSION = "1.5.5.0";
export const LEGACY_SERVERID = "133333337";
export const LEGACY_SEPARATOR = "\xFA";
export const LEGACY_SEPARATOR2 = "\xFB";
export const LEGACY_SEPARATOR3 = "\xFC";
export const LEGACY_SEPARATOR4 = "\xFD";

/**
 * Stores and serializes player data
 */
export class nPlayerData {
	/**
	 * @prop {Number} [AvgCosts=-1]
	 * @prop {Number} [AvgIncome=-1]
	 * @prop {Number} [AvgScore=-1]
	 * @prop {Object} [Boss=null]
	 * @prop {Number} [Cash=-1]
	 * @prop {Number} [CurrentWeek=-1]
	 * @prop {Number} [Employees=-1]
	 * @prop {Number} [Fans=-1]
	 * @prop {String} [FavouriteGenre=null]
	 * @prop {Number} [GameCount=-1]
	 * @prop {Number} [HighScore=-1]
	 * @prop {Number} [PlatformCount=-1]
	 * @prop {Number} [ResearchPoints=-1]
	 * @prop {Boolean} [Op=false]
	 * @prop {String} [Name=null]
	 */
	constructor() {
		// Default variables from GDTMP
		this.AvgCosts = -1;
		this.AvgIncome = -1;
		this.AvgScore = -1;
		this.Boss = null;
		this.Cash = -1;
		this.CurrentWeek = -1;
		this.Employees = -1;
		this.Fans = -1;
		this.FavouriteGenre = null;
		this.GameCount = -1;
		this.HighScore = -1;
		this.PlatformCount = -1;
		this.ResearchPoints = -1;
		this.Op = false;
		this.Name = null;
	}
	/**
	 * Serialize to JSON
	 * @returns {Object}
	 */
	toJSON() { return Object.assign({}, this) }
	/**
	 * Unserialize from JSON 
	 * @param {Object} data Unserialized object
	 * @returns {nPlayerData}
	 */
	static fromJSON(data) { return Object.assign(new nPlayerData, data) }
}

/**
 * Client instance
 */
export class nClient extends EventEmitter {
	/**
	 * Fires when instance ready
	 * @event nClient#@open
	 * @prop {WebSocketConnection} socket
	 *//**
	 * Fires on socket d1isconnect
	 * @event nClient#@close
	 * @prop {WebSocketConnection} socket
	 *//**
	 * @prop {Number} id Session ID
	 * @prop {Number} code Authentication code
	 * @prop {Boolean} legacyMode Disable GDTMP-incompatible features
	 * @prop {Set} mods Set of client mods
	 * @prop {nPlayerData} data Player game data
	 *//**
	 * @event nClient#REQID
	 * @type {String[]}
	 * @prop {String} code
	 * @prop {String} version
	 * @prop {String} mods
	 */
	/**
	 * Client IP address
	 * @type {?String}
	 */
	get ip() { return this._socket && this._socket.remoteAddress }
	/**
	 * Is client online
	 * @type {Boolean}
	 */
	get online() { return !!this._socket }
	/**
	 * Constructs and initializes client instance
	 * @param {WebSocketClient} socket 
	 * @fires nClient#@open
	 */
	constructor(socket) {
		super();
		
		this.id = Math.ceil(Math.exp(Math.random() ** Math.random()) * 1e14);
		this.code = null;
		this.legacyMode = true;
		
		this.mods = new Set();
		this.data = new nPlayerData();
		
		this.logger = new nLogger("client");
		this._logger = new nLogger("socket");
		this._socket = socket;
		
		/// onMessage
		socket.on("message", ({ type, utf8Data, binaryData }) => {
			this._logger(`[${this.id.toString(16)}] Recieved ${binaryData ? binaryData.length : utf8Data.length} length data`);
			this.emit("@raw", utf8Data, binaryData);
			if (type === "binary") {
				const { id = "XDAT", ...data } = JSON.parse(inflateSync(binaryData));
				this.emit(id, data);
			} else {
				const [ id, ...arr ] = utf8Data.split(LEGACY_SEPARATOR);
				this.emit(id, arr);
			}
		});

		/// onClose
		socket.on("close", () => {
			this.logger(`[${this.id.toString(16)}] Client disconnected`);
			this.emit("@close");
			this._socket = null;
			this.save();
		});

		/// GDTMP
		// Standard authentication
		this.on("REQID", (data) => {
			const [ code, version, mods ] = data;
			if (data.length < 3 || version < LEGACY_SERVERVERSION) {
				this.kick("You're running an old version of GDTMP. Please update.");
				return;
			}
			if (Number.isNaN(code)) {
				this.kick("Your client code is invalid.");
				return;
			}
			this.code = +code;
			this.load();
			this.sendLegacy("YOURID", code, this.id, LEGACY_SERVERID);
			for (const modEntry in mods.split(LEGACY_SEPERATOR3).filter(String)) {
				const [id, name] = modEntry.map(v => v.split(LEGACY_SEPARATOR2));
				if (id && name) this.mods.add({ id, name });
			}
		});

		/// XNM
		// Non-standard packets ID prefixed with "X"
		this.sendLegacy("XNM", PROTOCOL_VERSION);
		this.on("XNM", ([proto]) => {
			if (PROTOCOL_VERSION > +proto) {
				this.sendChat(`Outdated GDTNM protocol version, server running on ${PROTOCOL_VERSION}.`);
			} else if((+proto).toFixed() > PROTOCOL_VERSION.toFixed()) {
				this.sendChat(`Incompatible GDTNM protocol version, server still on ${PROTOCOL_VERSION}.`);
			} else {
				this.legacyMode = false;
			}
		});

		this.emit("@open", this._socket);
	}

	/**
	 * Kicks player with message
	 * @param {?String} reason Kick message
	 * @fires nClient#@close
	 */
	kick(reason = "You've been kicked from the server.") {
		if (!this.online) return;
		this.logger(`Client ${this.ip} (${this.id}) kicked with reason "${reason}"`);
		this.sendLegacy("KICK", reason, LEGACY_SERVERID);
		this._socket.close();
	}
	
	/**
	 * Sends message to client
	 * @param {String} sender Sender name
	 * @param {String} msg Message
	 *//**
	 * Sends message to client
	 * @param {String} msg Message
	 */
	sendChat(sender, msg) {
		msg = (msg ? (sender ? `<${sender}> ${msg}` : msg) : sender).trim();
		sendLegacy("MSG", msg);
	}
	
	/**
	 * Sends JSON data to client
	 * @param {Object} data JSON-serializable data
	 */
	send(data) {
		if (!this.online) return;
		data = JSON.stringify(data);
		if (this.legacyMode) {
			return this.sendLegacy("XDAT", data);
		}
		this._logger(`Sent data JSON: ${data}`);
		this._socket.sendBinary(deflateSync(data));
	}

	/**
	 * Sends packet to client
	 * @param {String} id Packet ID
	 * @param {Array.<String|Number|Boolean>} data Serialized data
	 */
	sendLegacy(id, ...data) {
		if (!this.online || !id) return;
		if (!this.legacyMode) {
			return this.send({ id, data });
		}
		data.push(LEGACY_SERVERID);
		this._logger(`Sent (legacy) data: ID = ${id}, DATA = ${data}`);
		this._socket.sendUTF(
			id + data
			.map(v => v.toString().replace(/\xFA/g, '\\xFA'))
			.join(LEGACY_SEPARATOR)
		);
	}
	
	/**
	 * Loads player data
	 * @fires nClient#@load
	 *//**
	 * Fires when player data being loaded
	 * @event nClient#@load
	 * @prop {nPlayerData} data Player data
	 */
	async load() {
		if (!this.code) return;
		const data = await nDatastore.load(this.code);
		if (data) this.data = nPlayerData.fromJSON(data);
		this.emit("@load", this.data);
		this.logger(
			`[${this.id.toString(16)}] `+
			(data ? "Loaded player data" : "No player data found")+
			` (code - ${this.code})`
		);
	}

	/**
	 * Saves player data
	 * @fires nClient#@save
	 *//**
	 * Fires when player data being saved
	 * @event nClient#@save
	 * @prop {nPlayerData} data Player data
	 */
	async save() {
		if (!this.code) return;
		this.emit("@save", this.data);
		this.logger(
			`[${this.id.toString(16)}] `+
			(
				await nDatastore.save(this.code, this.data.toJSON())
				? "Saved player data"
				: "Failed to save player data"
			)+
			` (code - ${this.code})`
		);
	}
}
export default nClient;
