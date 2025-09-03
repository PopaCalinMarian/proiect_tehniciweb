const fs = require("fs");
const path = require("path");

const obGlobal = { obErori: null };

function initErori(){
    const caleJson = path.join(__dirname, "resurse", "json", "erori.json");

  try {
    const raw = fs.readFileSync(caleJson, "utf8");
    const data = JSON.parse(raw);

    const baza = String(data.cale_baza || "").replace(/\/+$/, ""); // ex: "/resurse/img/erori"

    const eroare_default = data.eroare_default ? {
      ...data.eroare_default,
      imagine: data.eroare_default.imagine
        ? `${baza}/${String(data.eroare_default.imagine).replace(/^\/+/, "")}`
        : undefined
    } : null;

    const info_erori = Array.isArray(data.info_erori)
      ? data.info_erori.map(e => ({
          ...e,
          imagine: e.imagine
            ? `${baza}/${String(e.imagine).replace(/^\/+/, "")}`
            : undefined
        }))
      : [];

    obGlobal.obErori = {
      cale_baza: baza,
      eroare_default,
      info_erori
    };
  } catch (err) {
    console.error("[initErori] Nu s-a putut citi erori.json:", err.message);
    // fallback minimal ca să nu pice randarea
    obGlobal.obErori = {
      cale_baza: "/resurse/img/erori",
      eroare_default: {
        titlu: "Eroare",
        text: "A apărut o problemă.",
        imagine: "/resurse/img/erori/default.png"
      },
      info_erori: []
    };
  }
}

function afisareEroare(res, identificator, titlu, text, imagine) {
  const ob = obGlobal.obErori || {};
  const baza = String(ob.cale_baza || "").replace(/\/+$/, "");

  // 1) pornim de la default
  let er = ob.eroare_default ? { ...ob.eroare_default, status: false } : {
    titlu: "Eroare", text: "A apărut o problemă.", imagine: baza ? `${baza}/default.png` : "/resurse/img/erori/default.png", status: false
  };

  // 2) dacă avem identificator și există în info_erori, îl folosim
  if (identificator != null && Array.isArray(ob.info_erori)) {
    const gasita = ob.info_erori.find(e => e.identificator === identificator);
    if (gasita) er = { ...gasita };
  }

  // 3) override-uri (au prioritate peste JSON)
  if (titlu) er.titlu = titlu;
  if (text)  er.text  = text;
  if (imagine) {
    // dacă a venit relativă, o alipim la cale_baza
    er.imagine = imagine.startsWith("/")
      ? imagine
      : (baza ? `${baza}/${imagine.replace(/^\/+/, "")}` : `/${imagine.replace(/^\/+/, "")}`);
  }

  // 4) status code: doar dacă eroarea are status:true în JSON
  const statusCode = er.status ? (typeof identificator === "number" ? identificator : 500) : 200;

  // 5) randăm pagina de eroare
  return res.status(statusCode).render("pagini/eroare", {
    titlu: er.titlu,
    text:  er.text,
    imagine: er.imagine
  });
}