const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const scanner = document.getElementById("scanner");
const statusModal = document.querySelector(".status");
const resultModal = document.querySelector(".result");
const nutriscoreModal = document.querySelector(".nutriscore");
const nutrigradeModal = document.querySelector(".nutrigrade");
const additivesModal = document.querySelector(".additives");
const ingredientsModal = document.querySelector(".ingredients");
const imageModal = document.querySelector(".product--image");
const nova = document.querySelector(".nova");
const barcodeDisplay = document.getElementById("barcodeDisplay");
const demoModeInput = document.getElementById("demoMode");

const DEMO_STORAGE_KEY = "foodscanner_demo_mode";

let barcode;
let novaGroup;
let grade;
let additivesNumber;
let productName;
let ingredients;
let productImage;

let cameraStream = null;
let quaggaDecodeHandled = false;

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

function resolveIngredientsText(product) {
  if (!product) return null;
  const lang = product.lang || "en";
  const localized = product[`ingredients_text_${lang}`];
  if (typeof localized === "string" && localized.trim()) return localized.trim();
  if (
    typeof product.ingredients_text === "string" &&
    product.ingredients_text.trim()
  )
    return product.ingredients_text.trim();
  if (
    typeof product.ingredients_text_with_allergens === "string" &&
    product.ingredients_text_with_allergens.trim()
  )
    return product.ingredients_text_with_allergens.trim();
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
  nutriscoreModal.classList.add("hidden");
  nutrigradeModal.classList.add("hidden");
  additivesModal.classList.add("hidden");
  ingredientsModal.classList.add("hidden");
  document.querySelectorAll(".result-block").forEach((el) => {
    el.classList.remove("is-revealed");
  });
}

function revealBlock(element, delayMs) {
  const block = element?.closest?.(".result-block");
  if (!block) return;
  setTimeout(() => block.classList.add("is-revealed"), delayMs);
}

const displayMessage = function () {
  document.querySelector(".product--name").textContent = productName;
  resultModal.classList.remove("hidden");
  hideResultDetails();

  const imageUrl = productImage;
  if (imageUrl) {
    imageModal.src = imageUrl;
    imageModal.alt = productName || "Product";
    imageModal.classList.remove("hidden");
  } else {
    imageModal.removeAttribute("src");
    imageModal.alt = "";
    imageModal.classList.add("hidden");
  }

  if (novaGroup >= 1 && novaGroup <= 4) {
    nutriscoreModal.classList.remove("hidden");
    nova.src = `assets/${novaGroup}.svg`;
    nova.alt = `NOVA group ${novaGroup}`;
    revealBlock(nova, 0);
  } else {
    nutriscoreModal.classList.add("hidden");
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
        ? `${additivesNumber} additives`
        : "Additives: not listed";
    additivesModal.textContent = additivesLabel;
    additivesModal.classList.remove("hidden");
    revealBlock(additivesModal, 0);
  }, 400);

  setTimeout(() => {
    ingredientsModal.textContent =
      ingredients || "No ingredients listed for this product.";
    ingredientsModal.classList.remove("hidden");
    revealBlock(ingredientsModal, 0);
  }, 400);
};

function handleScan(decodedData) {
  barcode = decodedData;
  if (barcodeDisplay) {
    barcodeDisplay.textContent = barcode;
    barcodeDisplay.classList.remove("feedback__barcode--empty");
  }

  setStatus("Loading product…", "scanning");

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
        setStatus("Product not found — try another barcode", "error");
        return;
      }

      const product = json.product;
      productName = resolveProductName(product);
      if (!productName) {
        resultModal.classList.add("hidden");
        setStatus("No product name found — check barcode and retry", "error");
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

      ingredients = resolveIngredientsText(product);
      productImage = resolveProductImage(product);

      setStatus("Loaded product", "success");
      displayMessage();
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
      resultModal.classList.add("hidden");
      setStatus("Could not load product data — check connection", "error");
    });
}

function stopScannerHardware() {
  try {
    Quagga.stop();
  } catch {
    /* noop */
  }
  if (cameraStream) {
    cameraStream.getTracks().forEach((t) => t.stop());
    cameraStream = null;
  }
  if (video.srcObject) {
    const tracks = video.srcObject.getTracks?.() || [];
    tracks.forEach((t) => t.stop());
    video.srcObject = null;
  }
  video.pause();
  quaggaDecodeHandled = false;
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
    barcodeDisplay.textContent = "No barcode yet";
    barcodeDisplay.classList.add("feedback__barcode--empty");
  }

  resultModal.classList.add("hidden");
  imageModal.classList.add("hidden");
  hideResultDetails();

  scanner.style.display = "block";
  scanner.classList.remove("flashing-border");

  const constraints = {
    video: {
      facingMode: "environment",
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
  };

  setStatus("Scanning…", "scanning");

  navigator.mediaDevices
    .getUserMedia(constraints)
    .then((stream) => {
      cameraStream = stream;
      video.srcObject = stream;
      return video.play();
    })
    .then(() => {
      const config = {
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: video,
        },
        decoder: {
          readers: ["ean_reader"],
        },
      };

      Quagga.init(config, function (err) {
        if (err) {
          console.error("Error initializing Quagga:", err);
          stopScannerHardware();
          scanner.style.display = "none";
          setStatus("Scanner failed to start", "error");
          return;
        }

        function onDetected(result) {
          if (quaggaDecodeHandled) return;
          quaggaDecodeHandled = true;
          try {
            Quagga.offDetected(onDetected);
          } catch {
            /* ignore */
          }

          scanner.classList.add("flashing-border");
          const code = result.codeResult.code;

          stopScannerHardware();
          scanner.style.display = "none";

          handleScan(code);
          setTimeout(() => {
            scanner.classList.remove("flashing-border");
          }, 1500);
        }

        Quagga.onDetected(onDetected);
        Quagga.start();
      });
    })
    .catch((error) => {
      console.error("Error accessing camera:", error);
      stopScannerHardware();
      scanner.style.display = "none";
      setStatus("Camera access denied or unavailable", "error");
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

document.getElementById("startBtn").addEventListener("click", () => {
  if (demoModeInput?.checked) fakeScanner();
  else startScanner();
});

initDemoModeFromStorage();
