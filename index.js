// --- imports o singură dată ---
const fs   = require("fs");
const exp  = require("express");
const path = require("path");
const sass = require("sass");
const { initErori, afisareEroare} = require("./erori");

// --- obGlobal ---
global.obGlobal = {
  folderScss: path.join(__dirname, "resurse", "scss"),
  folderCss : path.join(__dirname, "resurse", "css"),
  obErori   : null
};

gestioneazaScss();

// --- utilitar: compileaza un singur fisier (cu backup) ---
function compileazaScss(caleScss, caleCss) {
  if (!path.isAbsolute(caleScss)) {
    caleScss = path.join(obGlobal.folderScss, caleScss);
  }
  if (!caleCss) {
    const numeFisier = path.basename(caleScss, ".scss") + ".css";
    caleCss = path.join(obGlobal.folderCss, numeFisier);
  } else if (!path.isAbsolute(caleCss)) {
    caleCss = path.join(obGlobal.folderCss, caleCss);
  }

  try {
    // backup înainte de scriere
    if (fs.existsSync(caleCss)) {
      const relPath    = path.relative(obGlobal.folderCss, caleCss);
      const caleBackup = path.join(__dirname, "backup", "resurse", "css", relPath);
      fs.mkdirSync(path.dirname(caleBackup), { recursive: true });
      try { fs.copyFileSync(caleCss, caleBackup); }
      catch (e) { console.error("Eroare backup CSS:", e); }
    }

    const rez = sass.compile(caleScss, { style: "compressed", loadPaths: [path.join(__dirname, "node_modules"), obGlobal.folderScss] });
    fs.mkdirSync(path.dirname(caleCss), { recursive: true }); // în caz că e subfolder
    fs.writeFileSync(caleCss, rez.css);
    console.log(`Compilat SCSS: ${caleScss} → ${caleCss}`);
  } catch (err) {
    console.error("Eroare la compilare SCSS:", err);
  }
}

// --- helper: lista recursivă a tuturor .scss (fără partialuri care încep cu "_") ---
function getAllScssFiles(dir) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(getAllScssFiles(full));
    else if (e.isFile() && e.name.endsWith(".scss") && !e.name.startsWith("_")) out.push(full);
  }
  return out;
}

// --- punct unic de intrare: initial + watch; folosește compileazaScss() ---
function gestioneazaScss() {
  const folderScss   = obGlobal.folderScss;
  const folderCss    = obGlobal.folderCss;

  // 1) Compilare inițială păstrând subfolderele
  const toate = getAllScssFiles(folderScss);
  for (const absScss of toate) {
    const rel      = path.relative(folderScss, absScss);        // ex: comp/_vars.scss sau pages/home.scss
    const outRel   = rel.replace(/\.scss$/i, ".css");           // ex: pages/home.css
    const outCss   = path.join(folderCss, outRel);
    compileazaScss(absScss, outCss);
  }
  console.log(`[SCSS] Compilare inițială: ${toate.length} fișiere.`);

  // 2) Watch pe folderul de SCSS (nerecursiv pe Linux; dacă ai subfoldere, poți porni câte un watcher per subfolder)
  fs.watch(folderScss, { recursive: false }, (event, filename) => {
    if (filename && filename.endsWith(".scss") && !filename.startsWith("_")) {
      const absScss = path.join(folderScss, filename);
      const outCss  = path.join(folderCss, filename.replace(/\.scss$/i, ".css"));
      console.log(`[SCSS] ${event} → ${filename}`);
      compileazaScss(absScss, outCss);
    }
  });
}

const vect_foldere = ["temp", "backup"]; 

for (const nume of vect_foldere) {
  const caleAbs = path.join(__dirname, nume); 
  try {
    if (!fs.existsSync(caleAbs)) {
      fs.mkdirSync(caleAbs, { recursive: true });
      console.log("Creat folder:", caleAbs);
    } else {
      console.log("Există deja:", caleAbs);
    }
  } catch (e) {
    console.error("Eroare la creare folder", caleAbs, "->", e.message);
  }
}

const app = exp();

const port = 8080;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

//incarcare erori json + imagini
initErori();

app.get("/resurse/*", (req, res, next) => {
  const p = req.path;
  if (!path.extname(p)) {
    return afisareEroare(res, 403);
  }
  next();
});

app.get("*.ejs", (req, res) => {
  afisareEroare(res, 400);   // 400 din erori.json
});

//4.18 incarcare favicon
app.get("/favicon.ico", (req, res) => {
  res.sendFile(path.join(__dirname, "resurse", "ico", "favicon.ico"));
});

//afisare ip-uri utlizatori
app.set("trust proxy", true); // ca să ia IP-ul real când e pe hosting

app.use((req, res, next) => {
  let ip = (req.headers["x-forwarded-for"]?.split(",")[0] || req.ip || "").trim();
  ip = ip.replace(/^::ffff:/, "");    // "::ffff:127.0.0.1" -> "127.0.0.1"
  if (ip === "::1") ip = "127.0.0.1"; // IPv6 localhost -> IPv4
  res.locals.clientIp = ip;
  next();
});

//functia de la 4.10
function randarePagina(res, view, data = {}) {
  const locals = { ...res.locals, ...data };
  res.render(view, locals, (err, html) => {
    if (err) {
      const msg = String(err?.message || "");
      if (msg.startsWith("Failed to lookup view")) {
        return afisareEroare(res, 404);     // din erori.json
      }
      return afisareEroare(res, 500, null, msg); // 500 generic (override text)
    }
    res.send(html);
  });
}

app.get(["/", "/index", "/home"], (req, res) => {
  randarePagina(res, 'pagini/index', { titlu: "Items Bazaar | Home" });
})

app.get("/demo-bootstrap", (req, res) => {
  randarePagina(res, "pagini/demo-bootstrap", { titlu: "Demo Bootstrap" });
});

app.get("/despre", (req, res) => {
  randarePagina(res, "pagini/despre", { titlu: "Items Bazaar | Despre" });
});

app.get("/:pagina", (req, res) => {
  // extragem numele paginii din URL
  let pagina = req.params.pagina;   // pentru /contact => "contact"

  if (!pagina) pagina = "index";

  randarePagina(res, "pagini/" + pagina, { titlu: "Items Bazaar | " + pagina });
});


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`)
    console.log("__dirname =", __dirname); //calea absoluta de unde se afla fisierul curent
    console.log("__filename =", __filename); //calea PANA la fisierul curent
    console.log("process.cwd() =", process.cwd());//folderul din care am pornit aplicatia, in cazul asta e acelasi cu dirname dar nu mereu
})
