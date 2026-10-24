import "./setup.js"
import { titleScene } from "./scenes/title.js";
import { leaderboardScene } from "./scenes/leaderboard.js";
import { introScene } from "./scenes/intro.js";
import "./scenes/map.js";
import "./scenes/shop.js";
import { loadSprites } from "./sprites.js";

loadSprites();
titleScene();
leaderboardScene();
introScene();

go("title");
