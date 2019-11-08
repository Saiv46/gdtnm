import nPlugin from "../src/plugin.js";

export default class GDTMP extends nPlugin {
	static get id() { return "gdtmp_core" }

	onClientAdded(client) {
		if (client.data.op) {
			client.sendLegacy("OPPED", true);
		}
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