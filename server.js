// 2026-09-21 08:20, Plesk/Passenger startup file: launches Next.js in production (run `npm run build` first)
const { createServer } = require("http");
const next = require("next");

const port = parseInt(process.env.PORT || "3000", 10);
const app = next({ dev: false });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => handle(req, res)).listen(port);
  console.log(`> djservicepacks listening on port ${port}`);
});
