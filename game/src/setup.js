import kaplay from "kaplay";
import "kaplay/global";

// Scale a stable play area with the window without clipping the player or UI.
// crisp + nearest keep the pixel art sharp instead of blurry when scaled up.
kaplay({ width: 960, height: 540, letterbox: true, crisp: true, texFilter: "nearest" })
loadRoot("./")
