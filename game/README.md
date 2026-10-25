# /game
Directory for the frontend, built with KAPLAY.js

Coins, bag contents, and intro status are saved in browser `localStorage` and
survive closing and reopening the game. Play preserves saved coins and the bag.
Existing coin balances in `sessionStorage` migrate automatically when no local
balance exists. If storage is unavailable, progress stays in memory for the
current page only.
