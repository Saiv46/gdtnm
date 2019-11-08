const typeDef = {
	name: String,
	boss: String,
	cash: Number,
	fans: Number,
	researchPoints: Number,
	week: Number,
	employees: Number,
	platformCount: Number,
	gameCount: Number,
	favouriteGenre: String,
	avgCosts: Number,
	avgIncome: Number,
	avgScore: Number,
	highScore: Number
};

/**
 * Stores and serializes player data
 */
export class nPlayerData {
	/**
	 * @prop {Number} [avgCosts=-1]
	 * @prop {Number} [avgIncome=-1]
	 * @prop {Number} [avgScore=-1]
	 * @prop {String} [boss=""]
	 * @prop {Number} [cash=-1]
	 * @prop {Number} [currentWeek=-1]
	 * @prop {Number} [employees=-1]
	 * @prop {Number} [fans=-1]
	 * @prop {String} [favouriteGenre=""]
	 * @prop {Number} [gameCount=-1]
	 * @prop {Number} [highScore=-1]
	 * @prop {Number} [platformCount=-1]
	 * @prop {Number} [researchPoints=-1]
	 * @prop {Boolean} [op=false]
	 * @prop {String} [name=""]
	 */
	constructor() {
		// Default variables from GDTMP
		this.avgCosts = -1;
		this.avgIncome = -1;
		this.avgScore = -1;
		this.boss = "";
		this.cash = -1;
		this.currentWeek = -1;
		this.employees = -1;
		this.fans = -1;
		this.favouriteGenre = "";
		this.gameCount = -1;
		this.highScore = -1;
		this.platformCount = -1;
		this.researchPoints = -1;
		this.op = false;
		this.name = "";
	}
	/**
	 * Serialize to JSON
	 * @returns {Object}
	 */
	toJSON() { return Object.assign({}, this) }
	/**
	 * Serialize to legacy packet
	 * @returns {Array}
	 */
	toLegacy() {
		return Object.keys(typeDef).map(k => this[k].toString());
	}
	/**
	 * Update from legacy packet
	 * @param {Array} data Unserialized array
	 */
	fromLegacy(data) {
		Object.entries(typeDef)
			.forEach(([k, t], i) => (this[k] = t(data[i])));
		return this;
	}
	/**
	 * Unserialize from JSON 
	 * @param {Object} data Unserialized object
	 * @returns {nPlayerData}
	 */
	static fromJSON(data) { return Object.assign(new nPlayerData, data) }
	/**
	 * Unserialize from legacy packet 
	 * @param {Array} data Unserialized array
	 * @returns {nPlayerData}
	 */
	static fromLegacy(data) { return new nPlayerData().fromLegacy(data) }
}

export default nPlayerData;