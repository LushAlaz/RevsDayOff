import "./setup.js"
import { titleScene } from "./scenes/title.js";
import { leaderboardScene } from "./scenes/leaderboard.js";
import { introScene } from "./scenes/intro.js";
import "./scenes/map.js";
import "./scenes/shop.js";
import { loadSprites } from "./sprites.js";
import { loadCadetSprites } from "./objects/cadet.js";
import { loadHudSprites } from "./objects/hud.js";

loadSprites();
loadCadetSprites();
loadHudSprites();
titleScene();
leaderboardScene();
introScene();

go("title");
