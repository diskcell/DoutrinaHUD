var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express4 = __toESM(require("express"), 1);
var import_http = __toESM(require("http"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_socket = require("socket.io");
var import_vite = require("vite");

// database/index.ts
var import_better_sqlite3 = __toESM(require("better-sqlite3"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var dbPath = import_path.default.join(process.cwd(), "database");
if (!import_fs.default.existsSync(dbPath)) {
  import_fs.default.mkdirSync(dbPath, { recursive: true });
}
var db = new import_better_sqlite3.default(import_path.default.join(dbPath, "doutrina.db"), {
  verbose: console.log
});
db.pragma("journal_mode = WAL");
function initializeSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      logo TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER,
      nickname TEXT NOT NULL,
      real_name TEXT,
      role TEXT,
      FOREIGN KEY (team_id) REFERENCES teams(id)
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_home_id INTEGER,
      team_away_id INTEGER,
      score_home INTEGER DEFAULT 0,
      score_away INTEGER DEFAULT 0,
      map TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_home_id) REFERENCES teams(id),
      FOREIGN KEY (team_away_id) REFERENCES teams(id)
    );
  `);
  const addColumn = (table, column, type) => {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`);
    } catch (e) {
      if (!e.message.includes("duplicate column name")) {
        console.warn(`Could not add column ${column} to ${table}:`, e.message);
      }
    }
  };
  addColumn("teams", "tag", "TEXT");
  addColumn("teams", "country", "TEXT");
  addColumn("teams", "organization", "TEXT");
  addColumn("teams", "social_links", "TEXT");
  addColumn("teams", "status", 'TEXT DEFAULT "active"');
}

// backend/routes/api.ts
var import_express3 = require("express");

// backend/routes/teams.ts
var import_express = require("express");
var router = (0, import_express.Router)();
router.get("/", (req, res) => {
  try {
    const teams = db.prepare("SELECT * FROM teams ORDER BY created_at DESC").all();
    res.json(teams);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar times" });
  }
});
router.post("/", (req, res) => {
  try {
    const { name, tag, logo, country, organization, social_links, status } = req.body;
    const socialLinksStr = typeof social_links === "object" ? JSON.stringify(social_links) : social_links;
    const stmt = db.prepare(`
      INSERT INTO teams (name, tag, logo, country, organization, social_links, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      name || "",
      tag || "",
      logo || "",
      country || "",
      organization || "",
      socialLinksStr || "",
      status || "active"
    );
    res.json({ id: info.lastInsertRowid, success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao criar time" });
  }
});
router.put("/:id", (req, res) => {
  try {
    const { name, tag, logo, country, organization, social_links, status } = req.body;
    const { id } = req.params;
    const socialLinksStr = typeof social_links === "object" ? JSON.stringify(social_links) : social_links;
    const stmt = db.prepare(`
      UPDATE teams 
      SET name = ?, tag = ?, logo = ?, country = ?, organization = ?, social_links = ?, status = ?
      WHERE id = ?
    `);
    stmt.run(
      name || "",
      tag || "",
      logo || "",
      country || "",
      organization || "",
      socialLinksStr || "",
      status || "active",
      id
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao atualizar time" });
  }
});
router.delete("/:id", (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare("DELETE FROM teams WHERE id = ?");
    stmt.run(id);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao deletar time" });
  }
});
var teams_default = router;

// backend/routes/gsi.ts
var import_express2 = require("express");

// backend/socket/gsiEmitter.ts
var import_events = require("events");
var GSIEmitter = class extends import_events.EventEmitter {
};
var gsiEmitter = new GSIEmitter();

// backend/routes/gsi.ts
var router2 = (0, import_express2.Router)();
router2.post("/", (req, res) => {
  try {
    const data = req.body;
    if (data && data.provider && data.provider.appid === 730) {
      gsiEmitter.emit("gsi:update", data);
    }
    res.status(200).send("OK");
  } catch (error) {
    console.error("Erro ao processar GSI:", error);
    res.status(500).send("Error");
  }
});
var gsi_default = router2;

// backend/routes/api.ts
var router3 = (0, import_express3.Router)();
router3.get("/health", (req, res) => {
  res.json({ status: "ok", message: "DoutrinaHUD API rodando" });
});
router3.get("/stats", (req, res) => {
  try {
    const teamsCount = db.prepare("SELECT COUNT(*) as count FROM teams").get();
    const playersCount = db.prepare("SELECT COUNT(*) as count FROM players").get();
    const matchesCount = db.prepare('SELECT COUNT(*) as count FROM matches WHERE status = "active"').get();
    res.json({
      teams: teamsCount.count,
      players: playersCount.count,
      activeMatches: matchesCount.count
    });
  } catch (error) {
    res.json({ teams: 0, players: 0, activeMatches: 0 });
  }
});
router3.use("/teams", teams_default);
router3.use("/gsi", gsi_default);
var api_default = router3;

// backend/socket/handlers.ts
var latestHudState = null;
var latestGsiData = null;
function setupSocket(io) {
  gsiEmitter.on("gsi:update", (data) => {
    latestGsiData = data;
    io.emit("gsi:update", data);
  });
  io.on("connection", (socket) => {
    console.log("Novo cliente conectado:", socket.id);
    socket.on("overlay:ready", () => {
      console.log("Overlay inicializado no cliente", socket.id);
      socket.emit("hud:update", latestHudState || { message: "Bem-vindo ao DoutrinaHUD" });
      if (latestGsiData) {
        socket.emit("gsi:update", latestGsiData);
      }
    });
    socket.on("hud:command", (command) => {
      console.log("Comando recebido do painel");
      latestHudState = command;
      io.emit("hud:update", command);
    });
    socket.on("disconnect", () => {
      console.log("Cliente desconectado:", socket.id);
    });
  });
}

// server.ts
async function startServer() {
  const app = (0, import_express4.default)();
  const server = import_http.default.createServer(app);
  const io = new import_socket.Server(server, {
    cors: { origin: "*" }
  });
  const PORT = 3e3;
  initializeSchema();
  app.use(import_express4.default.json());
  app.use("/api", api_default);
  setupSocket(io);
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path2.default.join(process.cwd(), "dist");
    app.use(import_express4.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path2.default.join(distPath, "index.html"));
    });
  }
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`DoutrinaHUD Server rodando na porta ${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
