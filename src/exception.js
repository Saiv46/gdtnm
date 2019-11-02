/**
 * @extends Error
 */
export class nException extends Error {
	/**
	 * Constructs error
	 * @param {String} msg Error message
	 * @param {Error} [err=null] Parent error
	 */
	constructor(msg, err) {
		super(err ? `${msg}: ${err.message}` : msg);
		this.name = this.constructor.name;
		if (typeof Error.captureStackTrace === "function") {
			Error.captureStackTrace(this, this.constructor);
		} else { 
			this.stack = (err || new Error(msg)).stack; 
		}
	}
}
export default nException;
