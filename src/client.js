import EventEmitter from "events";
import { deflateSync, inflateSync } from "zlib";

import nLogger from "./logger.js";
import nDatastore from "./datastore.js";
import nPlayerData from "./playerData.js";

/**
 * GDTNM protocol version
 * @memberof nClient
 */
export const PROTOCOL_VERSION = 1;
/**
 * Compatible GDTMP server version
 * @memberof nClient
 */
export const LEGACY_SERVERVERSION = "1.5.5.0";
/**
 * Minimal GDTMP client version
 * @memberof nClient
 */
export const LEGACY_MINVERSION = "0.5.11";
export const LEGACY_SERVERID = 133333337;
export const LEGACY_SEPARATOR = "\xFA";
export const LEGACY_SEPARATOR2 = "\xFB";
export const LEGACY_SEPARATOR3 = "\xFC";
export const LEGACY_SEPARATOR4 = "\xFD";

/**
 * Client instance
 * 
 * - Internal events is prefixed with "@"
 * - Non-standard packet IDs are prefixed with "X"
 */
export class nClient extends EventEmitter {
	/**
	 * Client instance connected
	 * @event nClient#@open
	 * @prop {WebSocketConnection} socket
	 *//**
	 * Client joined
	 * @event nClient#@join
	 *//**
	 * Client disconnected
	 * @event nClient#@close
	 * @prop {WebSocketConnection} socket
	 *//**
	 * Recieved raw packet
	 * @event nClient#@raw
	 * @prop {Boolean} [isLegacy=true] Is packet a text
	 * @prop {String|Buffer} data Packet contents
	 *//**
	 * @prop {Number} id Session ID
	 * @prop {Number} code Authentication code
	 * @prop {Boolean} joined Is client playing (false if kicked)
	 * @prop {Boolean} legacyMode Disable GDTMP-incompatible features
	 * @prop {Set} mods Set of client mods
	 * @prop {nPlayerData} data Player game data
	 *//**
	 * Client ID request
	 * @event nClient#REQID
	 * @type {String[]}
	 * @prop {String} code
	 * @prop {String} version
	 * @prop {String} mods
	 *//**
	 * Client company info
	 * @event nClient#COMPANY
	 * @type {String[]}
	 * @prop {String} name
	 * @prop {String} boss
	 * @prop {String} cash
	 * @prop {String} fans
	 * @prop {String} rp
	 * @prop {String} week
	 * @prop {String} employees
	 * @prop {String} platformcount
	 * @prop {String} gamecount
	 * @prop {String} favouritegenre
	 * @prop {String} avgcosts
	 * @prop {String} avgincome
	 * @prop {String} avgscore
	 * @prop {String} highscore
	 * @prop {?String} meta
	 *//**
	 * [X] Client Nepethe protocol switch
	 * @event nClient#XNM
	 * @type {String[]}
	 *//**
	 * [X] Raw Nepethe protocol data
	 * @event nClient#XDAT
	 * @type {String[]}
	 * @prop {String} data Compressed JSON
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
		
		this.id = Math.ceil(Math.exp(Math.random() ** Math.random()) * 1e8);
		this.code = null;
		this.joined = false;
		this.legacyMode = true;
		
		this.mods = new Set();
		this.data = new nPlayerData();
		
		this.logger = new nLogger("client").bind(this, `[${this.id.toString(16)}]`);
		this._logger = new nLogger("socket").bind(this, `[${this.id.toString(16)}]`);
		this._socket = socket;
		
		/// onMessage
		socket.on("message", ({ type, utf8Data, binaryData }) => {
			const isLegacy = type !== "binary";
			this.emit("@raw", isLegacy, isLegacy ? utf8Data : binaryData);
			let id, data;
			if (isLegacy) {
				const fromString = (str, sep) =>
					(str = str.split(sep[0])).length > 1
						? str.map(v => (sep.shift(), fromString(v, sep)))
						: str;
				[ id, ...data ] = fromString(utf8Data, [
					LEGACY_SEPARATOR,
					LEGACY_SEPARATOR3,
					LEGACY_SEPARATOR2
				]);
			} else {
				const flags = binaryData[0];
				let data = binaryData.slice(1);
				if (flags & 0b10) { data = inflateSync(data) }
				data = JSON.parse(data);
				id = data.id;
				data = data.data;
			}
			this._logger(`Recieved data: ID = ${id}, DATA = ${data}`);
			this.emit(id, data);
		});

		/// onClose
		socket.on("close", () => {
			this.logger("Client disconnected");
			this.emit("@close");
			this._socket = null;
			this.save();
		});

		/// GDTMP
		// Standard authentication
		this.on("REQID", (data) => {
			const [ code, version, mods ] = data;
			if (data.length < 3 || version < LEGACY_MINVERSION) {
				this.kick("You're running an old version of GDTMP. Please update.");
				return;
			}
			if (Number.isNaN(code)) {
				this.kick("Your client code is invalid.");
				return;
			}
			this.code = +code;
			this.load();
			this.sendLegacy("YOURID", [ code, this.id ]);
			mods
				.filter(v => v.length === 2)
				.forEach(([id, name]) => this.mods.add({ id, name }));
		});
		// Company info update
		this.on("COMPANY", (data) => {
			if (data.length < 14) return;
			this.data.fromLegacy(data);
			if (!this.joined && data[14] === "join") {
				this.joined = true;
				this.emit("@join");
			}
		});

		/// XNM
		this.sendLegacy("XNM", PROTOCOL_VERSION);
		this.on("XNM", () => (this.legacyMode = false));

		this.emit("@open", this._socket);
	}

	/**
	 * Kicks player with message
	 * @param {?String} reason Kick message
	 * @fires nClient#@close
	 */
	kick(reason = "You've been kicked from the server.") {
		if (!this.online) return;
		this.joined = false;
		this.logger(`Kicked with reason: "${reason}"`);
		this.sendLegacy("KICK", reason);
		this._socket.close();
	}
	
	/**
	 * Sends message to client
	 * @param {Number} sender Sender ID
	 * @param {String} msg Message
	 * @param {Object} [opt={}] Message metadata
	 * @param {Boolean} [opt.priv=false] Display message as private
	 * @param {Boolean} [opt.op=false] Display sender as OP
	 *//**
	 * Sends message to client
	 * @param {String} msg Message
	 */
	sendChat(sender, msg, opt = {}) {
		if (msg === undefined) {
			msg = sender;
			sender = LEGACY_SERVERID;
		}
		msg = msg.replace(/[\xFA-\xFD]+/g, "").trim();
		if (msg === "") return;
		sendLegacy(
			opt.priv ? "PRIVMSG" : "MSG",
			(!opt.priv && opt.op) ? [msg, true] : msg,
			sender
		);
	}
	
	/**
	 * Sends JSON data to client
	 * @param {String} id Packet ID
	 * @param {*} data Serializable data
	 * @param {Object} [opts={}] Serialization options
	 * @param {?String} [opts.source=LEGACY_SERVERID] Packet sender ID
	 * @param {?Boolean} [opts.compress=true] Compress data
	 * @param {?Boolean} [opts.legacy=false] Mark packet as legacy
	 */
	send(id, data, opts = {}) {
		if (!this.online) return;
		const {
			source = LEGACY_SERVERID,
			compress = true,
			legacy = false
		} = opts;
		if (this.legacyMode && legacy) {
			return this.sendLegacy(id, JSON.stringify(data), source);
		}
		data = JSON.stringify({ id, data, source });
		if (compress) { data = deflateSync(data) }
		const flags = 0
			| (compress && 0b10)
			| (legacy && 0b100);
		if (this.legacyMode) {
			return this.sendLegacy("XDAT", String.fromCharCode(flags) + data.toString("utf8"));
		}
		this._socket.sendBinary(Buffer.from([ flags ]), data);
		this._logger(`Sent data: FLAGS = 0b${flags.toString(2)}, LENGTH = ${data.length}`);
	}

	/**
	 * Sends packet to client
	 * @param {String} id Packet ID
	 * @param {*} [data=[]] Serializable data
	 * @param {Number} [source=LEGACY_SERVERID] Packet sender ID
	 */
	sendLegacy(id, data = [], source = LEGACY_SERVERID) {
		if (!this.online) return;
		if (!this.legacyMode) {
			return this.send(id, data, { source, legacy: true });
		}
		const toString = (arr, sep) => 
			Array.isArray(arr) 
			? arr.map(v => (sep.shift(), toString(v, sep))).join(sep[0])
			: arr.toString();
		this._socket.sendUTF(
			id + toString(data, [
				LEGACY_SEPARATOR,
				LEGACY_SEPARATOR4,
				LEGACY_SEPARATOR2,
				LEGACY_SEPARATOR3
			]) + LEGACY_SEPARATOR + source.toString()
		);
		this._logger(`Sent (legacy) data: ID = ${id}, SOURCE = ${source}, DATA = ${data}`);
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
		if (data) {
			this.data = nPlayerData.fromJSON(data);
			this.sendLegacy("SAVEDATA", JSON.stringify(this.data));
		}
		this.emit("@load", this.data);
		this.logger(
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
		const result = await nDatastore.save(this.code, this.data.toJSON());
		if (!result) {
			this.sendLegacy("SAVEFAIL");
		}
		this.logger(
			(result ? "Saved player data" : "Failed to save player data")+
			` (code - ${this.code})`
		);
	}
}
export default nClient;
