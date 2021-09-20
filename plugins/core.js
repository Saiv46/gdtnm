import nPlugin from "../src/plugin.js";
import {
	LEGACY_MINVERSION,
	LEGACY_SERVERVERSION
} from "../src/client.js";

export default class GDTMP extends nPlugin {
	static get id() { return "gdtmp_core" }

	onClientAdded(client) {
		if (client.data.op) {
			client.sendLegacy("OPPED", true);
		}
		client.on("REQID", () => {
			const { gameplay } = this.server.config
			client.sendLegacy("SETTINGS", [
				LEGACY_SERVERVERSION,
				gameplay.timesync,
				gameplay.syncconsoles,
				gameplay.offlineconsoles,
				gameplay.reviewbattle,
				gameplay.serversidesave
			]);
		});
		client.on("POLL", () => {
			client.sendLegacy("POLLRES", [
				this.clients.size - 1,
				gameplay.cheatmodallowed,
				LEGACY_MINVERSION,
				gameplay.description,
				LEGACY_SERVERVERSION
			]);
			client.kick("poll");
		});
	}
	onClientJoined(client) {
		client.on("MSG", ([msg]) => {
			for (const player in this.server.clients) {
				player.sendChat(client.id, msg, { op: client.data.op });
			}
		});
		client.on("PRIVMSG", ([id, msg]) => {
			const player = Array.from(this.server.clients).find(v => v.id === id);
			if (!player) return;
			player.sendChat(client.id, msg, { priv: true });
		});
		
		const modlist = Array.from(
			this.server.clients,
			v => [v.id + v.mods.map(m => m.id)]
		);
		for (const player in this.server.clients) {
			player.sendLegacy("MODLIST", modlist);
		}
	}
	onClientRemoved(client) {
		for (const player in this.server.clients) {
			player.sendLegacy("DISCONN", client.id, !client.joined && "kick");
		}
	}
}