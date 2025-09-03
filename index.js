const exp = require('express');
const path = require("path");

const app = exp();

const port = 8080;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use("/resurse", exp.static(path.join(__dirname, "resurse")));

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
  res.render(view, data, (err, html) => {
    if (err) {
      const msg = String(err && err.message || "");
      // 1) pagina nu există -> 404
      if (msg.startsWith("Failed to lookup view")) {
        return res.status(404).render("pagini/404", { titlu: "Eroare 404" });
      }
      // 2) alt tip de eroare -> 500 (generic)
      console.error("Eroare randare:", err);
      return res.status(500).render("pagini/eroare", {
        titlu: "Eroare server",
        mesaj: msg
      });
    }
    // 3) fără erori -> trimite rezultatul randării
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
