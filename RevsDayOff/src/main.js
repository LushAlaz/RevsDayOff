import kaplay from "kaplay";
import "kaplay/global"; // uncomment if you want to use without the k. prefix

kaplay();

// loadRoot("./public/"); // A good idea for Itch.io publishing later
loadSprite("bean", "sprites/bean.png");

const SPD = 300


let player = add([
    pos(120, 80),
    sprite("bean")
]);

onKeyDown("left", () => {
    player.move(-SPD, 0);
});

onKeyDown("right", () => {
    player.move(SPD, 0);
});

onKeyDown("up", () => {
    player.move(0, -SPD);
});

onKeyDown("down", () => {
    player.move(0, SPD);
});

onClick(() => addKaboom(mousePos()));