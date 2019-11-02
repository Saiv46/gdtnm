import Debug from "debug";

/**
 * @extends Debug
 */
export class nLogger extends Debug {
	/**
	 * @param {String} name Be prefixed by "gdtnm:"
	 */
	constructor(name) {
		super(`gdtnm:${name}`)
	}
}
export default nLogger;