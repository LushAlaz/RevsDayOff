import kaplay from "kaplay";
import "kaplay/global";

// Scale a stable play area with the window without clipping the player or UI.
kaplay({ width: 960, height: 540, letterbox: true })
loadRoot("./")
