const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const scanner = document.getElementById("scanner");
const statusModal = document.querySelector(".status");
const resultModal = document.getElementById("resultCard");
const novaRow = document.getElementById("novaRow");
const novaBadgeEl = document.getElementById("novaBadge");
const nutriBadgeEl = document.getElementById("nutriBadge");
const additivesModal = document.querySelector(".additives-line");
const ingredientsModal = document.querySelector(
  ".ingredients.ingredients--scroll"
);
const ingredientsSourceEl = document.getElementById("ingredientsSource");
const barcodeDisplay = document.getElementById("barcodeDisplay");
const demoModeInput = document.getElementById("demoMode");
const ingredientsLangPref = document.getElementById("ingredientsLangPref");
const manualDialog = document.getElementById("manualDialog");
const manualForm = document.getElementById("manualForm");
const manualOpenBtn = document.getElementById("manualOpenBtn");
const manualCancel = document.getElementById("manualCancel");
const manualBarcodeInput = document.getElementById("manualBarcodeInput");

const DEMO_STORAGE_KEY = "foodscanner_demo_mode";
const UI_LANG_KEY = "nutrisavvy_ui_lang";
const INGREDIENTS_PREF_KEY = "nutrisavvy_ingredients_lang";
const THEME_KEY = "nutrisavvy_theme";
const HISTORY_KEY = "nutrisavvy_history";
const HISTORY_MAX = 15;
const BD_FALLBACK_MS = 25000;
const BD_TICK_MS = 100;

const STRINGS = {
  en: {
    scan: "Scan",
    enterManually: "Enter code manually",
    demoBarcode: "Demo barcode",
    ingredientsPrefLabel: "Ingredients language",
    prefAuto: "Auto",
    noBarcodeYet: "No barcode yet",
    loadingProduct: "Loading product…",
    loadedProduct: "Loaded product",
    productNotFound: "Product not found — try another barcode",
    noProductName: "No product name found — check barcode and retry",
    fetchError: "Could not load product data — check connection",
    scanning: "Scanning…",
    scanHint: "Hold the barcode flat inside the frame, parallel to the screen.",
    scannerFailed: "Scanner failed to start",
    cameraError: "Camera access denied or unavailable",
    manualBarcodeLabel: "Barcode (digits)",
    cancel: "Cancel",
    lookUp: "Look up",
    novaTitle: "NOVA",
    novaHint: "Food processing scale (1–4)",
    nutriTitle: "Nutri-Score",
    nutriHint: "Relative nutrition for this category",
    ingredientsHeading: "Ingredients",
    additivesNotListed: "Additives: not listed",
    additivesCount: "{n} additives",
    noIngredients: "No ingredients listed for this product.",
    ingredientsSource: "Shown in {lang} (from Open Food Facts)",
    legendSummary: "What do NOVA and Nutri-Score mean?",
    legendNovaHeading: "NOVA groups",
    legendNova1: "1 — Unprocessed or minimally processed foods",
    legendNova2: "2 — Processed culinary ingredients (oils, sugar, salt…)",
    legendNova3: "3 — Processed foods",
    legendNova4: "4 — Ultra-processed foods",
    legendNutriHeading: "Nutri-Score",
    legendNutriP:
      "Letter grades compare similar products in the same category. They are not a full verdict on health — consider portions and your overall diet.",
    macrosHeading: "Nutrition per 100g",
    macrosHeadingFull: "Nutritional values",
    macroEnergy: "Energy",
    macroFat: "Fat",
    macroSatFat: "Sat. fat",
    macroSugars: "Sugars",
    macroProtein: "Protein",
    macroSalt: "Salt",
    historyHeading: "Recent scans",
    historyEmpty: "No scan history yet",
    emptyStateText: "Scan a product to get started",
    pullToRescan: "Pull to rescan",
  },
  ro: {
    scan: "Scanează",
    enterManually: "Introdu codul manual",
    demoBarcode: "Cod demo",
    ingredientsPrefLabel: "Limba ingredientelor",
    prefAuto: "Automat",
    noBarcodeYet: "Niciun cod încă",
    loadingProduct: "Se încarcă produsul…",
    loadedProduct: "Produs încărcat",
    productNotFound: "Produs negăsit — încearcă alt cod",
    noProductName: "Fără nume de produs — verifică codul",
    fetchError: "Nu s-au putut încărca datele — verifică conexiunea",
    scanning: "Scanare…",
    scanHint:
      "Ține codul de bare în cadru la lumina bună, paralel cu ecranul.",
    scannerFailed: "Scannerul nu a pornit",
    cameraError: "Cameră indisponibilă sau refuzată",
    manualBarcodeLabel: "Cod de bare (cifre)",
    cancel: "Renunță",
    lookUp: "Caută",
    novaTitle: "NOVA",
    novaHint: "Scara de procesare (1–4)",
    nutriTitle: "Nutri-Score",
    nutriHint: "Nutriție relativă, pe categorie",
    ingredientsHeading: "Ingrediente",
    additivesNotListed: "Aditivi: nelistați",
    additivesCount: "{n} aditivi",
    noIngredients: "Fără listă de ingrediente pentru acest produs.",
    ingredientsSource: "Afișat în {lang} (din Open Food Facts)",
    legendSummary: "Ce înseamnă NOVA și Nutri-Score?",
    legendNovaHeading: "Grupe NOVA",
    legendNova1: "1 — Nealimente sau minim procesate",
    legendNova2: "2 — Ingrediente culinare procesate (uleiuri, zahăr, sare…)",
    legendNova3: "3 — Alimente procesate",
    legendNova4: "4 — Alimente ultraprocesate",
    legendNutriHeading: "Nutri-Score",
    legendNutriP:
      "Literele compară produse similare din aceeași categorie. Nu înlocuiesc un sfat medical — ține cont de porții și de alimentația întreagă.",
    macrosHeading: "Nutriție per 100g",
    macrosHeadingFull: "Valori nutriționale",
    macroEnergy: "Energie",
    macroFat: "Grăsimi",
    macroSatFat: "Grăsimi sat.",
    macroSugars: "Zaharuri",
    macroProtein: "Proteine",
    macroSalt: "Sare",
    historyHeading: "Scanări recente",
    historyEmpty: "Nicio scanare anterioară",
    emptyStateText: "Scanează un produs pentru a începe",
    pullToRescan: "Trage pentru a rescana",
  },
};

let uiLang = "en";
let barcode;
let novaGroup;
let grade;
let additivesNumber;
let productName;
let ingredients;
let productImage;
let lastNutriments = null;
let lastProductQuantity = null;      // numeric, e.g. 330
let lastProductQuantityUnit = null;  // "g" or "ml"
let lastProductQuantityLabel = null; // raw string e.g. "330 g (1 bottle)"
let lastIngredientsMeta = { showSource: false, sourceLang: "" };

let cameraStream = null;
let quaggaDecodeHandled = false;
let barcodeDetectorInterval = null;
let barcodeFallbackTimer = null;
let bdDetecting = false;

/* ── i18n helpers ── */

function t(key) {
  const pack = STRINGS[uiLang] || STRINGS.en;
  return pack[key] ?? STRINGS.en[key] ?? key;
}

function tReplace(key, vars) {
  let s = t(key);
  if (vars) {
    Object.keys(vars).forEach((k) => {
      s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(vars[k]));
    });
  }
  return s;
}

function getNavigatorLang() {
  return (navigator.language || "en").split("-")[0].toLowerCase();
}

function getIngredientsPref() {
  const v = ingredientsLangPref?.value || "auto";
  return v === "ro" || v === "en" ? v : "auto";
}

function sourceLangFromKey(key, product) {
  if (key === "ingredients_text" || key === "ingredients_text_with_allergens") {
    const lc = (product.lang || "").toLowerCase();
    return lc ? lc.toUpperCase() : "—";
  }
  const m = key.match(/^ingredients_text_([a-z]{2})$/i);
  return m ? m[1].toUpperCase() : "—";
}

function resolveIngredientsWithMeta(product, pref) {
  if (!product) {
    return { text: null, sourceLang: null, showSource: false };
  }
  const nav = getNavigatorLang();
  const order = [];
  const add = (k) => {
    if (k && !order.includes(k)) order.push(k);
  };
  if (pref === "auto") {
    add(`ingredients_text_${nav}`);
    add("ingredients_text_en");
    add("ingredients_text_ro");
  } else {
    add(`ingredients_text_${pref}`);
    add("ingredients_text_en");
    add("ingredients_text_ro");
  }
  add("ingredients_text");
  add("ingredients_text_with_allergens");
  Object.keys(product)
    .filter((k) => /^ingredients_text_[a-z]{2}$/i.test(k))
    .sort()
    .forEach(add);

  for (const key of order) {
    const val = product[key];
    if (typeof val !== "string" || !val.trim()) continue;
    const sourceLang = sourceLangFromKey(key, product);
    const sl = sourceLang.toLowerCase();
    const showSource =
      pref === "auto" ? sl !== nav : sl !== pref.toLowerCase();
    return { text: val.trim(), sourceLang, showSource };
  }
  return { text: null, sourceLang: null, showSource: false };
}

/* ── Barcode detection ── */

async function barcodeDetectorSupported() {
  if (typeof BarcodeDetector === "undefined") return false;
  try {
    const formats = await BarcodeDetector.getSupportedFormats();
    return (
      formats.includes("ean_13") ||
      formats.includes("ean-13") ||
      formats.includes("ean_8")
    );
  } catch {
    return false;
  }
}

function clearBarcodeDetectionTimers() {
  if (barcodeDetectorInterval != null) {
    clearInterval(barcodeDetectorInterval);
    barcodeDetectorInterval = null;
  }
  if (barcodeFallbackTimer != null) {
    clearTimeout(barcodeFallbackTimer);
    barcodeFallbackTimer = null;
  }
  bdDetecting = false;
}

/* ── UI helpers ── */

function setStatus(message, variant) {
  statusModal.textContent = message;
  statusModal.classList.remove(
    "hidden",
    "status--scanning",
    "status--success",
    "status--error"
  );
  statusModal.classList.add("status");
  if (variant === "scanning") statusModal.classList.add("status--scanning");
  else if (variant === "success") statusModal.classList.add("status--success");
  else if (variant === "error") statusModal.classList.add("status--error");
}

function showSkeleton() {
  var sk = document.getElementById("skeletonCard");
  if (sk) sk.classList.remove("hidden");
  resultModal.classList.add("hidden");
}

function hideSkeleton() {
  var sk = document.getElementById("skeletonCard");
  if (sk) sk.classList.add("hidden");
}

function hideEmptyState() {
  var el = document.getElementById("emptyState");
  if (el) el.classList.add("hidden");
}

/* ── Dark mode ── */

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  var icon = document.getElementById("darkToggleIcon");
  if (icon) {
    icon.textContent = theme === "dark" ? "light_mode" : "dark_mode";
  }
  var metaTheme = document.getElementById("meta-theme-color");
  if (metaTheme) {
    metaTheme.content = theme === "dark" ? "#1e1e1e" : "#2e7d32";
  }
}

function initDarkMode() {
  var saved = localStorage.getItem(THEME_KEY);
  var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  var isDark = saved === "dark" || (saved === null && prefersDark);
  applyTheme(isDark ? "dark" : "light");
}

/* ── Macro nutritional table ── */

function renderMacros(nutriments) {
  var macrosTable = document.getElementById("macrosTable");
  var macrosHeadingEl = document.querySelector(".macros-heading");
  if (!macrosTable) return;
  if (!nutriments) {
    macrosTable.innerHTML = "";
    return;
  }

  var hasTotal = lastProductQuantity != null && lastProductQuantity > 0;
  var unit100 = "100\u00a0" + (lastProductQuantityUnit || "g");
  var qtyDisplay =
    lastProductQuantityLabel ||
    lastProductQuantity + "\u00a0" + (lastProductQuantityUnit || "g");

  if (macrosHeadingEl) {
    macrosHeadingEl.textContent = hasTotal
      ? t("macrosHeadingFull")
      : t("macrosHeading");
  }

  var fields = [
    { key: "energy-kcal_100g", labelKey: "macroEnergy", unit: "kcal" },
    { key: "fat_100g", labelKey: "macroFat", unit: "g" },
    { key: "saturated-fat_100g", labelKey: "macroSatFat", unit: "g" },
    { key: "sugars_100g", labelKey: "macroSugars", unit: "g" },
    { key: "proteins_100g", labelKey: "macroProtein", unit: "g" },
    { key: "salt_100g", labelKey: "macroSalt", unit: "g" },
  ];

  var header = hasTotal
    ? "<thead><tr>" +
      '<th class="macros-th macros-th--label"></th>' +
      '<th class="macros-th">per ' + unit100 + "</th>" +
      '<th class="macros-th macros-th--total">per ' + qtyDisplay + "</th>" +
      "</tr></thead>"
    : "";

  var rows = fields
    .map(function (f) {
      var val = nutriments[f.key];
      var hasVal = val != null && val !== "";
      var per100 = hasVal
        ? parseFloat(val).toFixed(1) + "\u00a0" + f.unit
        : "—";

      var totalCell = "";
      if (hasTotal) {
        var totalVal = hasVal
          ? ((parseFloat(val) * lastProductQuantity) / 100).toFixed(1) +
            "\u00a0" + f.unit
          : "—";
        totalCell =
          '<td class="macros-value macros-value--total">' + totalVal + "</td>";
      }

      return (
        "<tr>" +
        '<td class="macros-label">' + t(f.labelKey) + "</td>" +
        '<td class="macros-value">' + per100 + "</td>" +
        totalCell +
        "</tr>"
      );
    })
    .join("");

  macrosTable.innerHTML = header + "<tbody>" + rows + "</tbody>";
}

/* ── Scan history ── */

function saveToHistory(item) {
  var history = [];
  try {
    history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    history = [];
  }
  history = history.filter(function (h) {
    return h.barcode !== item.barcode;
  });
  history.unshift(item);
  history = history.slice(0, HISTORY_MAX);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  var list = document.getElementById("historyList");
  var empty = document.getElementById("historyEmpty");
  if (!list) return;

  var history = [];
  try {
    history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    history = [];
  }

  if (history.length === 0) {
    list.innerHTML = "";
    if (empty) empty.classList.remove("hidden");
    return;
  }

  if (empty) empty.classList.add("hidden");

  list.innerHTML = history
    .map(function (item) {
      var novaBadge =
        item.nova >= 1 && item.nova <= 4
          ? '<div class="nova-badge nova-' +
            item.nova +
            '" aria-label="NOVA ' +
            item.nova +
            '">' +
            item.nova +
            "</div>"
          : "";
      var g = item.nutriScore ? item.nutriScore.toLowerCase() : "";
      var nutriBadge =
        g && "abcde".indexOf(g) !== -1
          ? '<div class="nutri-badge nutri-' +
            g +
            '" aria-label="Nutri-Score ' +
            g.toUpperCase() +
            '">' +
            g.toUpperCase() +
            "</div>"
          : "";
      var name = item.name
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .substring(0, 50);
      return (
        '<li class="history-item" data-barcode="' +
        item.barcode +
        '">' +
        '<span class="history-item__name">' +
        name +
        "</span>" +
        '<span class="history-item__badges">' +
        novaBadge +
        nutriBadge +
        "</span>" +
        "</li>"
      );
    })
    .join("");

  list.querySelectorAll(".history-item").forEach(function (li) {
    li.addEventListener("click", function () {
      handleScan(li.dataset.barcode);
    });
  });
}

/* ── i18n application ── */

function applyI18n() {
  document.documentElement.lang = uiLang === "ro" ? "ro" : "en";
  document.querySelectorAll("[data-i18n]").forEach(function (el) {
    var k = el.getAttribute("data-i18n");
    if (k) el.textContent = t(k);
  });
  var autoOpt = ingredientsLangPref?.querySelector('option[value="auto"]');
  if (autoOpt) autoOpt.textContent = t("prefAuto");
  document.getElementById("startBtn").textContent = t("scan");
  if (manualOpenBtn) manualOpenBtn.textContent = t("enterManually");
  if (manualCancel) manualCancel.textContent = t("cancel");
  var manualSubmit = document.getElementById("manualSubmit");
  if (manualSubmit) manualSubmit.textContent = t("lookUp");
  var manualLabel = manualDialog?.querySelector("[data-i18n]");
  if (manualLabel) {
    var k2 = manualLabel.getAttribute("data-i18n");
    if (k2) manualLabel.textContent = t(k2);
  }
  document.querySelectorAll(".lang-toggle__btn").forEach(function (btn) {
    btn.setAttribute(
      "aria-pressed",
      btn.getAttribute("data-lang") === uiLang ? "true" : "false"
    );
  });
  if (
    barcodeDisplay?.classList.contains("feedback__barcode--empty") &&
    !barcode
  ) {
    barcodeDisplay.textContent = t("noBarcodeYet");
  }
  renderHistory();
  if (lastNutriments) renderMacros(lastNutriments);
}

function setUiLang(lang) {
  uiLang = lang === "ro" ? "ro" : "en";
  localStorage.setItem(UI_LANG_KEY, uiLang);
  applyI18n();
}

/* ── Product data resolution ── */

function resolveProductName(product) {
  if (!product) return null;
  var main = product.product_name;
  if (typeof main === "string" && main.trim().length > 0) return main.trim();
  var keys = Object.keys(product);
  var key = keys.find(function (k) {
    return (
      k.startsWith("product_name_") &&
      typeof product[k] === "string" &&
      product[k].trim().length > 0
    );
  });
  return key ? product[key].trim() : null;
}

function resolveProductImage(product) {
  if (!product) return null;
  if (typeof product.image_front_url === "string" && product.image_front_url)
    return product.image_front_url;
  if (typeof product.image_url === "string" && product.image_url)
    return product.image_url;
  var small = product.selected_images?.front?.small;
  if (small && typeof small === "object") {
    var lang = product.lang || "en";
    return (
      small[lang] ||
      small.en ||
      small.fr ||
      Object.values(small).find(function (u) {
        return typeof u === "string" && u.length > 0;
      }) ||
      null
    );
  }
  return null;
}

/* ── Result card rendering ── */

function hideResultDetails() {
  novaRow.classList.add("hidden");
  nutriBadgeEl.classList.add("hidden");
  additivesModal.classList.add("hidden");
  ingredientsModal.classList.add("hidden");
  ingredientsSourceEl.classList.add("hidden");
  document.querySelectorAll(".result-block").forEach(function (el) {
    el.classList.remove("is-revealed");
  });
}

function revealBlock(element, delayMs) {
  var block = element?.closest?.(".result-block");
  if (!block) return;
  setTimeout(function () {
    block.classList.add("is-revealed");
  }, delayMs);
}

function updateScannerOrientation() {
  var land = window.matchMedia("(orientation: landscape)").matches;
  scanner.classList.toggle("scanner--landscape", land);
}

var displayMessage = function () {
  document.querySelector(".product--name").textContent = productName;
  resultModal.classList.remove("hidden");
  hideResultDetails();

  document
    .querySelectorAll(".score-section.result-block")
    .forEach(function (el) {
      el.classList.add("is-revealed");
    });

  // Product image
  var imageUrl = productImage;
  if (imageUrl) {
    var img = document.querySelector(".product--image");
    img.src = imageUrl;
    img.alt = productName || "Product";
    img.classList.remove("hidden");
  } else {
    var img2 = document.querySelector(".product--image");
    img2.removeAttribute("src");
    img2.alt = "";
    img2.classList.add("hidden");
  }

  // NOVA badge (CSS)
  if (novaGroup >= 1 && novaGroup <= 4) {
    novaRow.classList.remove("hidden");
    novaBadgeEl.className = "nova-badge nova-" + novaGroup;
    novaBadgeEl.textContent = String(novaGroup);
    novaBadgeEl.setAttribute("aria-label", "NOVA " + novaGroup);
    revealBlock(novaBadgeEl, 0);
  } else {
    novaRow.classList.add("hidden");
    novaBadgeEl.className = "nova-badge";
    novaBadgeEl.textContent = "";
  }

  // Nutri-Score badge (CSS)
  setTimeout(function () {
    var g = grade ? String(grade).trim().toLowerCase() : null;
    if (g && "abcde".indexOf(g) !== -1) {
      nutriBadgeEl.className = "nutri-badge nutri-" + g;
      nutriBadgeEl.textContent = g.toUpperCase();
      nutriBadgeEl.setAttribute(
        "aria-label",
        "Nutri-Score " + g.toUpperCase()
      );
      revealBlock(nutriBadgeEl, 0);
    } else {
      nutriBadgeEl.className = "nutri-badge hidden";
      nutriBadgeEl.textContent = "";
    }
  }, 400);

  // Additives
  setTimeout(function () {
    var additivesLabel =
      additivesNumber != null && additivesNumber !== ""
        ? tReplace("additivesCount", { n: additivesNumber })
        : t("additivesNotListed");
    additivesModal.textContent = additivesLabel;
    additivesModal.classList.remove("hidden");
    revealBlock(additivesModal, 0);
  }, 400);

  // Macros table
  setTimeout(function () {
    if (lastNutriments) {
      renderMacros(lastNutriments);
      revealBlock(document.getElementById("macrosTable"), 0);
    }
  }, 400);

  // Ingredients
  setTimeout(function () {
    ingredientsModal.textContent = ingredients || t("noIngredients");
    if (lastIngredientsMeta?.showSource && lastIngredientsMeta.sourceLang) {
      ingredientsSourceEl.textContent = tReplace("ingredientsSource", {
        lang: lastIngredientsMeta.sourceLang,
      });
      ingredientsSourceEl.classList.remove("hidden");
    } else {
      ingredientsSourceEl.classList.add("hidden");
    }
    ingredientsModal.classList.remove("hidden");
    revealBlock(ingredientsModal, 0);
  }, 400);
};

/* ── Scan handler ── */

function handleScan(decodedData) {
  hideEmptyState();
  var digits = String(decodedData).replace(/\D/g, "");
  if (!digits) return;
  barcode = digits;
  if (barcodeDisplay) {
    barcodeDisplay.textContent = barcode;
    barcodeDisplay.classList.remove("feedback__barcode--empty");
  }

  setStatus(t("loadingProduct"), "scanning");
  showSkeleton();

  var apiUrl =
    "https://world.openfoodfacts.net/api/v2/product/" +
    encodeURIComponent(barcode);

  fetch(apiUrl)
    .then(async function (response) {
      var text = await response.text();
      var json;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error("Invalid response from server");
      }
      return json;
    })
    .then(function (json) {
      if (json.status != 1 || !json.product) {
        hideSkeleton();
        resultModal.classList.add("hidden");
        setStatus(t("productNotFound"), "error");
        return;
      }

      var product = json.product;
      productName = resolveProductName(product);
      if (!productName) {
        hideSkeleton();
        resultModal.classList.add("hidden");
        setStatus(t("noProductName"), "error");
        return;
      }

      var rawNova = product.nova_group;
      novaGroup =
        typeof rawNova === "number" ? rawNova : parseInt(String(rawNova), 10);
      if (Number.isNaN(novaGroup)) novaGroup = null;

      grade = product.nutriscore_grade || null;

      var addN = product.additives_n;
      additivesNumber =
        typeof addN === "number"
          ? addN
          : addN != null && String(addN).trim() !== ""
            ? addN
            : null;

      var ingMeta = resolveIngredientsWithMeta(product, getIngredientsPref());
      ingredients = ingMeta.text;
      lastIngredientsMeta = {
        showSource: ingMeta.showSource,
        sourceLang: ingMeta.sourceLang || "",
      };

      productImage = resolveProductImage(product);
      lastNutriments = product.nutriments || null;

      var rawQty = product.product_quantity;
      var parsedQty = rawQty != null ? parseFloat(rawQty) : NaN;
      lastProductQuantity = !isNaN(parsedQty) && parsedQty > 0 ? parsedQty : null;
      lastProductQuantityUnit = product.product_quantity_unit || null;
      lastProductQuantityLabel = product.quantity || null;

      hideSkeleton();
      setStatus(t("loadedProduct"), "success");
      displayMessage();

      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(100);

      // Save to history
      saveToHistory({
        barcode: barcode,
        name: productName,
        nutriScore: grade || null,
        nova: novaGroup || null,
        ts: Date.now(),
      });
    })
    .catch(function (error) {
      console.error("Error fetching data:", error);
      hideSkeleton();
      resultModal.classList.add("hidden");
      setStatus(t("fetchError"), "error");
    });
}

/* ── Camera & scanner ── */

function stopCameraAndQuagga() {
  clearBarcodeDetectionTimers();
  try {
    Quagga.stop();
  } catch {
    /* noop */
  }
  if (cameraStream) {
    cameraStream.getTracks().forEach(function (tr) {
      tr.stop();
    });
    cameraStream = null;
  }
  if (video.srcObject) {
    var tracks = video.srcObject.getTracks?.() || [];
    tracks.forEach(function (tr) {
      tr.stop();
    });
    video.srcObject = null;
  }
  video.pause();
}

function stopScannerHardware() {
  stopCameraAndQuagga();
  quaggaDecodeHandled = false;
}

function onBarcodeDecoded(code) {
  if (quaggaDecodeHandled) return;
  quaggaDecodeHandled = true;
  stopCameraAndQuagga();
  scanner.classList.add("flashing-border");
  scanner.style.display = "none";
  handleScan(code);
  setTimeout(function () {
    scanner.classList.remove("flashing-border");
  }, 1500);
}

function startQuaggaFromStream() {
  var config = {
    inputStream: { name: "Live", type: "LiveStream", target: video },
    locator: { patchSize: "medium", halfSample: true },
    numOfWorkers: 2,
    frequency: 12,
    decoder: {
      readers: ["ean_reader", "ean_8_reader"],
      multiple: false,
      debug: {
        drawBoundingBox: false,
        showFrequency: false,
        drawScanline: false,
      },
    },
    locate: true,
  };

  Quagga.init(config, function (err) {
    if (err) {
      console.error("Error initializing Quagga:", err);
      stopScannerHardware();
      scanner.style.display = "none";
      setStatus(t("scannerFailed"), "error");
      return;
    }

    function onDetected(result) {
      if (quaggaDecodeHandled) return;
      try {
        Quagga.offDetected(onDetected);
      } catch {
        /* ignore */
      }
      onBarcodeDecoded(result.codeResult.code);
    }

    Quagga.onDetected(onDetected);
    Quagga.start();
  });
}

function startNativeBarcodeLoop() {
  var detector;
  try {
    detector = new BarcodeDetector({ formats: ["ean_13", "ean_8"] });
  } catch (e) {
    console.warn("BarcodeDetector failed, using Quagga:", e);
    startQuaggaFromStream();
    return;
  }

  barcodeDetectorInterval = window.setInterval(async function () {
    if (quaggaDecodeHandled || !video.srcObject || video.readyState < 2) return;
    if (bdDetecting) return;
    bdDetecting = true;
    try {
      var codes = await detector.detect(video);
      if (codes.length > 0 && !quaggaDecodeHandled) {
        var raw = codes[0].rawValue || codes[0].rawvalue || codes[0].value || "";
        if (raw) onBarcodeDecoded(String(raw));
      }
    } catch {
      /* frame may fail transiently */
    }
    bdDetecting = false;
  }, BD_TICK_MS);

  barcodeFallbackTimer = window.setTimeout(function () {
    if (quaggaDecodeHandled) return;
    clearBarcodeDetectionTimers();
    try {
      Quagga.stop();
    } catch {
      /* noop */
    }
    startQuaggaFromStream();
  }, BD_FALLBACK_MS);
}

function fakeScanner() {
  handleScan("54493438");
}

function startScanner() {
  stopScannerHardware();

  barcode = null;
  productName = null;
  novaGroup = null;
  grade = null;
  additivesNumber = null;
  ingredients = null;
  productImage = null;
  lastNutriments = null;
  lastProductQuantity = null;
  lastProductQuantityUnit = null;
  lastProductQuantityLabel = null;

  if (barcodeDisplay) {
    barcodeDisplay.textContent = t("noBarcodeYet");
    barcodeDisplay.classList.add("feedback__barcode--empty");
  }

  resultModal.classList.add("hidden");
  hideSkeleton();
  document.querySelector(".product--image")?.classList.add("hidden");
  hideResultDetails();

  scanner.style.display = "block";
  scanner.classList.remove("flashing-border");
  updateScannerOrientation();

  var constraints = {
    video: {
      facingMode: "environment",
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
  };

  setStatus(t("scanning") + " " + t("scanHint"), "scanning");

  navigator.mediaDevices
    .getUserMedia(constraints)
    .then(function (stream) {
      cameraStream = stream;
      video.srcObject = stream;
      return video.play();
    })
    .then(async function () {
      var useBD = await barcodeDetectorSupported();
      if (useBD) startNativeBarcodeLoop();
      else startQuaggaFromStream();
    })
    .catch(function (error) {
      console.error("Error accessing camera:", error);
      stopScannerHardware();
      scanner.style.display = "none";
      setStatus(t("cameraError"), "error");
    });
}

/* ── Storage init ── */

function initDemoModeFromStorage() {
  if (!demoModeInput) return;
  var stored = localStorage.getItem(DEMO_STORAGE_KEY);
  if (stored !== null) demoModeInput.checked = stored === "1";
  demoModeInput.addEventListener("change", function () {
    localStorage.setItem(DEMO_STORAGE_KEY, demoModeInput.checked ? "1" : "0");
  });
}

function initIngredientsPrefFromStorage() {
  if (!ingredientsLangPref) return;
  var stored = localStorage.getItem(INGREDIENTS_PREF_KEY);
  if (stored === "ro" || stored === "en" || stored === "auto") {
    ingredientsLangPref.value = stored;
  }
  ingredientsLangPref.addEventListener("change", function () {
    localStorage.setItem(INGREDIENTS_PREF_KEY, ingredientsLangPref.value);
  });
}

function initUiLangFromStorage() {
  var stored = localStorage.getItem(UI_LANG_KEY);
  if (stored === "ro" || stored === "en") uiLang = stored;
}

/* ── Pull-to-rescan gesture ── */

var pullStartY = 0;
var pullEligible = false;

document.addEventListener(
  "touchstart",
  function (e) {
    pullEligible = window.scrollY === 0;
    pullStartY = e.touches[0].clientY;
  },
  { passive: true }
);

document.addEventListener(
  "touchmove",
  function (e) {
    if (!pullEligible) return;
    var delta = e.touches[0].clientY - pullStartY;
    var indicator = document.getElementById("pullIndicator");
    if (delta > 60) {
      indicator?.classList.add("pull-indicator--visible");
    } else {
      indicator?.classList.remove("pull-indicator--visible");
    }
  },
  { passive: true }
);

document.addEventListener(
  "touchend",
  function (e) {
    if (!pullEligible) return;
    var indicator = document.getElementById("pullIndicator");
    indicator?.classList.remove("pull-indicator--visible");
    var delta = e.changedTouches[0].clientY - pullStartY;
    if (window.scrollY === 0 && delta > 80 && !quaggaDecodeHandled) {
      if (demoModeInput?.checked) fakeScanner();
      else startScanner();
    }
  },
  { passive: true }
);

/* ── Event listeners ── */

document.getElementById("startBtn").addEventListener("click", function () {
  if (demoModeInput?.checked) fakeScanner();
  else startScanner();
});

document.querySelectorAll(".lang-toggle__btn").forEach(function (btn) {
  btn.addEventListener("click", function () {
    setUiLang(btn.getAttribute("data-lang"));
  });
});

document.getElementById("darkToggle")?.addEventListener("click", function () {
  var current =
    document.documentElement.getAttribute("data-theme") || "light";
  var next = current === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
});

window.addEventListener("orientationchange", function () {
  requestAnimationFrame(updateScannerOrientation);
});

manualOpenBtn?.addEventListener("click", function () {
  manualBarcodeInput.value = "";
  manualDialog.showModal();
});

manualCancel?.addEventListener("click", function () {
  manualDialog.close();
});

manualForm?.addEventListener("submit", function (e) {
  e.preventDefault();
  var raw = manualBarcodeInput.value.trim().replace(/\D/g, "");
  manualDialog.close();
  if (raw.length >= 8) handleScan(raw);
});

/* ── Init ── */

initDarkMode();
initUiLangFromStorage();
initDemoModeFromStorage();
initIngredientsPrefFromStorage();
applyI18n();
renderHistory();

// Register Service Worker for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("./service-worker.js").catch(function () {
      // SW registration not critical
    });
  });
}
