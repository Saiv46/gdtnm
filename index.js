import { readFileSync } from "fs";
import nServer from "./src/server.js";
import nLogger from "./src/logger.js";

import GDTMP from "./plugins/core.js";
const plugins = [ GDTMP ];
const logger = new nLogger();
const inst = new nServer();

(async () => {
	logger("Starting...");
	inst.config = JSON.parse(readFileSync("./config.json"));
	await inst.init();
	logger("Registering plugins");
	plugins.forEach(v => inst.register(v));
	logger("Done!");
})()

process.on("SIGINT", async () => {
	logger("Stopping...");
	try {
		await inst.stop();
		logger("Unregistering plugins");
		plugins.forEach(v => inst.unregister(v));
		logger("Done!")
		process.exit(0);
	} catch (e) {
		logger("Failed to stop server properly", e);
		process.exit(0);
	}
});