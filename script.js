const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const scanner = document.getElementById("scanner");
const statusModal = document.querySelector(".status");
const resultModal = document.getElementById("resultCard");
const novaRow = document.getElementById("novaRow");
const nutrigradeModal = document.querySelector(".nutrigrade");
const additivesModal = document.querySelector(".additives-line");
const ingredientsModal = document.querySelector(".ingredients.ingredients--scroll");
const ingredientsSourceEl = document.getElementById("ingredientsSource");
const nova = document.querySelector(".nova");
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
      "Ține codul de bare în cadru, paralel cu ecranul, la lumină stabilă.",
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
let lastIngredientsMeta = { showSource: false, sourceLang: "" };

let cameraStream = null;
let quaggaDecodeHandled = false;
let barcodeDetectorInterval = null;
let barcodeFallbackTimer = null;
let bdDetecting = false;

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

function applyI18n() {
  document.documentElement.lang = uiLang === "ro" ? "ro" : "en";
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const k = el.getAttribute("data-i18n");
    if (k) el.textContent = t(k);
  });
  const autoOpt = ingredientsLangPref?.querySelector('option[value="auto"]');
  if (autoOpt) autoOpt.textContent = t("prefAuto");
  document.getElementById("startBtn").textContent = t("scan");
  if (manualOpenBtn) manualOpenBtn.textContent = t("enterManually");
  if (manualCancel) manualCancel.textContent = t("cancel");
  const manualSubmit = document.getElementById("manualSubmit");
  if (manualSubmit) manualSubmit.textContent = t("lookUp");
  const manualLabel = manualDialog?.querySelector("[data-i18n]");
  if (manualLabel) {
    const k = manualLabel.getAttribute("data-i18n");
    if (k) manualLabel.textContent = t(k);
  }
  document.querySelectorAll(".lang-toggle__btn").forEach((btn) => {
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
}

function setUiLang(lang) {
  uiLang = lang === "ro" ? "ro" : "en";
  localStorage.setItem(UI_LANG_KEY, uiLang);
  applyI18n();
}

function resolveProductName(product) {
  if (!product) return null;
  const main = product.product_name;
  if (typeof main === "string" && main.trim().length > 0) return main.trim();
  const keys = Object.keys(product);
  const key = keys.find(
    (k) =>
      k.startsWith("product_name_") &&
      typeof product[k] === "string" &&
      product[k].trim().length > 0
  );
  return key ? product[key].trim() : null;
}

function resolveProductImage(product) {
  if (!product) return null;
  if (typeof product.image_front_url === "string" && product.image_front_url)
    return product.image_front_url;
  if (typeof product.image_url === "string" && product.image_url)
    return product.image_url;
  const small = product.selected_images?.front?.small;
  if (small && typeof small === "object") {
    const lang = product.lang || "en";
    return (
      small[lang] ||
      small.en ||
      small.fr ||
      Object.values(small).find((u) => typeof u === "string" && u.length > 0) ||
      null
    );
  }
  return null;
}

function nutriGradeAssetUrl(gradeLetter) {
  if (gradeLetter == null || gradeLetter === "") return null;
  const g = String(gradeLetter).trim().toLowerCase();
  if (!"abcde".includes(g)) return null;
  const name = g === "c" ? "nutri-c" : `nutri-${g.toUpperCase()}`;
  return `assets/${name}.jpg`;
}

function hideResultDetails() {
  novaRow.classList.add("hidden");
  nutrigradeModal.classList.add("hidden");
  additivesModal.classList.add("hidden");
  ingredientsModal.classList.add("hidden");
  ingredientsSourceEl.classList.add("hidden");
  document.querySelectorAll(".result-block").forEach((el) => {
    el.classList.remove("is-revealed");
  });
}

function revealBlock(element, delayMs) {
  const block = element?.closest?.(".result-block");
  if (!block) return;
  setTimeout(() => block.classList.add("is-revealed"), delayMs);
}

function updateScannerOrientation() {
  const land = window.matchMedia("(orientation: landscape)").matches;
  scanner.classList.toggle("scanner--landscape", land);
}

const displayMessage = function () {
  document.querySelector(".product--name").textContent = productName;
  resultModal.classList.remove("hidden");
  hideResultDetails();

  document
    .querySelectorAll(".score-section.result-block")
    .forEach((el) => el.classList.add("is-revealed"));

  const imageUrl = productImage;
  if (imageUrl) {
    const img = document.querySelector(".product--image");
    img.src = imageUrl;
    img.alt = productName || "Product";
    img.classList.remove("hidden");
  } else {
    const img = document.querySelector(".product--image");
    img.removeAttribute("src");
    img.alt = "";
    img.classList.add("hidden");
  }

  if (novaGroup >= 1 && novaGroup <= 4) {
    novaRow.classList.remove("hidden");
    nova.src = `assets/${novaGroup}.svg`;
    nova.alt = `NOVA ${novaGroup}`;
    revealBlock(nova, 0);
  } else {
    novaRow.classList.add("hidden");
    nova.removeAttribute("src");
    nova.alt = "";
  }

  setTimeout(() => {
    const nutriSrc = nutriGradeAssetUrl(grade);
    if (nutriSrc) {
      nutrigradeModal.src = nutriSrc;
      nutrigradeModal.alt = `Nutri-Score ${String(grade).toUpperCase()}`;
      nutrigradeModal.classList.remove("hidden");
      revealBlock(nutrigradeModal, 0);
    } else {
      nutrigradeModal.removeAttribute("src");
      nutrigradeModal.classList.add("hidden");
    }
  }, 400);

  setTimeout(() => {
    const additivesLabel =
      additivesNumber != null && additivesNumber !== ""
        ? tReplace("additivesCount", { n: additivesNumber })
        : t("additivesNotListed");
    additivesModal.textContent = additivesLabel;
    additivesModal.classList.remove("hidden");
    revealBlock(additivesModal, 0);
  }, 400);

  setTimeout(() => {
    ingredientsModal.textContent =
      ingredients || t("noIngredients");
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

function handleScan(decodedData) {
  const digits = String(decodedData).replace(/\D/g, "");
  if (!digits) return;
  barcode = digits;
  if (barcodeDisplay) {
    barcodeDisplay.textContent = barcode;
    barcodeDisplay.classList.remove("feedback__barcode--empty");
  }

  setStatus(t("loadingProduct"), "scanning");

  const apiUrl = `https://world.openfoodfacts.net/api/v2/product/${encodeURIComponent(barcode)}`;

  fetch(apiUrl)
    .then(async (response) => {
      const text = await response.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error("Invalid response from server");
      }
      return json;
    })
    .then((json) => {
      if (json.status != 1 || !json.product) {
        resultModal.classList.add("hidden");
        setStatus(t("productNotFound"), "error");
        return;
      }

      const product = json.product;
      productName = resolveProductName(product);
      if (!productName) {
        resultModal.classList.add("hidden");
        setStatus(t("noProductName"), "error");
        return;
      }

      const rawNova = product.nova_group;
      novaGroup =
        typeof rawNova === "number"
          ? rawNova
          : parseInt(String(rawNova), 10);
      if (Number.isNaN(novaGroup)) novaGroup = null;

      grade = product.nutriscore_grade || null;

      const addN = product.additives_n;
      additivesNumber =
        typeof addN === "number"
          ? addN
          : addN != null && String(addN).trim() !== ""
            ? addN
            : null;

      const ingMeta = resolveIngredientsWithMeta(
        product,
        getIngredientsPref()
      );
      ingredients = ingMeta.text;
      lastIngredientsMeta = {
        showSource: ingMeta.showSource,
        sourceLang: ingMeta.sourceLang || "",
      };

      productImage = resolveProductImage(product);

      setStatus(t("loadedProduct"), "success");
      displayMessage();
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
      resultModal.classList.add("hidden");
      setStatus(t("fetchError"), "error");
    });
}

function stopCameraAndQuagga() {
  clearBarcodeDetectionTimers();
  try {
    Quagga.stop();
  } catch {
    /* noop */
  }
  if (cameraStream) {
    cameraStream.getTracks().forEach((tr) => tr.stop());
    cameraStream = null;
  }
  if (video.srcObject) {
    const tracks = video.srcObject.getTracks?.() || [];
    tracks.forEach((tr) => tr.stop());
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
  setTimeout(() => scanner.classList.remove("flashing-border"), 1500);
}

function startQuaggaFromStream() {
  const config = {
    inputStream: {
      name: "Live",
      type: "LiveStream",
      target: video,
    },
    locator: {
      patchSize: "medium",
      halfSample: true,
    },
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
      const code = result.codeResult.code;
      onBarcodeDecoded(code);
    }

    Quagga.onDetected(onDetected);
    Quagga.start();
  });
}

function startNativeBarcodeLoop() {
  let detector;
  try {
    detector = new BarcodeDetector({ formats: ["ean_13", "ean_8"] });
  } catch (e) {
    console.warn("BarcodeDetector failed, using Quagga:", e);
    startQuaggaFromStream();
    return;
  }

  barcodeDetectorInterval = window.setInterval(async () => {
    if (quaggaDecodeHandled || !video.srcObject || video.readyState < 2) return;
    if (bdDetecting) return;
    bdDetecting = true;
    try {
      const codes = await detector.detect(video);
      if (codes.length > 0 && !quaggaDecodeHandled) {
        const raw =
          codes[0].rawValue ||
          codes[0].rawvalue ||
          codes[0].value ||
          "";
        if (raw) onBarcodeDecoded(String(raw));
      }
    } catch {
      /* frame may fail transiently */
    }
    bdDetecting = false;
  }, BD_TICK_MS);

  barcodeFallbackTimer = window.setTimeout(() => {
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

  if (barcodeDisplay) {
    barcodeDisplay.textContent = t("noBarcodeYet");
    barcodeDisplay.classList.add("feedback__barcode--empty");
  }

  resultModal.classList.add("hidden");
  document.querySelector(".product--image")?.classList.add("hidden");
  hideResultDetails();

  scanner.style.display = "block";
  scanner.classList.remove("flashing-border");
  updateScannerOrientation();

  const constraints = {
    video: {
      facingMode: "environment",
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
  };

  setStatus(`${t("scanning")} ${t("scanHint")}`, "scanning");

  navigator.mediaDevices
    .getUserMedia(constraints)
    .then((stream) => {
      cameraStream = stream;
      video.srcObject = stream;
      return video.play();
    })
    .then(async () => {
      const useBD = await barcodeDetectorSupported();
      if (useBD) {
        startNativeBarcodeLoop();
      } else {
        startQuaggaFromStream();
      }
    })
    .catch((error) => {
      console.error("Error accessing camera:", error);
      stopScannerHardware();
      scanner.style.display = "none";
      setStatus(t("cameraError"), "error");
    });
}

function initDemoModeFromStorage() {
  if (!demoModeInput) return;
  const stored = localStorage.getItem(DEMO_STORAGE_KEY);
  if (stored !== null) demoModeInput.checked = stored === "1";
  demoModeInput.addEventListener("change", () => {
    localStorage.setItem(DEMO_STORAGE_KEY, demoModeInput.checked ? "1" : "0");
  });
}

function initIngredientsPrefFromStorage() {
  if (!ingredientsLangPref) return;
  const stored = localStorage.getItem(INGREDIENTS_PREF_KEY);
  if (stored === "ro" || stored === "en" || stored === "auto") {
    ingredientsLangPref.value = stored;
  }
  ingredientsLangPref.addEventListener("change", () => {
    localStorage.setItem(INGREDIENTS_PREF_KEY, ingredientsLangPref.value);
  });
}

function initUiLangFromStorage() {
  const stored = localStorage.getItem(UI_LANG_KEY);
  if (stored === "ro" || stored === "en") uiLang = stored;
}

document.getElementById("startBtn").addEventListener("click", () => {
  if (demoModeInput?.checked) fakeScanner();
  else startScanner();
});

document.querySelectorAll(".lang-toggle__btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    setUiLang(btn.getAttribute("data-lang"));
  });
});

window.addEventListener("orientationchange", () => {
  requestAnimationFrame(updateScannerOrientation);
});

manualOpenBtn?.addEventListener("click", () => {
  manualBarcodeInput.value = "";
  manualDialog.showModal();
});

manualCancel?.addEventListener("click", () => manualDialog.close());

manualForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const raw = manualBarcodeInput.value.trim().replace(/\D/g, "");
  manualDialog.close();
  if (raw.length >= 8) handleScan(raw);
});

initUiLangFromStorage();
initDemoModeFromStorage();
initIngredientsPrefFromStorage();
applyI18n();
