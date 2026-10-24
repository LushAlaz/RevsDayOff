import "./setup.js"
import "./scenes/title.js";
import "./scenes/map.js";
import { loadSprites } from "./sprites.js";

loadSprites();

go("title");
