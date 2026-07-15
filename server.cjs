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
var import_express8 = __toESM(require("express"), 1);
var import_http = __toESM(require("http"), 1);
var import_path5 = __toESM(require("path"), 1);
var import_socket = require("socket.io");
var import_vite = require("vite");

// backend/routes/api.ts
var import_express7 = require("express");

// backend/routes/teams.ts
var import_express = require("express");

// backend/database/index.ts
var import_better_sqlite3 = __toESM(require("better-sqlite3"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var DB_DIR = import_path.default.join(process.cwd(), "database");
if (!import_fs.default.existsSync(DB_DIR)) {
  import_fs.default.mkdirSync(DB_DIR);
}
var db = new import_better_sqlite3.default(import_path.default.join(DB_DIR, "doutrina.db"));
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");
function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  const exists = columns.some((item) => item.name === column);
  if (!exists) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}
function initDatabase() {
  console.log("[Database] Inicializando tabelas...");
  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      tag TEXT,
      logo_url TEXT,
      country TEXT,
      color TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY,
      nickname TEXT NOT NULL,
      real_name TEXT,
      steam_id TEXT,
      avatar_url TEXT,
      team_id INTEGER,
      role TEXT,
      country TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      left_team_id INTEGER,
      right_team_id INTEGER,
      format TEXT DEFAULT 'BO3',
      stage TEXT,
      status TEXT DEFAULT 'setup',
      current_map TEXT,
      auto_mode INTEGER DEFAULT 1,
      score_home INTEGER DEFAULT 0,
      score_away INTEGER DEFAULT 0,
      score_series_home INTEGER DEFAULT 0,
      score_series_away INTEGER DEFAULT 0,
      side_home TEXT DEFAULT 'CT',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (left_team_id) REFERENCES teams(id),
      FOREIGN KEY (right_team_id) REFERENCES teams(id)
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS live_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      state_json TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS overlay_models (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      component_key TEXT NOT NULL,
      route_path TEXT NOT NULL,
      preview_label TEXT,
      config_json TEXT NOT NULL,
      is_active INTEGER DEFAULT 0,
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.exec(`
    INSERT INTO overlay_models (
      id,
      name,
      description,
      component_key,
      route_path,
      preview_label,
      config_json,
      is_active,
      is_default
    )
    SELECT
      'professional_v1',
      'DOUTRINA HUD Atual',
      'Modelo atual da overlay principal com radar, pain\xE9is laterais, jogador observado, economia, placar, banners de round e final da partida.',
      'professional_v1',
      '/overlay/professional',
      'Modelo atual',
      '{"layout":"professional","version":1,"features":["scoreboard","radar","player_panels","observed_player","economy","bomb_state","clutch","round_end","match_end","series_strip"]}',
      1,
      1
    WHERE NOT EXISTS (
      SELECT 1 FROM overlay_models WHERE id = 'professional_v1'
    )
  `);
  db.exec(`
    INSERT INTO overlay_models (
      id,
      name,
      description,
      component_key,
      route_path,
      preview_label,
      config_json,
      is_active,
      is_default
    )
    SELECT
      'broadcast_v1',
      'Broadcast Arena',
      'Modelo inspirado em HUDs de campeonato, com placar central compacto, \xE1rea de patrocinador, cards inferiores e o mesmo radar da HUD principal.',
      'broadcast_v1',
      '/overlay/broadcast',
      'Broadcast',
      '{"layout":"broadcast","version":1,"features":["scoreboard","radar","player_dock","observed_player","sponsor_area","bomb_state","clutch","round_end","match_end"]}',
      0,
      0
    WHERE NOT EXISTS (
      SELECT 1 FROM overlay_models WHERE id = 'broadcast_v1'
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS veto_sessions (
      id TEXT PRIMARY KEY,
      match_id TEXT,
      format TEXT,
      status TEXT,
      left_team_id INTEGER,
      right_team_id INTEGER,
      left_token TEXT,
      right_token TEXT,
      left_ready INTEGER DEFAULT 0,
      right_ready INTEGER DEFAULT 0,
      left_connected INTEGER DEFAULT 0,
      right_connected INTEGER DEFAULT 0,
      current_step_index INTEGER DEFAULT 0,
      current_turn TEXT,
      is_finished INTEGER DEFAULT 0,
      available_maps_json TEXT,
      active_map_pool_json TEXT,
      flow_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
      FOREIGN KEY (left_team_id) REFERENCES teams(id),
      FOREIGN KEY (right_team_id) REFERENCES teams(id)
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS veto_actions (
      id TEXT PRIMARY KEY,
      veto_session_id TEXT,
      step_index INTEGER,
      action TEXT,
      team_side TEXT,
      map_name TEXT,
      map_names_json TEXT,
      map_number INTEGER,
      starting_side TEXT,
      side_choice_by TEXT,
      timestamp INTEGER,
      FOREIGN KEY (veto_session_id) REFERENCES veto_sessions(id) ON DELETE CASCADE
    )
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS selected_maps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      veto_session_id TEXT,
      map_name TEXT,
      map_number INTEGER,
      picked_by TEXT,
      side_choice_by TEXT,
      starting_side TEXT,
      FOREIGN KEY (veto_session_id) REFERENCES veto_sessions(id) ON DELETE CASCADE
    )
  `);
  ensureColumn("teams", "hltv_url", "TEXT");
  ensureColumn("teams", "hltv_team_id", "TEXT");
  ensureColumn("teams", "hltv_synced_at", "DATETIME");
  ensureColumn("players", "hltv_player_id", "TEXT");
  ensureColumn("players", "hltv_profile_url", "TEXT");
  ensureColumn("players", "avatar_source", "TEXT");
  ensureColumn("players", "hltv_synced_at", "DATETIME");
  console.log("[Database] Tabelas prontas.");
}
var database_default = db;

// backend/database/repositories/teamRepository.ts
var teamRepository = {
  getAll: () => {
    const teams = database_default.prepare("SELECT * FROM teams ORDER BY name ASC").all();
    return teams.map((t) => ({
      ...t,
      logo: t.logo_url
    }));
  },
  getById: (id) => {
    const team = database_default.prepare("SELECT * FROM teams WHERE id = ?").get(id);
    if (!team) return null;
    return {
      ...team,
      logo: team.logo_url
    };
  },
  create: (team) => {
    const { id, name, tag, logo, country, color, hltv_url, hltv_team_id } = team;
    const stmt = database_default.prepare(`
      INSERT INTO teams (id, name, tag, logo_url, country, color, hltv_url, hltv_team_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(id, name, tag, logo, country, color, hltv_url || null, hltv_team_id || null);
  },
  update: (id, team) => {
    const { name, tag, logo, country, color, hltv_url, hltv_team_id } = team;
    const stmt = database_default.prepare(`
      UPDATE teams 
      SET name = ?, tag = ?, logo_url = ?, country = ?, color = ?, hltv_url = ?, hltv_team_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    return stmt.run(name, tag, logo, country, color, hltv_url || null, hltv_team_id || null, id);
  },
  markHltvSynced: (id, hltvUrl, hltvTeamId) => {
    return database_default.prepare(`
      UPDATE teams
      SET hltv_url = ?, hltv_team_id = ?, hltv_synced_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(hltvUrl, hltvTeamId || null, id);
  },
  delete: (id) => {
    return database_default.prepare("DELETE FROM teams WHERE id = ?").run(id);
  }
};

// backend/dataService.ts
var import_fs2 = __toESM(require("fs"), 1);
var import_path2 = __toESM(require("path"), 1);
var DATA_DIR = import_path2.default.join(process.cwd(), "data");
var TEAMS_FILE = import_path2.default.join(DATA_DIR, "teams.json");
var PLAYERS_FILE = import_path2.default.join(DATA_DIR, "players.json");
var ensureFile = (file) => {
  if (!import_fs2.default.existsSync(file)) {
    import_fs2.default.writeFileSync(file, JSON.stringify([]));
  }
};
var getTeams = () => {
  ensureFile(TEAMS_FILE);
  return JSON.parse(import_fs2.default.readFileSync(TEAMS_FILE, "utf-8"));
};
var getPlayers = () => {
  ensureFile(PLAYERS_FILE);
  return JSON.parse(import_fs2.default.readFileSync(PLAYERS_FILE, "utf-8"));
};
var saveImage = (base64Data, prefix) => {
  if (!base64Data || !base64Data.startsWith("data:image")) return base64Data;
  try {
    const matches = base64Data.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
    if (!matches) return base64Data;
    const extension = matches[1] === "svg+xml" ? "svg" : matches[1];
    const data = matches[2];
    const buffer = Buffer.from(data, "base64");
    const filename = `${prefix}_${Date.now()}.${extension}`;
    const filePath = import_path2.default.join(process.cwd(), "public", "uploads", filename);
    import_fs2.default.writeFileSync(filePath, buffer);
    return `/uploads/${filename}`;
  } catch (e) {
    console.error("Error saving image:", e);
    return base64Data;
  }
};

// backend/routes/teams.ts
var router = (0, import_express.Router)();
router.get("/", (req, res) => {
  res.json(teamRepository.getAll());
});
router.post("/", (req, res) => {
  const newTeam = {
    ...req.body,
    id: Date.now(),
    logo: saveImage(req.body.logo, "team")
  };
  teamRepository.create(newTeam);
  res.json({ id: newTeam.id, success: true });
});
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const logo = req.body.logo.startsWith("data:image") ? saveImage(req.body.logo, "team") : req.body.logo;
  teamRepository.update(Number(id), { ...req.body, logo });
  res.json({ success: true });
});
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  teamRepository.delete(Number(id));
  res.json({ success: true });
});
var teams_default = router;

// backend/routes/players.ts
var import_express2 = require("express");

// backend/database/repositories/playerRepository.ts
var playerRepository = {
  getAll: () => {
    const players = database_default.prepare("SELECT * FROM players ORDER BY nickname ASC").all();
    return players.map((p) => ({
      ...p,
      avatar: p.avatar_url
    }));
  },
  getById: (id) => {
    const player = database_default.prepare("SELECT * FROM players WHERE id = ?").get(id);
    if (!player) return null;
    return {
      ...player,
      avatar: player.avatar_url
    };
  },
  getByTeamId: (teamId) => {
    const players = database_default.prepare("SELECT * FROM players WHERE team_id = ?").all(teamId);
    return players.map((p) => ({
      ...p,
      avatar: p.avatar_url
    }));
  },
  create: (player) => {
    const {
      id,
      nickname,
      real_name,
      steam_id,
      avatar,
      team_id,
      role,
      country,
      hltv_player_id,
      hltv_profile_url,
      avatar_source
    } = player;
    const stmt = database_default.prepare(`
      INSERT INTO players (
        id,
        nickname,
        real_name,
        steam_id,
        avatar_url,
        team_id,
        role,
        country,
        hltv_player_id,
        hltv_profile_url,
        avatar_source,
        hltv_synced_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    return stmt.run(
      id,
      nickname,
      real_name,
      steam_id,
      avatar,
      team_id,
      role,
      country,
      hltv_player_id || null,
      hltv_profile_url || null,
      avatar_source || null
    );
  },
  update: (id, player) => {
    const {
      nickname,
      real_name,
      steam_id,
      avatar,
      team_id,
      role,
      country,
      hltv_player_id,
      hltv_profile_url,
      avatar_source
    } = player;
    const stmt = database_default.prepare(`
      UPDATE players 
      SET
        nickname = ?,
        real_name = ?,
        steam_id = ?,
        avatar_url = ?,
        team_id = ?,
        role = ?,
        country = ?,
        hltv_player_id = COALESCE(?, hltv_player_id),
        hltv_profile_url = COALESCE(?, hltv_profile_url),
        avatar_source = COALESCE(?, avatar_source),
        hltv_synced_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    return stmt.run(
      nickname,
      real_name,
      steam_id,
      avatar,
      team_id,
      role,
      country,
      hltv_player_id || null,
      hltv_profile_url || null,
      avatar_source || null,
      id
    );
  },
  findByHltvPlayerId: (hltvPlayerId) => {
    return database_default.prepare("SELECT * FROM players WHERE hltv_player_id = ?").get(hltvPlayerId);
  },
  findByNicknameAndTeam: (nickname, teamId) => {
    return database_default.prepare(`
      SELECT * FROM players
      WHERE lower(nickname) = lower(?) AND team_id = ?
      LIMIT 1
    `).get(nickname, teamId);
  },
  upsertFromHltv: (player) => {
    const existing = player.hltv_player_id && playerRepository.findByHltvPlayerId(player.hltv_player_id) || playerRepository.findByNicknameAndTeam(player.nickname, player.team_id);
    if (existing) {
      playerRepository.update(existing.id, {
        ...existing,
        ...player,
        avatar: player.avatar || existing.avatar_url
      });
      return { id: existing.id, action: "updated" };
    }
    const id = Date.now() + Math.floor(Math.random() * 1e4);
    playerRepository.create({
      ...player,
      id
    });
    return { id, action: "created" };
  },
  delete: (id) => {
    return database_default.prepare("DELETE FROM players WHERE id = ?").run(id);
  }
};

// backend/routes/players.ts
var router2 = (0, import_express2.Router)();
router2.get("/", (req, res) => {
  res.json(playerRepository.getAll());
});
router2.post("/", (req, res) => {
  const newPlayer = {
    ...req.body,
    id: Date.now(),
    avatar: saveImage(req.body.avatar, "player")
  };
  playerRepository.create(newPlayer);
  res.json({ id: newPlayer.id, success: true });
});
router2.put("/:id", (req, res) => {
  const { id } = req.params;
  const avatar = req.body.avatar && req.body.avatar.startsWith("data:image") ? saveImage(req.body.avatar, "player") : req.body.avatar;
  playerRepository.update(Number(id), { ...req.body, avatar });
  res.json({ success: true });
});
router2.delete("/:id", (req, res) => {
  const { id } = req.params;
  playerRepository.delete(Number(id));
  res.json({ success: true });
});
var players_default = router2;

// backend/routes/gsi.ts
var import_express3 = require("express");

// backend/socket/gsiEmitter.ts
var import_events = require("events");
var GSIEmitter = class extends import_events.EventEmitter {
};
var gsiEmitter = new GSIEmitter();

// backend/routes/gsi.ts
var router3 = (0, import_express3.Router)();
router3.post("/", (req, res) => {
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
var gsi_default = router3;

// backend/routes/steam.ts
var import_express4 = require("express");

// backend/services/steamProfileService.ts
var import_config = require("dotenv/config");
var CACHE_DURATION = 24 * 60 * 60 * 1e3;
var steamProfileCache = /* @__PURE__ */ new Map();
var steamProfileService = {
  async getProfiles(steamids) {
    const apiKey = process.env.STEAM_API_KEY;
    if (!apiKey) {
      console.warn("STEAM_API_KEY n\xE3o configurada; avatars da Steam desativados");
      return {};
    }
    const uniqueSteamids = [...new Set(steamids)].filter((id) => id && id.length > 0);
    const now = Date.now();
    const profiles = {};
    const toFetch = [];
    for (const steamid of uniqueSteamids) {
      const cached = steamProfileCache.get(steamid);
      if (cached && now - cached.fetchedAt < CACHE_DURATION) {
        profiles[steamid] = cached.profile;
      } else {
        toFetch.push(steamid);
      }
    }
    if (toFetch.length === 0) {
      return profiles;
    }
    try {
      const chunks = [];
      for (let i = 0; i < toFetch.length; i += 100) {
        chunks.push(toFetch.slice(i, i + 100));
      }
      for (const chunk of chunks) {
        const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${chunk.join(",")}`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Steam API returned ${response.status}`);
        }
        const data = await response.json();
        const players = data.response?.players || [];
        for (const player of players) {
          const profile = {
            steamid: player.steamid,
            personaname: player.personaname,
            avatar: player.avatar,
            avatarmedium: player.avatarmedium,
            avatarfull: player.avatarfull,
            profileurl: player.profileurl
          };
          profiles[profile.steamid] = profile;
          steamProfileCache.set(profile.steamid, {
            profile,
            fetchedAt: now
          });
        }
      }
    } catch (error) {
      console.error("Erro ao buscar perfis da Steam:", error);
    }
    return profiles;
  }
};

// backend/routes/steam.ts
var router4 = (0, import_express4.Router)();
router4.post("/players", async (req, res) => {
  try {
    const { steamids } = req.body;
    if (!Array.isArray(steamids)) {
      return res.status(400).json({ error: "steamids must be an array of strings" });
    }
    const profiles = await steamProfileService.getProfiles(steamids);
    res.json({ profiles });
  } catch (error) {
    console.error("Error in /api/steam/players:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
var steam_default = router4;

// backend/routes/overlays.ts
var import_express5 = require("express");

// backend/database/repositories/overlayModelRepository.ts
function parseModel(row) {
  return {
    ...row,
    config: JSON.parse(row.config_json || "{}"),
    is_active: Boolean(row.is_active),
    is_default: Boolean(row.is_default)
  };
}
var overlayModelRepository = {
  getAll: () => {
    const rows = database_default.prepare("SELECT * FROM overlay_models ORDER BY is_active DESC, is_default DESC, created_at ASC").all();
    return rows.map(parseModel);
  },
  getActive: () => {
    const row = database_default.prepare("SELECT * FROM overlay_models WHERE is_active = 1 LIMIT 1").get();
    return row ? parseModel(row) : null;
  },
  setActive: (id) => {
    const model = database_default.prepare("SELECT id FROM overlay_models WHERE id = ?").get(id);
    if (!model) {
      return false;
    }
    const transaction = database_default.transaction(() => {
      database_default.prepare("UPDATE overlay_models SET is_active = 0").run();
      database_default.prepare(`
        UPDATE overlay_models
        SET is_active = 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(id);
    });
    transaction();
    return true;
  }
};

// backend/routes/overlays.ts
var router5 = (0, import_express5.Router)();
router5.get("/", (_req, res) => {
  res.json(overlayModelRepository.getAll());
});
router5.get("/active", (_req, res) => {
  const activeModel = overlayModelRepository.getActive();
  res.json(activeModel);
});
router5.put("/:id/active", (req, res) => {
  const success = overlayModelRepository.setActive(String(req.params.id));
  if (!success) {
    return res.status(404).json({ success: false, error: "Overlay model not found" });
  }
  return res.json({ success: true });
});
var overlays_default = router5;

// backend/routes/hltv.ts
var import_express6 = require("express");
var import_fs3 = __toESM(require("fs"), 1);
var import_path3 = __toESM(require("path"), 1);
var router6 = (0, import_express6.Router)();
var HLTV_ORIGIN = "https://www.hltv.org";
var JINA_READER_PREFIX = "https://r.jina.ai/http://";
function decodeHtml(value) {
  return value.replace(/&amp;/g, "&").replace(/&#039;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
}
function normalizeHltvUrl(url) {
  const trimmed = String(url || "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/")) return `${HLTV_ORIGIN}${trimmed}`;
  return trimmed;
}
function absoluteHltvAssetUrl(url) {
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `${HLTV_ORIGIN}${url}`;
  return url;
}
function normalizeEscapedUrl(url) {
  return decodeHtml(url).replace(/\\u003d/g, "=").replace(/\\u0026/g, "&").replace(/\\\//g, "/");
}
function sanitizeFilePart(value) {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}
function extractTeamId(hltvUrl) {
  return hltvUrl.match(/\/team\/(\d+)\//)?.[1] || null;
}
function playerFromPath(pathName, id, slug) {
  return {
    id,
    url: `${HLTV_ORIGIN}${pathName}`,
    nickname: decodeURIComponent(slug).replace(/-/g, " ")
  };
}
function extractLinkedPlayers(text) {
  const players = /* @__PURE__ */ new Map();
  const playerPatterns = [
    /href="(\/player\/(\d+)\/([^"#?]+))"/g,
    /https:\/\/www\.hltv\.org(\/player\/(\d+)\/([^\])\s"#?]+))/g,
    /\]\((\/player\/(\d+)\/([^\])\s"#?]+))\)/g
  ];
  for (const pattern of playerPatterns) {
    for (const match of text.matchAll(pattern)) {
      const [, pathName, id, slug] = match;
      if (!players.has(id)) {
        players.set(id, playerFromPath(pathName, id, slug));
      }
    }
  }
  return Array.from(players.values()).slice(0, 5);
}
function extractReaderRoster(markdown) {
  const lines = markdown.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const signInIndex = lines.findIndex((line) => line.toLowerCase() === "sign in");
  const startIndex = signInIndex >= 0 ? signInIndex + 1 : 0;
  const stopWords = /* @__PURE__ */ new Set([
    "brazil",
    "europe",
    "north america",
    "south america",
    "cis",
    "valve ranking",
    "world ranking",
    "weeks in top30 for core",
    "average player age",
    "coach",
    "info",
    "roster",
    "settings",
    "theme day night auto",
    "show results yes no",
    "automatic timezone on off",
    "timezone",
    "force desktop mode on off",
    "match filter settings expand",
    "enable filter yes no",
    "reset filter",
    "match type",
    "star filter clear",
    "min. stars",
    "event type",
    "team",
    "teams",
    "events"
  ]);
  const roster = [];
  for (const line of lines.slice(startIndex)) {
    const normalized = line.toLowerCase();
    if (stopWords.has(normalized) || normalized.startsWith("#")) break;
    if (normalized.length > 24 || normalized.includes(" ") || normalized.includes(":") || normalized.includes("ranking") || normalized.includes("[") || normalized.includes("]") || normalized.includes("(") || normalized.includes(")")) {
      continue;
    }
    roster.push({
      id: null,
      url: null,
      nickname: line
    });
    if (roster.length >= 5) break;
  }
  return roster;
}
function extractPlayerLinks(teamHtml) {
  const linkedPlayers = extractLinkedPlayers(teamHtml);
  if (linkedPlayers.length > 0) {
    return linkedPlayers;
  }
  return extractReaderRoster(teamHtml);
}
function extractMetaContent(html, property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`, "i");
  return decodeHtml(html.match(regex)?.[1] || "");
}
function extractPlayerImage(html, nickname) {
  const htmlImageUrls = Array.from(
    html.matchAll(/(?:src|data-src)=["']([^"']*img-cdn\.hltv\.org\/[^"']+)["']/g)
  ).map((match) => absoluteHltvAssetUrl(normalizeEscapedUrl(match[1])));
  const markdownImageUrls = Array.from(
    html.matchAll(/https:\/\/img-cdn\.hltv\.org\/[^\s)"']+/g)
  ).map((match) => normalizeEscapedUrl(match[0]));
  const imageUrls = [...htmlImageUrls, ...markdownImageUrls];
  const preferred = imageUrls.find((url) => {
    const lower = url.toLowerCase();
    return lower.includes("playerbodyshot") || lower.includes("playerprofile") || lower.includes("bodyshot") || lower.includes(sanitizeFilePart(nickname));
  });
  return preferred || imageUrls[0] || "";
}
function extractRealName(html) {
  const titleMatch = html.match(/^Title:\s*([^'\n]+)\s+'[^']+'\s+([^\n]+)/m);
  if (titleMatch) {
    return decodeHtml(`${titleMatch[1]} ${titleMatch[2]}`.trim());
  }
  const realNameMatch = html.match(/class=["'][^"']*playerRealname[^"']*["'][^>]*>([^<]+)</i) || html.match(/class=["'][^"']*player-realname[^"']*["'][^>]*>([^<]+)</i);
  return decodeHtml(realNameMatch?.[1] || "");
}
function extractNickname(html, fallback) {
  const readerTitle = html.match(/^Title:\s*[^'\n]*'([^']+)'/m)?.[1];
  if (readerTitle) return decodeHtml(readerTitle);
  const title = extractMetaContent(html, "og:title");
  const titleNick = title.match(/(?:^|\s)'?([^'|"]+)'?\s*\|/)?.[1];
  if (titleNick) return titleNick.trim();
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match?.[1]) return decodeHtml(h1Match[1]);
  return fallback;
}
async function searchHltvPlayer(nickname, teamName, hltvPlayerId) {
  const searchUrl = `${HLTV_ORIGIN}/search?term=${encodeURIComponent(nickname)}`;
  const searchText = await fetchReaderText(searchUrl);
  const jsonStart = searchText.indexOf("[");
  if (jsonStart < 0) return null;
  const jsonText = searchText.slice(jsonStart).trim();
  let data;
  try {
    data = JSON.parse(jsonText);
  } catch {
    return null;
  }
  const players = Array.isArray(data) ? data.flatMap((entry) => entry?.players || []) : [];
  if (players.length === 0) return null;
  const normalizedNick = nickname.toLowerCase();
  const normalizedTeam = String(teamName || "").toLowerCase();
  const normalizedPlayerId = String(hltvPlayerId || "");
  return players.find((player) => String(player?.id || "") === normalizedPlayerId) || players.find((player) => {
    const sameNick = String(player?.nickName || "").toLowerCase() === normalizedNick;
    const sameTeam = normalizedTeam ? String(player?.team?.name || "").toLowerCase() === normalizedTeam : true;
    return sameNick && sameTeam;
  }) || players.find((player) => String(player?.nickName || "").toLowerCase() === normalizedNick) || players[0];
}
async function fetchReaderText(url) {
  const readerUrl = `${JINA_READER_PREFIX}${url}`;
  const response = await fetch(readerUrl, {
    headers: {
      "User-Agent": "DoutrinaHUD/1.0",
      Accept: "text/plain,text/markdown,*/*"
    }
  });
  if (!response.ok) {
    throw new Error(`Fallback Reader respondeu HTTP ${response.status}`);
  }
  return response.text();
}
async function fetchHltvText(url, allowReaderFallback = true) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36 DoutrinaHUD/1.0",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9,pt-BR;q=0.8"
    }
  });
  if (!response.ok) {
    if (allowReaderFallback && (response.status === 403 || response.status === 429)) {
      return fetchReaderText(url);
    }
    throw new Error(`HLTV respondeu HTTP ${response.status}`);
  }
  return response.text();
}
async function downloadPlayerImage(imageUrl, hltvPlayerId, nickname) {
  if (!imageUrl) return "";
  const normalizedImageUrl = normalizeEscapedUrl(imageUrl);
  const proxyImageUrl = normalizedImageUrl.includes("img-cdn.hltv.org") ? `https://images.weserv.nl/?url=${encodeURIComponent(
    normalizedImageUrl.replace(/^https?:\/\//, "")
  )}` : "";
  let response = await fetch(normalizedImageUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36 DoutrinaHUD/1.0",
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      Referer: HLTV_ORIGIN
    }
  });
  if (!response.ok && proxyImageUrl) {
    response = await fetch(proxyImageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 DoutrinaHUD/1.0",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
      }
    });
  }
  if (!response.ok) return "";
  const contentType = response.headers.get("content-type") || "";
  const extension = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : import_path3.default.extname(new URL(normalizedImageUrl).pathname).replace(".", "") || "jpg";
  const uploadsDir = import_path3.default.join(process.cwd(), "public", "uploads", "players");
  import_fs3.default.mkdirSync(uploadsDir, { recursive: true });
  const fileName = `hltv_${hltvPlayerId || sanitizeFilePart(nickname)}_${sanitizeFilePart(nickname)}.${extension}`;
  const filePath = import_path3.default.join(uploadsDir, fileName);
  const buffer = Buffer.from(await response.arrayBuffer());
  import_fs3.default.writeFileSync(filePath, buffer);
  return `/uploads/players/${fileName}`;
}
router6.post("/import-team", async (req, res) => {
  try {
    const teamId = Number(req.body.teamId);
    const hltvUrl = normalizeHltvUrl(req.body.hltvUrl);
    if (!teamId || !hltvUrl || !hltvUrl.includes("/team/")) {
      return res.status(400).json({
        success: false,
        error: "Informe um teamId e uma URL de time HLTV valida."
      });
    }
    const team = teamRepository.getById(teamId);
    if (!team) {
      return res.status(404).json({ success: false, error: "Time nao encontrado." });
    }
    const teamHtml = await fetchHltvText(hltvUrl);
    const hltvTeamId = extractTeamId(hltvUrl);
    const roster = extractPlayerLinks(teamHtml);
    if (roster.length === 0) {
      return res.status(422).json({
        success: false,
        error: "Nao encontrei jogadores na pagina HLTV informada."
      });
    }
    const importedPlayers = [];
    for (const rosterPlayer of roster) {
      let nickname = rosterPlayer.nickname;
      let realName = "";
      let imageUrl = "";
      let avatar = "";
      let hltvPlayerId = rosterPlayer.id || null;
      let hltvProfileUrl = rosterPlayer.url || null;
      if (hltvProfileUrl) {
        try {
          const profileHtml = await fetchHltvText(hltvProfileUrl);
          nickname = extractNickname(profileHtml, rosterPlayer.nickname);
          realName = extractRealName(profileHtml) || realName;
          imageUrl = extractPlayerImage(profileHtml, nickname);
        } catch (profileError) {
          console.warn(
            `[HLTV Import] Perfil bloqueado para ${rosterPlayer.nickname}; tentando busca.`
          );
        }
      }
      if (!imageUrl) {
        try {
          const searchResult = await searchHltvPlayer(nickname, team.name, hltvPlayerId);
          if (searchResult) {
            nickname = searchResult.nickName || nickname;
            realName = [searchResult.firstName, searchResult.lastName].filter(Boolean).join(" ") || realName;
            imageUrl = searchResult.pictureUrl || imageUrl;
            hltvPlayerId = searchResult.id ? String(searchResult.id) : hltvPlayerId;
            hltvProfileUrl = searchResult.location ? normalizeHltvUrl(searchResult.location) : hltvProfileUrl;
          }
        } catch (searchError) {
          console.warn(`[HLTV Import] Busca falhou para ${nickname}; importando sem foto.`);
        }
      }
      avatar = await downloadPlayerImage(imageUrl, hltvPlayerId, nickname);
      const result = playerRepository.upsertFromHltv({
        nickname,
        real_name: realName,
        steam_id: null,
        avatar,
        team_id: teamId,
        role: null,
        country: null,
        hltv_player_id: hltvPlayerId,
        hltv_profile_url: hltvProfileUrl,
        avatar_source: avatar ? "hltv" : null
      });
      importedPlayers.push({
        id: result.id,
        action: result.action,
        nickname,
        real_name: realName,
        avatar,
        hltv_player_id: hltvPlayerId,
        hltv_profile_url: hltvProfileUrl
      });
    }
    teamRepository.markHltvSynced(teamId, hltvUrl, hltvTeamId);
    return res.json({
      success: true,
      teamId,
      hltvUrl,
      players: importedPlayers
    });
  } catch (error) {
    console.error("[HLTV Import]", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Erro ao importar dados do HLTV."
    });
  }
});
var hltv_default = router6;

// backend/routes/api.ts
var router7 = (0, import_express7.Router)();
router7.get("/health", (req, res) => {
  res.json({ status: "ok", message: "DoutrinaHUD API rodando" });
});
router7.get("/stats", (req, res) => {
  try {
    const teams = getTeams();
    const players = getPlayers();
    res.json({
      teams: teams.length,
      players: players.length,
      activeMatches: 0
      // Placeholder or implement match logic
    });
  } catch (error) {
    res.json({ teams: 0, players: 0, activeMatches: 0 });
  }
});
router7.use("/teams", teams_default);
router7.use("/players", players_default);
router7.use("/gsi", gsi_default);
router7.use("/steam", steam_default);
router7.use("/overlays", overlays_default);
router7.use("/hltv", hltv_default);
var api_default = router7;

// backend/vetoService.ts
var import_crypto = __toESM(require("crypto"), 1);

// backend/database/repositories/vetoRepository.ts
var vetoRepository = {
  getSession: (id) => {
    const session = database_default.prepare("SELECT * FROM veto_sessions WHERE id = ?").get(id);
    if (!session) return null;
    const actions = database_default.prepare("SELECT * FROM veto_actions WHERE veto_session_id = ? ORDER BY timestamp ASC").all(id);
    const selectedMaps = database_default.prepare("SELECT * FROM selected_maps WHERE veto_session_id = ? ORDER BY map_number ASC").all(id);
    return {
      ...session,
      leftReady: !!session.left_ready,
      rightReady: !!session.right_ready,
      leftConnected: !!session.left_connected,
      rightConnected: !!session.right_connected,
      isFinished: !!session.is_finished,
      currentStepIndex: session.current_step_index,
      currentTurn: session.current_turn,
      availableMaps: JSON.parse(session.available_maps_json),
      activeMapPool: JSON.parse(session.active_map_pool_json),
      flow: JSON.parse(session.flow_json),
      actions: actions.map((a) => ({
        ...a,
        mapNames: a.map_names_json ? JSON.parse(a.map_names_json) : void 0
      })),
      selectedMaps
    };
  },
  getAllSessions: () => {
    return database_default.prepare("SELECT id FROM veto_sessions").all().map((s) => vetoRepository.getSession(s.id));
  },
  saveSession: (session) => {
    const ensureTeam = (team) => {
      if (!team?.id || !team?.name) return;
      database_default.prepare(`
        INSERT INTO teams (
          id,
          name,
          tag,
          logo_url
        ) VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          tag = excluded.tag,
          logo_url = excluded.logo_url,
          updated_at = CURRENT_TIMESTAMP
      `).run(
        team.id,
        team.name,
        team.tag || null,
        team.logo || team.logo_url || null
      );
    };
    ensureTeam(session.leftTeam);
    ensureTeam(session.rightTeam);
    database_default.prepare(`
      INSERT INTO matches (
        id,
        left_team_id,
        right_team_id,
        format,
        status
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        left_team_id = excluded.left_team_id,
        right_team_id = excluded.right_team_id,
        format = excluded.format,
        updated_at = CURRENT_TIMESTAMP
    `).run(
      session.matchId,
      session.leftTeam?.id || null,
      session.rightTeam?.id || null,
      session.format || "BO3",
      "setup"
    );
    const stmt = database_default.prepare(`
      INSERT INTO veto_sessions (
        id, match_id, format, status, left_team_id, right_team_id, 
        left_token, right_token, left_ready, right_ready, 
        left_connected, right_connected, current_step_index, current_turn, 
        is_finished, available_maps_json, active_map_pool_json, flow_json, 
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        left_ready = excluded.left_ready,
        right_ready = excluded.right_ready,
        left_connected = excluded.left_connected,
        right_connected = excluded.right_connected,
        current_step_index = excluded.current_step_index,
        current_turn = excluded.current_turn,
        is_finished = excluded.is_finished,
        available_maps_json = excluded.available_maps_json,
        updated_at = CURRENT_TIMESTAMP
    `);
    return stmt.run(
      session.matchId,
      session.matchId,
      // Usando matchId como ID da sessão também para simplificar
      session.format,
      session.status,
      session.leftTeam?.id,
      session.rightTeam?.id,
      session.leftToken,
      session.rightToken,
      session.leftReady ? 1 : 0,
      session.rightReady ? 1 : 0,
      session.leftConnected ? 1 : 0,
      session.rightConnected ? 1 : 0,
      session.currentStepIndex,
      session.currentTurn,
      session.isFinished ? 1 : 0,
      JSON.stringify(session.availableMaps),
      JSON.stringify(session.activeMapPool),
      JSON.stringify(session.flow)
    );
  },
  addAction: (sessionId, action) => {
    const stmt = database_default.prepare(`
      INSERT INTO veto_actions (
        id, veto_session_id, step_index, action, team_side, 
        map_name, map_names_json, map_number, starting_side, 
        side_choice_by, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      action.id,
      sessionId,
      action.stepIndex,
      action.action,
      action.teamSide,
      action.mapName,
      action.mapNames ? JSON.stringify(action.mapNames) : null,
      action.mapNumber,
      action.startingSide,
      action.sideChoiceBy,
      action.timestamp
    );
  },
  addSelectedMap: (sessionId, map) => {
    const stmt = database_default.prepare(`
      INSERT INTO selected_maps (
        veto_session_id, map_name, map_number, picked_by, 
        side_choice_by, starting_side
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      sessionId,
      map.mapName,
      map.mapNumber,
      map.pickedBy,
      map.sideChoiceBy,
      map.startingSide
    );
  },
  updateSelectedMapSide: (sessionId, mapNumber, side) => {
    const stmt = database_default.prepare(`
      UPDATE selected_maps 
      SET starting_side = ? 
      WHERE veto_session_id = ? AND map_number = ?
    `);
    return stmt.run(side, sessionId, mapNumber);
  },
  clearSessionData: (sessionId) => {
    database_default.prepare("DELETE FROM veto_actions WHERE veto_session_id = ?").run(sessionId);
    database_default.prepare("DELETE FROM selected_maps WHERE veto_session_id = ?").run(sessionId);
  },
  deleteSession: (id) => {
    return database_default.prepare("DELETE FROM veto_sessions WHERE id = ?").run(id);
  }
};

// backend/vetoService.ts
var ACTIVE_MAP_POOL = [
  "Ancient",
  "Anubis",
  "Dust2",
  "Inferno",
  "Mirage",
  "Nuke",
  "Overpass"
];
var VetoService = class {
  constructor() {
    this.sessions = /* @__PURE__ */ new Map();
    setTimeout(() => {
      try {
        const dbSessions = vetoRepository.getAllSessions();
        dbSessions.forEach((session) => {
          if (session) {
            if (session.left_team_id) session.leftTeam = teamRepository.getById(session.left_team_id);
            if (session.right_team_id) session.rightTeam = teamRepository.getById(session.right_team_id);
            this.sessions.set(session.id, session);
            console.log(`[VetoService] Sess\xE3o recuperada do SQLite: ${session.id}`);
          }
        });
      } catch (e) {
        console.error("[VetoService] Erro ao carregar sess\xF5es do banco:", e);
      }
    }, 1e3);
  }
  createSession(matchId, format, leftTeam, rightTeam) {
    console.log(`[VetoService] Criando sess\xE3o: ${matchId}, formato: ${format}`);
    const flow = this.generateFlow(format);
    const generateToken = () => {
      try {
        return import_crypto.default.randomUUID().substring(0, 8);
      } catch (e) {
        return Math.random().toString(36).substring(2, 10);
      }
    };
    const session = {
      matchId,
      status: "waiting",
      format,
      leftTeam,
      rightTeam,
      leftToken: generateToken(),
      rightToken: generateToken(),
      leftReady: false,
      rightReady: false,
      leftConnected: false,
      rightConnected: false,
      activeMapPool: [...ACTIVE_MAP_POOL],
      flow,
      currentStepIndex: 0,
      availableMaps: [...ACTIVE_MAP_POOL],
      actions: [],
      selectedMaps: [],
      currentTurn: null,
      isFinished: false
    };
    this.sessions.set(matchId, session);
    vetoRepository.saveSession(session);
    return session;
  }
  generateFlow(format) {
    if (format === "BO1") {
      return [
        { step: 1, teamSide: "left", action: "ban", amount: 1, label: "{leftTeam} bane 1 mapa" },
        { step: 2, teamSide: "right", action: "ban", amount: 2, label: "{rightTeam} bane 2 mapas" },
        { step: 3, teamSide: "left", action: "ban", amount: 2, label: "{leftTeam} bane 2 mapas" },
        { step: 4, teamSide: "right", action: "pick", mapNumber: 1, sideChoiceBy: "left", label: "{rightTeam} escolhe o mapa da partida" },
        { step: 5, teamSide: "left", action: "side_choice", mapNumber: 1, label: "{leftTeam} escolhe o lado inicial" }
      ];
    } else {
      return [
        { step: 1, teamSide: "left", action: "ban", label: "{leftTeam} bane 1 mapa" },
        { step: 2, teamSide: "right", action: "ban", label: "{rightTeam} bane 1 mapa" },
        { step: 3, teamSide: "left", action: "pick", mapNumber: 1, sideChoiceBy: "left", label: "{leftTeam} escolhe o Mapa 1" },
        { step: 4, teamSide: "left", action: "side_choice", mapNumber: 1, label: "{leftTeam} escolhe o lado do Mapa 1" },
        { step: 5, teamSide: "right", action: "pick", mapNumber: 2, sideChoiceBy: "right", label: "{rightTeam} escolhe o Mapa 2" },
        { step: 6, teamSide: "right", action: "side_choice", mapNumber: 2, label: "{rightTeam} escolhe o lado do Mapa 2" },
        { step: 7, teamSide: "left", action: "ban", label: "{leftTeam} bane 1 mapa" },
        { step: 8, teamSide: "right", action: "ban", label: "{rightTeam} bane 1 mapa" },
        { step: 9, teamSide: null, action: "decider", mapNumber: 3, sideChoiceBy: "knife", label: "Mapa restante \xE9 o Decisor" }
      ];
    }
  }
  getSession(matchId) {
    return this.sessions.get(matchId);
  }
  setReady(matchId, token, ready) {
    const session = this.sessions.get(matchId);
    if (!session) return null;
    if (token === session.leftToken) {
      session.leftReady = ready;
    } else if (token === session.rightToken) {
      session.rightReady = ready;
    } else {
      return null;
    }
    if (session.leftReady && session.rightReady) {
      session.status = "setup";
    } else {
      session.status = "waiting";
    }
    vetoRepository.saveSession(session);
    return session;
  }
  startVeto(matchId) {
    const session = this.sessions.get(matchId);
    if (!session || session.status !== "setup" && session.status !== "waiting") return null;
    session.status = "live";
    session.currentStepIndex = 0;
    this.updateCurrentTurn(session);
    this.checkAutomaticSteps(session);
    vetoRepository.saveSession(session);
    return session;
  }
  updateCurrentTurn(session) {
    const currentStep = session.flow[session.currentStepIndex];
    if (!currentStep || session.status !== "live") {
      session.currentTurn = null;
      return;
    }
    if (currentStep.teamSide === "random") {
      const sides = ["left", "right"];
      session.currentTurn = sides[Math.floor(Math.random() * sides.length)];
    } else {
      session.currentTurn = currentStep.teamSide;
    }
  }
  submitAction(matchId, token, mapNames) {
    const session = this.sessions.get(matchId);
    if (!session || session.status !== "live") return null;
    const currentStep = session.flow[session.currentStepIndex];
    if (!currentStep) return null;
    const isLeft = token === session.leftToken;
    const isRight = token === session.rightToken;
    const mySide = isLeft ? "left" : "right";
    if (session.currentTurn !== mySide) return null;
    for (const m of mapNames) {
      if (!session.availableMaps.includes(m)) return null;
    }
    if (currentStep.action === "ban") {
      const required = currentStep.amount || 1;
      if (mapNames.length !== required) return null;
      const action = {
        id: import_crypto.default.randomUUID(),
        stepIndex: session.currentStepIndex,
        action: "ban",
        teamSide: mySide,
        mapNames,
        timestamp: Date.now()
      };
      session.actions.push(action);
      vetoRepository.addAction(session.matchId, action);
      session.availableMaps = session.availableMaps.filter((m) => !mapNames.includes(m));
    } else if (currentStep.action === "pick") {
      if (mapNames.length !== 1) return null;
      const mapName = mapNames[0];
      const action = {
        id: import_crypto.default.randomUUID(),
        stepIndex: session.currentStepIndex,
        action: "pick",
        teamSide: mySide,
        mapName,
        mapNumber: currentStep.mapNumber,
        sideChoiceBy: currentStep.sideChoiceBy,
        timestamp: Date.now()
      };
      session.actions.push(action);
      vetoRepository.addAction(session.matchId, action);
      const selMap = {
        mapName,
        mapNumber: currentStep.mapNumber,
        pickedBy: mySide,
        sideChoiceBy: currentStep.sideChoiceBy,
        startingSide: null
      };
      session.selectedMaps.push(selMap);
      vetoRepository.addSelectedMap(session.matchId, selMap);
      session.availableMaps = session.availableMaps.filter((m) => m !== mapName);
    } else {
      return null;
    }
    session.currentStepIndex++;
    this.updateCurrentTurn(session);
    this.checkAutomaticSteps(session);
    vetoRepository.saveSession(session);
    return session;
  }
  submitSideChoice(matchId, token, startingSide) {
    const session = this.sessions.get(matchId);
    if (!session || session.status !== "live") return null;
    const currentStep = session.flow[session.currentStepIndex];
    if (!currentStep || currentStep.action !== "side_choice") return null;
    const isLeft = token === session.leftToken;
    const isRight = token === session.rightToken;
    const mySide = isLeft ? "left" : "right";
    if (session.currentTurn !== mySide) return null;
    const action = {
      id: import_crypto.default.randomUUID(),
      stepIndex: session.currentStepIndex,
      action: "side_choice",
      teamSide: mySide,
      startingSide,
      mapNumber: currentStep.mapNumber || (session.format === "BO1" ? 1 : void 0),
      timestamp: Date.now()
    };
    session.actions.push(action);
    vetoRepository.addAction(session.matchId, action);
    if (session.format === "BO1") {
      if (session.selectedMaps[0]) {
        session.selectedMaps[0].startingSide = startingSide;
        vetoRepository.updateSelectedMapSide(session.matchId, 1, startingSide);
      }
    } else {
      const targetMap = session.selectedMaps.find((m) => m.mapNumber === currentStep.mapNumber);
      if (targetMap) {
        targetMap.startingSide = startingSide;
        vetoRepository.updateSelectedMapSide(session.matchId, currentStep.mapNumber, startingSide);
      }
    }
    session.currentStepIndex++;
    this.updateCurrentTurn(session);
    this.checkAutomaticSteps(session);
    vetoRepository.saveSession(session);
    return session;
  }
  checkAutomaticSteps(session) {
    if (session.currentStepIndex >= session.flow.length) {
      this.finishVeto(session);
      return;
    }
    const currentStep = session.flow[session.currentStepIndex];
    if (currentStep.action === "decider") {
      const deciderMap = session.availableMaps[0];
      if (deciderMap) {
        const action = {
          id: import_crypto.default.randomUUID(),
          stepIndex: session.currentStepIndex,
          action: "decider",
          teamSide: null,
          mapName: deciderMap,
          mapNumber: currentStep.mapNumber,
          sideChoiceBy: currentStep.sideChoiceBy,
          timestamp: Date.now()
        };
        session.actions.push(action);
        vetoRepository.addAction(session.matchId, action);
        const selMap = {
          mapName: deciderMap,
          mapNumber: currentStep.mapNumber,
          pickedBy: "decider",
          sideChoiceBy: currentStep.sideChoiceBy || (session.format === "BO1" ? null : "knife"),
          startingSide: session.format === "BO1" ? null : null
        };
        session.selectedMaps.push(selMap);
        vetoRepository.addSelectedMap(session.matchId, selMap);
        session.availableMaps = [];
        session.currentStepIndex++;
        this.updateCurrentTurn(session);
        this.checkAutomaticSteps(session);
      } else {
        this.finishVeto(session);
      }
    } else if (currentStep.teamSide === "random" && currentStep.action === "side_choice") {
      const sides = ["left", "right"];
      session.currentTurn = sides[Math.floor(Math.random() * sides.length)];
    }
  }
  finishVeto(session) {
    session.status = "finished";
    session.isFinished = true;
    session.currentTurn = null;
  }
  resetSession(matchId) {
    const session = this.sessions.get(matchId);
    if (!session) return null;
    session.status = "waiting";
    session.leftReady = false;
    session.rightReady = false;
    session.currentStepIndex = 0;
    session.availableMaps = [...ACTIVE_MAP_POOL];
    session.actions = [];
    session.selectedMaps = [];
    session.currentTurn = null;
    session.isFinished = false;
    vetoRepository.clearSessionData(session.matchId);
    vetoRepository.saveSession(session);
    return session;
  }
  updateConnectionStatus(matchId, token, connected) {
    const session = this.sessions.get(matchId);
    if (!session) return null;
    if (token === session.leftToken) {
      session.leftConnected = connected;
    } else if (token === session.rightToken) {
      session.rightConnected = connected;
    }
    vetoRepository.saveSession(session);
    return session;
  }
  deleteSession(matchId) {
    vetoRepository.deleteSession(matchId);
    return this.sessions.delete(matchId);
  }
};
var vetoService = new VetoService();

// backend/database/migrate.ts
var import_fs4 = __toESM(require("fs"), 1);
var import_path4 = __toESM(require("path"), 1);
function migrateJsonToSqlite() {
  const DATA_DIR2 = import_path4.default.join(process.cwd(), "data");
  const TEAMS_FILE2 = import_path4.default.join(DATA_DIR2, "teams.json");
  const PLAYERS_FILE2 = import_path4.default.join(DATA_DIR2, "players.json");
  console.log("[Migration] Iniciando verifica\xE7\xE3o de dados...");
  const teamsCount = database_default.prepare("SELECT COUNT(*) as count FROM teams").get();
  if (teamsCount.count === 0 && import_fs4.default.existsSync(TEAMS_FILE2)) {
    console.log("[Migration] Importando times do JSON para o SQLite...");
    try {
      const teams = JSON.parse(import_fs4.default.readFileSync(TEAMS_FILE2, "utf8"));
      if (Array.isArray(teams) && teams.length > 0) {
        const insertTeam = database_default.prepare(`
          INSERT INTO teams (id, name, tag, logo_url, country, color, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        const insertMany = database_default.transaction((data) => {
          for (const team of data) {
            insertTeam.run(
              team.id,
              team.name,
              team.tag || "",
              team.logo || "",
              team.country || "",
              team.color || "",
              team.created_at || (/* @__PURE__ */ new Date()).toISOString()
            );
          }
        });
        insertMany(teams);
        console.log(`[Migration] ${teams.length} times importados.`);
      }
    } catch (e) {
      console.error("[Migration] Erro ao migrar times:", e);
    }
  } else {
    console.log(`[Migration] Tabela 'teams' j\xE1 possui ${teamsCount.count} registros ou arquivo JSON ausente.`);
  }
  const playersCount = database_default.prepare("SELECT COUNT(*) as count FROM players").get();
  if (playersCount.count === 0 && import_fs4.default.existsSync(PLAYERS_FILE2)) {
    console.log("[Migration] Importando jogadores do JSON para o SQLite...");
    try {
      const players = JSON.parse(import_fs4.default.readFileSync(PLAYERS_FILE2, "utf8"));
      if (Array.isArray(players) && players.length > 0) {
        const insertPlayer = database_default.prepare(`
          INSERT INTO players (id, nickname, real_name, steam_id, avatar_url, team_id, role, country, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const insertMany = database_default.transaction((data) => {
          for (const player of data) {
            insertPlayer.run(
              player.id,
              player.nickname,
              player.real_name || "",
              player.steam_id || "",
              player.avatar || "",
              player.team_id ? Number(player.team_id) : null,
              player.role || "",
              player.country || "",
              player.created_at || (/* @__PURE__ */ new Date()).toISOString()
            );
          }
        });
        insertMany(players);
        console.log(`[Migration] ${players.length} jogadores importados.`);
      }
    } catch (e) {
      console.error("[Migration] Erro ao migrar jogadores:", e);
    }
  } else {
    console.log(`[Migration] Tabela 'players' j\xE1 possui ${playersCount.count} registros ou arquivo JSON ausente.`);
  }
}

// backend/database/repositories/liveStateRepository.ts
var liveStateRepository = {
  get: () => {
    const row = database_default.prepare("SELECT state_json FROM live_state WHERE id = 1").get();
    return row ? JSON.parse(row.state_json) : null;
  },
  save: (state) => {
    const stateJson = JSON.stringify(state);
    const stmt = database_default.prepare(`
      INSERT INTO live_state (id, state_json, updated_at)
      VALUES (1, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        state_json = excluded.state_json,
        updated_at = CURRENT_TIMESTAMP
    `);
    return stmt.run(stateJson);
  }
};

// backend/socket/handlers.ts
initDatabase();
migrateJsonToSqlite();
var latestHudState = liveStateRepository.get();
var latestGsiData = null;
function setupSocket(io) {
  gsiEmitter.on("gsi:update", (data) => {
    latestGsiData = data;
    io.volatile.emit("gsi:update", data);
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
      if (command.type === "SYNC") {
        liveStateRepository.save(command);
      }
      io.emit("hud:update", command);
    });
    socket.on("veto:create", (data) => {
      console.log("Recebido veto:create", data);
      try {
        const session = vetoService.createSession(data.matchId, data.format, data.leftTeam, data.rightTeam);
        console.log("Sess\xE3o criada com sucesso, emitindo veto:update");
        io.emit("veto:update", session);
      } catch (error) {
        console.error("ERRO CR\xCDTICO ao criar sess\xE3o de veto:", error);
        socket.emit("veto:error", { message: "Erro ao criar sess\xE3o no servidor", error: error.message });
      }
    });
    socket.on("veto:join", (data) => {
      console.log("Recebido veto:join", data);
      const session = vetoService.updateConnectionStatus(data.matchId, data.token, true);
      if (session) {
        io.emit("veto:update", session);
      }
    });
    socket.on("veto:captain_ready", (data) => {
      console.log("Recebido veto:captain_ready", data);
      const session = vetoService.setReady(data.matchId, data.token, data.ready);
      if (session) {
        io.emit("veto:update", session);
      }
    });
    socket.on("veto:start", (data) => {
      console.log("Recebido veto:start", data);
      const session = vetoService.startVeto(data.matchId);
      if (session) {
        io.emit("veto:update", session);
      }
    });
    socket.on("veto:submit_action", (data) => {
      console.log("Recebido veto:submit_action", data);
      const session = vetoService.submitAction(data.matchId, data.token, data.mapNames);
      if (session) {
        io.emit("veto:update", session);
      }
    });
    socket.on("veto:submit_side_choice", (data) => {
      console.log("Recebido veto:submit_side_choice", data);
      const session = vetoService.submitSideChoice(data.matchId, data.token, data.startingSide);
      if (session) {
        io.emit("veto:update", session);
      }
    });
    socket.on("veto:reset", (data) => {
      console.log("Recebido veto:reset", data);
      const session = vetoService.resetSession(data.matchId);
      if (session) {
        io.emit("veto:update", session);
      }
    });
    socket.on("veto:delete", (data) => {
      console.log("Recebido veto:delete", data);
      const deleted = vetoService.deleteSession(data.matchId);
      if (deleted) {
        io.emit("veto:update", null);
      }
    });
    socket.on("veto:get_status", (data) => {
      const session = vetoService.getSession(data.matchId);
      if (session) {
        socket.emit("veto:update", session);
      }
    });
    socket.on("disconnect", () => {
      console.log("Cliente desconectado:", socket.id);
    });
  });
}

// server.ts
async function startServer() {
  const app = (0, import_express8.default)();
  const server = import_http.default.createServer(app);
  const io = new import_socket.Server(server, {
    cors: {
      origin: "*"
    }
  });
  const PORT = 3e3;
  app.set("etag", false);
  app.use((req, res, next) => {
    if (req.method === "GET") {
      res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate"
      );
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.setHeader("Surrogate-Control", "no-store");
    }
    next();
  });
  app.use(import_express8.default.json({ limit: "10mb" }));
  app.use(
    "/uploads",
    import_express8.default.static(import_path5.default.join(process.cwd(), "public/uploads"))
  );
  app.post("/gsi", async (req, res) => {
    try {
      const gameState = req.body;
      const rawGrenades = gameState.grenades || gameState.allgrenades || gameState.allgrenades_map || null;
      const payload = {
        provider: gameState.provider || null,
        map: {
          name: gameState.map?.name || null,
          phase: gameState.map?.phase || null,
          round: gameState.map?.round || 0,
          team_ct: gameState.map?.team_ct || null,
          team_t: gameState.map?.team_t || null,
          num_matches_to_win_series: gameState.map?.num_matches_to_win_series || 0,
          current_spectator_count: gameState.map?.current_spectator_count || 0,
          souvenirs_total: gameState.map?.souvenirs_total || 0
        },
        round: {
          phase: gameState.round?.phase || null,
          bomb: gameState.round?.bomb || null,
          win_team: gameState.round?.win_team || null
        },
        player: {
          steamid: gameState.player?.steamid || null,
          name: gameState.player?.name || null,
          clan: gameState.player?.clan || null,
          observer_slot: gameState.player?.observer_slot || null,
          team: gameState.player?.team || null,
          activity: gameState.player?.activity || null,
          match_stats: gameState.player?.match_stats || null,
          state: gameState.player?.state || null,
          weapons: gameState.player?.weapons || null
        },
        allplayers: gameState.allplayers || null,
        phase_countdowns: {
          phase: gameState.phase_countdowns?.phase || null,
          phase_ends_in: gameState.phase_countdowns?.phase_ends_in || null
        },
        bomb: {
          state: gameState.bomb?.state || null,
          position: gameState.bomb?.position || null,
          countdown: gameState.bomb?.countdown || null
        },
        // Dados de granadas/utilitários para trajetória no radar
        grenades: rawGrenades,
        auth: gameState.auth || null
      };
      gsiEmitter.emit("gsi:update", payload);
      return res.sendStatus(200);
    } catch (error) {
      console.error("Erro ao processar GSI:", error);
      return res.status(500).json({
        error: "Erro ao processar Game State Integration"
      });
    }
  });
  app.use("/api", api_default);
  setupSocket(io);
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: {
        middlewareMode: true
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path5.default.join(process.cwd(), "dist");
    app.use(
      import_express8.default.static(distPath, {
        etag: false,
        lastModified: false,
        setHeaders: (res) => {
          res.setHeader(
            "Cache-Control",
            "no-store, no-cache, must-revalidate, proxy-revalidate"
          );
          res.setHeader("Pragma", "no-cache");
          res.setHeader("Expires", "0");
          res.setHeader("Surrogate-Control", "no-store");
        }
      })
    );
    app.get("*", (req, res) => {
      res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate"
      );
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.sendFile(import_path5.default.join(distPath, "index.html"));
    });
  }
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`DoutrinaHUD Server rodando na porta ${PORT}`);
    console.log(`GSI aguardando em: http://127.0.0.1:${PORT}/gsi`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
