import { promisify } from "util";
import { readFile, writeFile } from "fs";

class FileStore {
	constructor(name) {
		this.filename = name;
		this.data = {};
	}
	async load() {
		try {
			this.data = JSON.parse(await promisify(readFile)(this.filename, "utf8"));
			return true;
		} catch (e) {
			if (e.code === "ENOENT") {
				await this.save();
				return false;
			}
			throw e;
		}
	}
	async save() {
		await promisify(writeFile)(this.filename, JSON.stringify(this.data), "utf8");
		return true;
	}
}
const inst = new FileStore("./playerData.json");
let loaded = false;
inst.load().then(() => { loaded = true });

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
		if (!loaded) await inst.load();
		return inst.data[id];
	}
	/**
	 * Saves data
	 * @param {String} id 
	 * @param {Object} data 
	 */
	static async save(id, data) {
		inst.data[id] = data;
		return await inst.save();
	}
}
export default nDataStore;
