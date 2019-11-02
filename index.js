import { readFileSync } from "fs";
import nServer from "./src/server.js";
const config = JSON.parse(readFileSync("./config.json"));
const inst = new nServer(config);
inst.init().then(() => console.log("Done!"));