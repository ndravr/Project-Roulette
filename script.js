const setup = document.querySelector("#setup");
const arena = document.querySelector("#arena");
const mercySlider = document.querySelector("#mercySlider");
const mercyValue = document.querySelector("#mercyValue");
const loadedCount = document.querySelector("#loadedCount");
const sparedCount = document.querySelector("#sparedCount");
const flavorToggle = document.querySelector("#flavorToggle");
const flavorLabel = document.querySelector("#flavorLabel");
const startButton = document.querySelector("#startButton");
const fileStatus = document.querySelector("#fileStatus");
const listTiles = document.querySelector("#listTiles");
const counter = document.querySelector("#counter");
const resetButton = document.querySelector("#resetButton");
const fireButton = document.querySelector("#fireButton");
let blasterImage = document.querySelector("#blasterImage");
const shotBeam = document.querySelector("#shotBeam");
const currentName = document.querySelector("#currentName");
const fortune = document.querySelector("#fortune");
const burst = document.querySelector("#burst");
const nameQueue = document.querySelector("#nameQueue");

const IDLE_GUN_SRC = "cat.png";
const FIRING_GUN_SRC = "cat.gif";
const FIRE_ANIMATION_MS = 1000;
const PROJECTILE_DELAY_MS = 420;
const PROJECTILE_TRAVEL_MS = 832;
const NAME_HIDE_AFTER_IMPACT_MS = 90;
const EXPLOSION_MS = 820;
const MESSAGE_FLAVORS = {
  fortune: {
    label: "Fortune",
    loading: "Loading fortune...",
    empty: "No unused fortunes left in this round.",
    error: "The fortune list could not be loaded."
  },
  jokes: {
    label: "Jokes",
    loading: "Loading joke...",
    error: "The joke API could not be reached."
  }
};
const JOKE_API_URL = "https://v2.jokeapi.dev/joke/Programming?safe-mode";

let allNames = [];
let shuffledNames = [];
let activeNames = [];
let currentIndex = 0;
let isFiring = false;
let shotSequence = 0;
let namesSourceLabel = "";
let teamLists = [];
let activeListId = "";
let fortuneLoadPromise = null;
let fortuneMessages = [];
let usedFortuneMessages = new Set();
let remainingFortuneMessages = [];
let fortuneSequence = 0;
let roundComplete = false;
let activeMessageFlavor = "fortune";

const firingGunPreload = new Image();
firingGunPreload.src = FIRING_GUN_SRC;

function playGunFireAnimation() {
  const freshImage = blasterImage.cloneNode(false);

  freshImage.src = `${FIRING_GUN_SRC}?fire=${Date.now()}`;
  blasterImage.replaceWith(freshImage);
  blasterImage = freshImage;
}

function shuffle(items) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function cleanNames(text) {
  return text
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter((name) => name && !name.startsWith("#"));
}

function clearSelectionState() {
  allNames = [];
  namesSourceLabel = "";
  mercySlider.disabled = true;
  mercySlider.min = "1";
  mercySlider.max = "1";
  mercySlider.value = "1";
  mercyValue.textContent = "0 / 0";
  loadedCount.textContent = "No team list selected";
  sparedCount.textContent = "0 visible";
  startButton.disabled = true;
}

function setNames(names, sourceLabel) {
  allNames = names;
  namesSourceLabel = sourceLabel;
  shuffledNames = shuffle(allNames);
  configureMercySlider();
}

async function ensureFortunesLoaded() {
  if (fortuneMessages.length) {
    return fortuneMessages;
  }

  if (!fortuneLoadPromise) {
    fortuneLoadPromise = window.projectRouletteDesktop.readFortuneMessages()
      .then((messages) => {
        if (!Array.isArray(messages) || !messages.length) {
          throw new Error("fortune source was empty");
        }

        fortuneMessages = [
          ...new Set(
            messages
              .filter((message) => typeof message === "string")
              .map((message) => message.trim())
              .filter(Boolean)
          )
        ];

        if (!fortuneMessages.length) {
          throw new Error("fortune source was empty");
        }

        return fortuneMessages;
      });
  }

  return fortuneLoadPromise;
}

function resetFortuneRound() {
  usedFortuneMessages = new Set();
  remainingFortuneMessages = [];
  fortuneSequence += 1;
}

function pickUnusedFortune(fortunes) {
  if (!remainingFortuneMessages.length) {
    remainingFortuneMessages = shuffle(
      fortunes.filter((message) => !usedFortuneMessages.has(message))
    );
  }

  const message = remainingFortuneMessages.pop() || "";
  if (message) {
    usedFortuneMessages.add(message);
  }

  return message;
}

function setMessageFlavor(nextFlavor) {
  activeMessageFlavor = nextFlavor;
  const isJokes = activeMessageFlavor === "jokes";

  flavorToggle.classList.toggle("is-jokes", isJokes);
  flavorToggle.setAttribute("aria-pressed", String(isJokes));
  flavorLabel.textContent = MESSAGE_FLAVORS[activeMessageFlavor].label;
  fortuneSequence += 1;

  if (!setup.classList.contains("is-hidden")) {
    return;
  }

  if (!roundComplete && activeNames.length && currentIndex < activeNames.length) {
    loadFortune();
  }
}

function parseJoke(data) {
  if (data && data.type === "single" && typeof data.joke === "string") {
    return data.joke.trim();
  }

  if (
    data
    && data.type === "twopart"
    && typeof data.setup === "string"
    && typeof data.delivery === "string"
  ) {
    return `${data.setup.trim()} ${data.delivery.trim()}`.trim();
  }

  return "";
}

async function loadJoke(currentFortuneSequence) {
  const response = await fetch(JOKE_API_URL);

  if (!response.ok) {
    throw new Error(`Joke API returned ${response.status}`);
  }

  const joke = parseJoke(await response.json());

  if (currentFortuneSequence !== fortuneSequence) {
    return;
  }

  fortune.textContent = joke || "The joke API returned an empty joke.";
}

async function loadFortune() {
  fortuneSequence += 1;
  const currentFortuneSequence = fortuneSequence;
  const messageFlavor = activeMessageFlavor;

  fortune.textContent = MESSAGE_FLAVORS[messageFlavor].loading;

  try {
    if (messageFlavor === "jokes") {
      await loadJoke(currentFortuneSequence);
      return;
    }

    const fortunes = await ensureFortunesLoaded();

    if (currentFortuneSequence !== fortuneSequence) {
      return;
    }

    fortune.textContent = pickUnusedFortune(fortunes) || MESSAGE_FLAVORS.fortune.empty;
  } catch {
    if (currentFortuneSequence !== fortuneSequence) {
      return;
    }

    fortune.textContent = MESSAGE_FLAVORS[messageFlavor].error;
  }
}

function applyLoadedTeamLists(loadedLists) {
  teamLists = loadedLists;

  if (!teamLists.length) {
    activeListId = "";
    clearSelectionState();
    renderTiles();
    fileStatus.textContent = "";
    return;
  }

  if (!teamLists.some((list) => list.id === activeListId)) {
    activeListId = teamLists[0].id;
  }

  renderTiles();
  updateSelectionState();
  fileStatus.textContent = `${teamLists.length} list${teamLists.length === 1 ? "" : "s"} loaded from /lists`;
}

async function loadDesktopTeamLists() {
  const loadedFiles = await window.projectRouletteDesktop.readTeamLists();

  applyLoadedTeamLists(
    loadedFiles
      .map((file) => ({
        id: file.fileName,
        fileName: file.fileName,
        label: file.fileName,
        names: cleanNames(file.text)
      }))
      .filter((list) => list.names.length)
  );
}

async function loadTeamLists() {
  if (!window.projectRouletteDesktop) {
    applyLoadedTeamLists([]);
    return;
  }

  try {
    await loadDesktopTeamLists();
  } catch {
    applyLoadedTeamLists([]);
  }
}

function getActiveList() {
  return teamLists.find((list) => list.id === activeListId) || null;
}

function updateSelectionState() {
  const activeList = getActiveList();

  if (!activeList) {
    clearSelectionState();
    return;
  }

  setNames(activeList.names, activeList.label);
}

function renderTiles() {
  listTiles.innerHTML = "";

  if (!teamLists.length) {
    const empty = document.createElement("p");

    empty.className = "empty-library";
    empty.textContent = "Nothing to display.";
    listTiles.appendChild(empty);
    return;
  }

  teamLists.forEach((list) => {
    const article = document.createElement("article");
    const tileButton = document.createElement("button");
    const title = document.createElement("strong");
    const meta = document.createElement("span");

    article.className = "list-tile";
    if (list.id === activeListId) {
      article.classList.add("is-active");
    }

    tileButton.type = "button";
    tileButton.className = "list-tile-main";
    tileButton.addEventListener("click", async () => {
      activeListId = list.id;
      updateSelectionState();
      renderTiles();
      fileStatus.textContent = `Loaded team list: ${list.fileName}`;
    });

    title.textContent = list.fileName;
    meta.textContent = `${list.names.length} names`;
    tileButton.append(title, meta);
    article.append(tileButton);
    listTiles.appendChild(article);
  });
}

function configureMercySlider() {
  const total = allNames.length;

  mercySlider.disabled = total === 0;
  mercySlider.min = "1";
  mercySlider.max = String(Math.max(total, 1));
  mercySlider.value = String(Math.max(total, 1));
  startButton.disabled = total === 0;

  updateMercyDisplay();
}

function updateMercyDisplay() {
  const total = allNames.length;
  const selected = total ? Math.min(Number(mercySlider.value), total) : 0;

  mercyValue.textContent = `${selected} / ${total}`;
  loadedCount.textContent = total
    ? `${total} name${total === 1 ? "" : "s"} from ${namesSourceLabel}`
    : "No team list selected";
  sparedCount.textContent = `${selected} visible`;
}

function updateFireButton() {
  fireButton.textContent = roundComplete ? "Go to Home" : "Next";
  fireButton.disabled = isFiring;
}

function startRound() {
  if (!allNames.length) {
    return;
  }

  shuffledNames = shuffle(allNames);
  activeNames = [...shuffledNames];
  currentIndex = 0;
  isFiring = false;
  roundComplete = false;
  resetFortuneRound();
  shotSequence += 1;
  burst.innerHTML = "";
  clearProjectile();
  blasterImage.src = IDLE_GUN_SRC;

  setup.classList.add("is-hidden");
  arena.classList.remove("is-hidden");

  renderRound();
}

function resetRound() {
  arena.classList.add("is-hidden");
  setup.classList.remove("is-hidden");
  currentName.classList.remove("is-hit", "is-hidden-target");
  currentName.textContent = "READY";
  fortune.textContent = "Pick a team list to get a fortune.";
  burst.innerHTML = "";
  blasterImage.src = IDLE_GUN_SRC;
  isFiring = false;
  roundComplete = false;
  resetFortuneRound();
  shotSequence += 1;
  clearProjectile();
  updateFireButton();
}

function renderRound({ resetTarget = true } = {}) {
  const total = activeNames.length;
  const remaining = activeNames.slice(currentIndex);
  const visibleCount = Number(mercySlider.value);
  const queueWindow = remaining.slice(0, visibleCount);

  counter.textContent = `${Math.min(currentIndex + 1, total)} / ${total}`;

  if (resetTarget) {
    currentName.textContent = remaining.length ? remaining[0] : "The end";
    currentName.classList.remove("is-hit", "is-hidden-target");

    if (remaining.length) {
      loadFortune();
    } else {
      fortune.textContent = "Don't forget to log your time \u270c\uFE0F";
    }
  }

  nameQueue.innerHTML = "";
  queueWindow.forEach((name) => {
    const item = document.createElement("li");
    const label = document.createElement("span");

    label.textContent = name;
    item.appendChild(label);
    nameQueue.appendChild(item);
  });

  if (!remaining.length) {
    counter.textContent = `${total} / ${total}`;
    roundComplete = true;
    const item = document.createElement("li");
    const label = document.createElement("span");

    label.textContent = "List complete";
    item.appendChild(label);
    nameQueue.appendChild(item);
  } else {
    roundComplete = false;
  }

  updateFireButton();
}

function restartAnimation(element, className) {
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
}

function clearProjectile() {
  shotBeam.classList.remove("is-on");
  shotBeam.style.removeProperty("--shot-x");
  shotBeam.style.removeProperty("--shot-y");
  burst.style.removeProperty("--burst-x");
  burst.style.removeProperty("--burst-y");
  void shotBeam.offsetWidth;
}

function aimProjectileAtCurrentName() {
  shotBeam.classList.remove("is-on");
  void shotBeam.offsetWidth;

  const projectileRect = shotBeam.getBoundingClientRect();
  const targetRect = currentName.getBoundingClientRect();
  const projectileCenterX = projectileRect.left + projectileRect.width / 2;
  const projectileCenterY = projectileRect.top + projectileRect.height / 2;
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;

  shotBeam.style.setProperty("--shot-x", `${targetCenterX - projectileCenterX}px`);
  shotBeam.style.setProperty("--shot-y", `${targetCenterY - projectileCenterY}px`);
}

function setBurstOriginFromCurrentName() {
  const burstRect = burst.getBoundingClientRect();
  const targetRect = currentName.getBoundingClientRect();
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;

  burst.style.setProperty("--burst-x", `${targetCenterX - burstRect.left}px`);
  burst.style.setProperty("--burst-y", `${targetCenterY - burstRect.top}px`);
}

function completeProjectileImpact(currentShot) {
  if (currentShot !== shotSequence) {
    return;
  }

  createBurst();

  window.setTimeout(() => {
    if (currentShot !== shotSequence) {
      return;
    }

    currentName.classList.add("is-hidden-target");
  }, NAME_HIDE_AFTER_IMPACT_MS);
}

function createBurst() {
  burst.innerHTML = "";
  setBurstOriginFromCurrentName();
  const colors = ["#ff2e88", "#b7ff2a", "#26dbff", "#ffad33", "#9a57ff", "#ffffff"];
  const explosion = document.createElement("span");

  explosion.className = "comic-explosion";
  burst.appendChild(explosion);

  for (let index = 0; index < 4; index += 1) {
    const cloud = document.createElement("span");

    cloud.className = "comic-cloud";
    cloud.style.setProperty("--cloud-x", `${(Math.random() - 0.5) * 90}px`);
    cloud.style.setProperty("--cloud-y", `${(Math.random() - 0.5) * 90}px`);
    burst.appendChild(cloud);
  }

  ["is-left", "is-right"].forEach((side) => {
    const bolt = document.createElement("span");

    bolt.className = `comic-bolt ${side}`;
    burst.appendChild(bolt);
  });

  for (let index = 0; index < 34; index += 1) {
    const spark = document.createElement("span");
    const angle = Math.random() * Math.PI * 2;
    const distance = 70 + Math.random() * 210;
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;

    spark.className = "spark";
    spark.style.setProperty("--spark-x", `${x}px`);
    spark.style.setProperty("--spark-y", `${y}px`);
    spark.style.setProperty("--spark-color", colors[index % colors.length]);
    spark.style.animationDelay = `${Math.random() * 90}ms`;
    burst.appendChild(spark);
  }
}

function fireNext() {
  if (roundComplete) {
    resetRound();
    return;
  }

  if (isFiring || fireButton.disabled || !activeNames.length || currentIndex >= activeNames.length) {
    return;
  }

  isFiring = true;
  updateFireButton();
  shotSequence += 1;
  const currentShot = shotSequence;
  currentName.textContent = activeNames[currentIndex];
  counter.textContent = `${Math.min(currentIndex + 1, activeNames.length)} / ${activeNames.length}`;
  currentName.classList.remove("is-hit", "is-hidden-target");
  burst.innerHTML = "";
  playGunFireAnimation();

  window.setTimeout(() => {
    if (currentShot !== shotSequence) {
      return;
    }

    aimProjectileAtCurrentName();
    shotBeam.addEventListener("animationend", () => completeProjectileImpact(currentShot), { once: true });
    restartAnimation(shotBeam, "is-on");
  }, PROJECTILE_DELAY_MS);

  window.setTimeout(() => {
    if (currentShot !== shotSequence) {
      return;
    }

    blasterImage.src = IDLE_GUN_SRC;
  }, FIRE_ANIMATION_MS);

  window.setTimeout(() => {
    if (currentShot !== shotSequence) {
      return;
    }

    currentIndex += 1;
    isFiring = false;
    renderRound();
  }, Math.max(FIRE_ANIMATION_MS, PROJECTILE_DELAY_MS + PROJECTILE_TRAVEL_MS + EXPLOSION_MS));
}

mercySlider.addEventListener("input", updateMercyDisplay);
flavorToggle.addEventListener("click", () => {
  setMessageFlavor(activeMessageFlavor === "fortune" ? "jokes" : "fortune");
});
startButton.addEventListener("click", startRound);
resetButton.addEventListener("click", resetRound);
fireButton.addEventListener("click", fireNext);

document.addEventListener("keydown", (event) => {
  const setupVisible = !setup.classList.contains("is-hidden");

  if (setupVisible && event.key === "Enter" && !startButton.disabled) {
    startRound();
    return;
  }

  if (setupVisible) {
    return;
  }

  if (event.code === "Space" || event.key === "Enter") {
    event.preventDefault();
    fireNext();
  }

  if (event.key.toLowerCase() === "q" || event.key === "Escape") {
    resetRound();
  }
});

clearSelectionState();
setMessageFlavor("fortune");
renderTiles();
loadTeamLists();
