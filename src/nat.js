import { promisify } from "util";
import NatUpnp from "nat-upnp";
import nLogger from "./logger.js";

/**
 * NAT-UPnP interface
 */
export class nNAT {
	/**
	 * Fetch current IP address
	 */
	async getIp() {
		const ip = await promisify(this.client.externalIp)();
		this.logger(`Fetched IP: ${ip}`);
		return ip;
	}
	/**
	 * Map port using UPnP
	 * @param {Number} [port=random(100, 65535)] 
	 */
	async map(port = Math.floor(100 + Math.random() * 65435)) {
		this.port = port;
		this.cachedIp = null;
		await promisify(this.client.portMapping)({
			public: port,
			private: port,
			ttl: 10
		});
		this.logger(`Mapped port ${port}:${port}`);
	}
	/**
	 * Unmap current port
	 */
	async unmap() {
		if (!this.port) return;
		const port = this.port;
		this.cachedIp = null;
		await promisify(this.client.portUnmapping)({ public: port });
		this.logger(`Unmapped public port ${port}`);
	}
	/**
	 * @prop {?Number} port
	 */
	constructor() {
		this.client = NatUpnp.createClient();
		this.port = null;
		this.cachedIp = null;
		this.logger = new nLogger("nat");
	}
}
export default nNAT;
