import kaplay from "kaplay";
import "kaplay/global";
import { titleScene } from "./scenes/title.js";
import { mapSelectScene } from "./scenes/map.js";

kaplay();

function loadSprites() {
    loadSprite("bean", "sprites/bean.png");
    // loadSprite("mark", "sprites/mark.png"); // mark.png doesn't exist yet
}

// loadRoot("./public/"); // A good idea for Itch.io publishing later

loadSprites();

titleScene();
mapSelectScene();

go("title");
