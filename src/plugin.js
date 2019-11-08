/**
 * All third-party plugins must extend this class
 */
export class nPlugin {
	/** @type {String} */
	static get id() { return "base_plugin" }

	/**
	 * @constructor
	 * @param {nServer} server Server instance
	 */
	constructor(server) {
		this.server = server;
	}

	/**
	 * Called on client connect
	 * @param {nClient} client
	 */
	onClientAdded(client) {}
	/** 
	 * Called on client join
	 * @param {nClient} client
	*/
	onClientJoined(client) {}
	/** 
	 * Called on client disconnect
	 * @param {nClient} client
	*/
	onClientRemoved(client) {}
	/** 
	 * Called on plugin de-registration
	 * This method should clean up event listeners and free some memory.
	 */
	onDestroy() {}
	/** @param {Object} data JSON object */
	fromJSON(data) {}
	/** @param {String} data JSON string */
	fromString(data) { return this.fromJSON(JSON.parse(data)) }
	/** @returns {Object} JSON object */
	toJSON() { return {} }
	/** @returns {String} JSON string */
	toString() { return JSON.stringify(this) }
}
export default nPlugin;
