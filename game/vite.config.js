import { defineConfig, loadEnv } from "vite";
import { fileURLToPath } from "node:url";

const gameEnvDir = fileURLToPath(new URL(".", import.meta.url));

const kaplayCongrats = () => {
    return {
        name: "vite-plugin-kaplay-hello",
        buildEnd() {
            const line =
                "---------------------------------------------------------";
            const msg = `🦖 Awesome pal! Send your game to us:\n\n💎 Discord: https://discord.com/invite/aQ6RuQm3TF \n💖 Donate to KAPLAY: https://opencollective.com/kaplay\n\ (you can disable this msg on vite.config)`;

            process.stdout.write(`\n${line}\n${msg}\n${line}\n`);
        },
    };
};

export default defineConfig(({ mode }) => ({
    envDir: gameEnvDir,
    define: {
        "import.meta.env.NEXT_PUBLIC_NETWORK_SERVER_DOMAIN": JSON.stringify(
            loadEnv(mode, gameEnvDir, "NEXT_PUBLIC_NETWORK_SERVER_DOMAIN").NEXT_PUBLIC_NETWORK_SERVER_DOMAIN || "",
        ),
    },
    // index.html out file will start with a relative path for script
    base: "./",
    server: {
        port: 3000,
    },
    build: {
        // disable this for low bundle sizes
        sourcemap: true,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (/[\\/]node_modules[\\/]kaplay[\\/]/.test(id)) {
                        return "kaplay";
                    }
                },
            },
        },
    },
    plugins: [
        // Disable messages removing this line
        kaplayCongrats(),
    ],
}));
