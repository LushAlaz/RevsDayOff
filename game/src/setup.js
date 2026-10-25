import kaplay from "kaplay";
import "kaplay/global";

// Scale a stable play area with the window without clipping the player or UI.
// crisp + nearest keep the pixel art sharp instead of blurry when scaled up.
kaplay({ width: 960, height: 540, letterbox: true, font: "pixel", crisp: true, texFilter: "nearest" })
loadRoot("./")

// Share the intro font across every scene and HUD.
// Use text sizes in multiples of 8 so nearest filtering preserves even pixel strokes.
loadFont("pixel", "fonts/press-start-2p.woff2", { size: 8, filter: "nearest" });
