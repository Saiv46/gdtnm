import Debug from "debug";

/**
 * @extends Debug
 */
export class nLogger extends Debug {
	/**
	 * @param {?String} name
	 */
	constructor(name) {
		super(name ? `gdtnm:${name}` : "gdtnm")
	}
}
export default nLogger;