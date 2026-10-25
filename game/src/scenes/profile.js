// ---------------------------------------------------------------
// "Who's playing?" screen: pick a username and a display name.
// Shown the first time Play is pressed, and from the map screen with N.
// Type to fill the highlighted box; Up/Down/Tab or a click switches boxes;
// Enter moves on or saves; Esc goes back without saving.
// ---------------------------------------------------------------

import {
    profile, saveProfile, acceptsChar, finishDisplayName, profileError, usernameError, USERNAME_MAX, DISPLAY_NAME_MAX,
} from "../profile.js";

export function profileScene() {
    // next: where to go after saving; back: where Esc goes
    scene("profile", ({ next = "intro", back = "title" } = {}) => {
        setCamPos(center());
        setCursor("default");
        setBackground(rgb(31, 36, 36));
        const cream = rgb(244, 237, 214);
        const maroon = rgb(80, 0, 0);
        const values = { username: profile.username, displayName: profile.displayName };
        let active = "username";
        let error = "";

        const fields = [
            { key: "username", title: "USERNAME", y: 196, max: USERNAME_MAX,
                hint: "3-16 letters, numbers or _ . This is your player ID." },
            { key: "displayName", title: "DISPLAY NAME", y: 318, max: DISPLAY_NAME_MAX,
                hint: "Up to 20 characters, shown under your dog. Blank uses your username." },
        ];
        for (const field of fields) {
            // the box is clickable; drawing happens in the overlay below
            const box = add([rect(480, 48), pos(240, field.y), area(), opacity(0)]);
            box.onClick(() => { active = field.key; error = ""; });
            box.onHover(() => setCursor("text"));
            box.onHoverEnd(() => setCursor("default"));
        }

        function save() {
            const username = values.username;
            const displayName = finishDisplayName(values.displayName, username);
            error = profileError(username, displayName);
            if (error) {
                active = usernameError(username) ? "username" : "displayName";
                return false;
            }
            saveProfile(username, displayName);
            setCursor("default");
            go(next);
            return true;
        }

        const swap = () => { active = active === "username" ? "displayName" : "username"; error = ""; };
        // Every key on this screen goes through the browser's keydown, in the order it was typed.
        // (KAPLAY's onCharInput lowercases letters, and its key events wait for the next frame,
        // so a quick Enter + letter could land in the wrong box.)
        let leaving = false;
        function typed(event) {
            if (leaving) return;
            const { key } = event;
            if (key === "Tab") event.preventDefault(); // keep focus on the game
            if (key === "Escape") { leaving = true; setCursor("default"); go(back); return; }
            if (key === "Tab" || key === "ArrowUp" || key === "ArrowDown") { swap(); return; }
            if (key === "Backspace") { values[active] = values[active].slice(0, -1); return; }
            if (key === "Enter") {
                if (active === "username") {
                    error = usernameError(values.username);
                    if (!error) active = "displayName";
                } else if (save()) {
                    leaving = true;
                }
                return;
            }
            if (key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return;
            if (acceptsChar(active, values[active], key)) {
                values[active] += key;
                error = "";
            }
        }
        window.addEventListener("keydown", typed);
        onSceneLeave(() => window.removeEventListener("keydown", typed));

        add([z(10), {
            draw() {
                const label = (value, x, y, size, tint = cream) => drawText({
                    text: value, font: "pixel", size, pos: vec2(x, y), anchor: "center", color: tint,
                });
                label("WHO'S PLAYING?", 480, 90, 24);
                label("Pick a name before you head out on campus.", 480, 134, 8);
                for (const field of fields) {
                    const focused = active === field.key;
                    label(field.title, 480, field.y - 20, 8, focused ? rgb(255, 214, 102) : cream);
                    drawRect({ pos: vec2(240, field.y), width: 480, height: 48, radius: 6, color: rgb(24, 28, 30),
                        outline: { width: 3, color: focused ? rgb(255, 214, 102) : rgb(90, 96, 92) } });
                    // a blank display name previews the username it will fall back to
                    const blank = field.key === "displayName" && !values.displayName;
                    const shown = blank ? values.username : values[field.key];
                    const caret = focused && Math.floor(time() * 2) % 2 === 0 ? "_" : " ";
                    drawText({ text: shown + (focused && !blank ? caret : ""), font: "pixel", size: 16,
                        pos: vec2(256, field.y + 24), anchor: "left", color: blank ? rgb(120, 126, 120) : cream });
                    label(`${values[field.key].length}/${field.max}`, 690, field.y + 24, 8, rgb(150, 156, 150));
                    label(field.hint, 480, field.y + 66, 8, rgb(190, 186, 170));
                }
                if (error) label(error, 480, 430, 8, rgb(255, 120, 110));
                drawRect({ pos: vec2(360, 452), width: 240, height: 40, radius: 6, color: maroon });
                label(active === "username" ? "Enter: next" : "Enter: save and play", 480, 472, 8);
                label("Up / Down: switch box  |  Esc: back", 480, 514, 8, rgb(190, 186, 170));
            },
        }]);
    });
}
