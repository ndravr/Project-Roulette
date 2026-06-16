const setup = document.querySelector("#setup");
const arena = document.querySelector("#arena");
const mercySlider = document.querySelector("#mercySlider");
const mercyValue = document.querySelector("#mercyValue");
const loadedCount = document.querySelector("#loadedCount");
const sparedCount = document.querySelector("#sparedCount");
const startButton = document.querySelector("#startButton");
const loadError = document.querySelector("#loadError");
const nameFileInput = document.querySelector("#nameFileInput");
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

const STORAGE_KEY = "shuffle.teamLists.v1";
const ACTIVE_LIST_KEY = "shuffle.activeListId.v1";
const IDLE_GUN_SRC = "gun_idle.png";
const FIRING_GUN_SRC = "gun_fire.gif";
const FIRE_ANIMATION_MS = 1000;
const PROJECTILE_DELAY_MS = 420;
const EXPLOSION_MS = 820;

const fallbackNames = [
  "ABCD",
  "BDESD",
  "KORMA",
  "ZENTH",
  "PLIKS",
  "NURVO",
  "TALEN",
  "MERIX",
  "JADON",
  "VEXLA",
  "QORIN",
  "LUMEK",
  "SADRO",
  "FENIX"
];

let allNames = [];
let shuffledNames = [];
let activeNames = [];
let currentIndex = 0;
let isFiring = false;
let shotSequence = 0;
let namesSourceLabel = "";
let teamLists = [];
let activeListId = "";
let roundComplete = false;
let jokeSequence = 0;

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

function slugifyLabel(value) {
  return value
    .toLowerCase()
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "team-list";
}

function createListRecord(label, names, originalFileName = "") {
  const trimmedLabel = label.trim() || "Untitled list";

  return {
    id: `${slugifyLabel(trimmedLabel)}-${Date.now()}`,
    label: trimmedLabel,
    originalFileName,
    names
  };
}

function saveLibrary() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(teamLists));
  localStorage.setItem(ACTIVE_LIST_KEY, activeListId);
}

function readLibrary() {
  try {
    const storedLists = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

    if (!Array.isArray(storedLists)) {
      return [];
    }

    return storedLists
      .filter((list) => list && Array.isArray(list.names) && list.names.length)
      .map((list) => ({
        id: String(list.id || `${slugifyLabel(list.label || "team-list")}-${Date.now()}`),
        label: String(list.label || "Untitled list"),
        originalFileName: String(list.originalFileName || ""),
        names: list.names.map((name) => String(name))
      }));
  } catch (error) {
    console.warn("Could not read saved team lists.", error);
    return [];
  }
}

function setNames(names, sourceLabel) {
  allNames = names;
  namesSourceLabel = sourceLabel;
  shuffledNames = shuffle(allNames);
  configureMercySlider();
}

function getActiveList() {
  return teamLists.find((list) => list.id === activeListId) || null;
}

function updateSelectionState() {
  const activeList = getActiveList();

  if (!activeList) {
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
    return;
  }

  setNames(activeList.names, activeList.label);
}

function renderTiles() {
  listTiles.innerHTML = "";

  if (!teamLists.length) {
    const empty = document.createElement("p");

    empty.className = "empty-library";
    empty.textContent = "No saved team lists yet. Load a .txt file to create your first tile.";
    listTiles.appendChild(empty);
    return;
  }

  teamLists.forEach((list) => {
    const article = document.createElement("article");
    const tileButton = document.createElement("button");
    const title = document.createElement("strong");
    const meta = document.createElement("span");
    const renameButton = document.createElement("button");

    article.className = "list-tile";
    if (list.id === activeListId) {
      article.classList.add("is-active");
    }

    tileButton.type = "button";
    tileButton.className = "list-tile-main";
    tileButton.addEventListener("click", () => {
      activeListId = list.id;
      saveLibrary();
      updateSelectionState();
      renderTiles();
      fileStatus.textContent = `Loaded team list: ${list.label}`;
      loadError.textContent = "";
    });

    title.textContent = list.label;
    meta.textContent = `${list.names.length} names`;
    tileButton.append(title, meta);

    renameButton.type = "button";
    renameButton.className = "tile-rename";
    renameButton.textContent = "Rename";
    renameButton.addEventListener("click", () => renameList(list.id));

    article.append(tileButton, renameButton);
    listTiles.appendChild(article);
  });
}

function renameList(listId) {
  const list = teamLists.find((entry) => entry.id === listId);

  if (!list) {
    return;
  }

  const nextLabel = window.prompt("Rename team list", list.label);

  if (!nextLabel) {
    return;
  }

  list.label = nextLabel.trim() || list.label;
  saveLibrary();
  updateSelectionState();
  renderTiles();
  fileStatus.textContent = `Renamed tile to: ${list.label}`;
}

function addListToLibrary(record, { persist = true, select = true } = {}) {
  teamLists.push(record);

  if (select) {
    activeListId = record.id;
  }

  if (persist) {
    saveLibrary();
  }

  updateSelectionState();
  renderTiles();
}

async function loadNamesFromFile(file) {
  if (!file) {
    return;
  }

  try {
    const names = cleanNames(await file.text());

    if (!names.length) {
      throw new Error("No names found");
    }

    const label = file.name.replace(/\.[^/.]+$/, "") || file.name;
    const record = createListRecord(label, names, file.name);

    addListToLibrary(record);
    fileStatus.textContent = `Added tile: ${record.label}`;
    loadError.textContent = "";
    nameFileInput.value = "";
  } catch (error) {
    fileStatus.textContent = `Could not load names from ${file.name}. ${error.message}`;
  }
}

async function loadDefaultWorkspaceList() {
  if (window.location.protocol === "file:") {
    if (!teamLists.length) {
      addListToLibrary(createListRecord("Sample list", fallbackNames), { persist: false });
      fileStatus.textContent = "Sample list loaded. Use Load new team list to add permanent tiles in this browser.";
    }
    return;
  }

  try {
    const response = await fetch(`list.txt?cache=${Date.now()}`);

    if (!response.ok) {
      throw new Error(`list.txt returned ${response.status}`);
    }

    const names = cleanNames(await response.text());

    if (!names.length) {
      throw new Error("list.txt has no names");
    }

    if (!teamLists.length) {
      addListToLibrary(createListRecord("list", names, "list.txt"), { persist: true });
      fileStatus.textContent = "Workspace list.txt added as a home tile.";
    }
  } catch (error) {
    if (!teamLists.length) {
      addListToLibrary(createListRecord("Sample list", fallbackNames), { persist: false });
      loadError.textContent = `Could not read list.txt. ${error.message}`;
    }
  }
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

function updateFireButton() {
  fireButton.textContent = roundComplete ? "Go to Home" : "Fire next";
  fireButton.disabled = isFiring;
}

async function loadFortune() {
  jokeSequence += 1;
  const currentJoke = jokeSequence;

  fortune.textContent = "Loading your dev fortune...";

  try {
    const response = await fetch("https://v2.jokeapi.dev/joke/Programming?safe-mode");
    const data = await response.json();

    if (currentJoke !== jokeSequence) {
      return;
    }

    if (data.type === "single") {
      fortune.textContent = data.joke;
      return;
    }

    fortune.textContent = `${data.setup} ${data.delivery}`;
  } catch {
    if (currentJoke !== jokeSequence) {
      return;
    }

    fortune.textContent = "Today's fortune: the API failed, but at least it was not production.";
  }
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

function startRound() {
  if (!allNames.length) {
    return;
  }

  shuffledNames = shuffle(allNames);
  activeNames = [...shuffledNames];
  currentIndex = 0;
  isFiring = false;
  roundComplete = false;
  shotSequence += 1;
  burst.innerHTML = "";
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
  fortune.textContent = "Pick a tile and start another round.";
  burst.innerHTML = "";
  blasterImage.src = IDLE_GUN_SRC;
  isFiring = false;
  roundComplete = false;
  shotSequence += 1;
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
      fortune.textContent = "No more targets. Even the joke API gets to rest.";
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

function createBurst() {
  burst.innerHTML = "";
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

    currentName.classList.add("is-hidden-target");
    restartAnimation(shotBeam, "is-on");
    createBurst();
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
  }, Math.max(FIRE_ANIMATION_MS, PROJECTILE_DELAY_MS + EXPLOSION_MS));
}

mercySlider.addEventListener("input", updateMercyDisplay);
startButton.addEventListener("click", startRound);
resetButton.addEventListener("click", resetRound);
fireButton.addEventListener("click", fireNext);
nameFileInput.addEventListener("change", (event) => {
  loadNamesFromFile(event.target.files[0]);
});

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

teamLists = readLibrary();
activeListId = localStorage.getItem(ACTIVE_LIST_KEY) || "";

if (activeListId && !teamLists.some((list) => list.id === activeListId)) {
  activeListId = "";
}

if (!activeListId && teamLists[0]) {
  activeListId = teamLists[0].id;
}

renderTiles();
updateSelectionState();
loadDefaultWorkspaceList();
