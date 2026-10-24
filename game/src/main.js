import "./setup.js"
import "./scenes/title.js";
import "./scenes/map.js";

function loadSprites() {
    loadSprite("bean", "sprites/bean.png");
    // loadSprite("mark", "sprites/mark.png"); // mark.png doesn't exist yet
}

loadSprites();

go("title");
