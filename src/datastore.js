const inMemory = {};

/**
 * In-memory datastore
 */
export class nDataStore {
	/**
	 * Loads data
	 * @param {String} id 
	 * @returns {?Object}
	 */
	static async load(id) {
		return inMemory[id];
	}
	/**
	 * Saves data
	 * @param {String} id 
	 * @param {Object} data 
	 */
	static async save(id, data) {
		inMemory[id] = data;
	}
}
export default nDataStore;
