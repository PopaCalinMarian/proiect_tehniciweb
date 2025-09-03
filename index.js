const exp = require('express');
const path = require("path");
const { initErori, afisareEroare, randarePagina } = require("./erori");

const app = exp();

const port = 8080;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use("/resurse", exp.static(path.join(__dirname, "resurse")));

//incarcare erori json + imagini
initErori();

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
