const party = {
  date: "December 12",
  time: "6:30 PM",
  location: "The Grove",
};

const storageKey = "ufc335-party-rsvps";
const form = document.querySelector("#rsvp-form");
const nameInput = document.querySelector("#guest-name");
const statusInput = document.querySelector("#guest-status");
const partySizeInput = document.querySelector("#guest-party");
const list = document.querySelector("#guest-list");
const count = document.querySelector("#guest-count");
const total = document.querySelector("#rsvp-total");
const message = document.querySelector("#form-message");

document.querySelector("#event-date").textContent = party.date;
document.querySelector("#event-time").textContent = party.time;
document.querySelector("#event-location").textContent = party.location;

function readRsvps() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (!Array.isArray(saved)) return [];
    return saved.filter((entry) =>
      entry &&
      typeof entry.name === "string" &&
      ["yes", "maybe", "no"].includes(entry.status) &&
      Number.isInteger(entry.partySize) &&
      entry.partySize > 0
    );
  } catch (error) {
    console.error("Could not read saved RSVPs.", error);
    return [];
  }
}

function saveRsvps(rsvps) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(rsvps));
    return true;
  } catch (error) {
    console.error("Could not save RSVP.", error);
    message.textContent = "Could not save your RSVP in this browser. Check storage settings and try again.";
    return false;
  }
}

function renderRsvps() {
  const rsvps = readRsvps();
  const attending = rsvps
    .filter((entry) => entry.status === "yes")
    .reduce((sum, entry) => sum + entry.partySize, 0);

  count.textContent = String(attending);
  total.textContent = `${rsvps.length} RSVP${rsvps.length === 1 ? "" : "S"}`;
  list.replaceChildren();

  if (rsvps.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-list";
    empty.textContent = "No RSVPs yet. Be the first to call your shot.";
    list.append(empty);
    return;
  }

  for (const rsvp of rsvps) {
    const item = document.createElement("li");
    const guestName = document.createElement("span");
    const guestStatus = document.createElement("span");

    item.className = "guest-list-item";
    guestName.className = "guest-name";
    guestName.textContent = `${rsvp.name} · ${rsvp.partySize}`;
    guestStatus.className = `guest-status${rsvp.status === "maybe" ? " maybe" : rsvp.status === "no" ? " no" : ""}`;
    guestStatus.textContent = rsvp.status === "yes" ? "IN" : rsvp.status === "maybe" ? "MAYBE" : "CAN'T MAKE IT";

    item.append(guestName, guestStatus);
    list.append(item);
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  message.textContent = "";

  const name = nameInput.value.trim();
  const partySize = Number(partySizeInput.value);
  if (!name || !Number.isInteger(partySize) || partySize < 1) {
    message.textContent = "Add your name and a valid crew size to RSVP.";
    return;
  }

  const rsvps = readRsvps();
  const existing = rsvps.findIndex((entry) => entry.name.toLocaleLowerCase() === name.toLocaleLowerCase());
  const rsvp = { name, status: statusInput.value, partySize };
  if (existing === -1) {
    rsvps.push(rsvp);
  } else {
    rsvps[existing] = rsvp;
  }

  if (!saveRsvps(rsvps)) return;
  renderRsvps();
  form.reset();
  partySizeInput.value = "1";
  message.textContent = "RSVP saved. See you on fight night.";
});

const fightIntro = document.querySelector("#fight-intro");
const skipIntroButton = document.querySelector("#skip-intro");
let bellAudioContext;
let introFadeTimer;
let introClosed = false;

async function ringBell() {
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextConstructor) {
    console.warn("Bell audio is not supported in this browser.");
    return;
  }

  try {
    bellAudioContext ??= new AudioContextConstructor();
    if (bellAudioContext.state !== "running") await bellAudioContext.resume();

    const now = bellAudioContext.currentTime;
    const partials = [
      { frequency: 530, detune: -5, volume: 0.2, duration: 2.2 },
      { frequency: 775, detune: 6, volume: 0.15, duration: 1.9 },
      { frequency: 1168, detune: -3, volume: 0.1, duration: 1.6 },
      { frequency: 1745, detune: 4, volume: 0.065, duration: 1.4 },
      { frequency: 2490, detune: -4, volume: 0.05, duration: 1.2 },
      { frequency: 3180, detune: 2, volume: 0.035, duration: 1 },
      { frequency: 3960, detune: -2, volume: 0.022, duration: 0.8 },
    ];
    const echo = bellAudioContext.createDelay(0.5);
    const echoGain = bellAudioContext.createGain();
    const echoFeedback = bellAudioContext.createGain();
    echo.delayTime.setValueAtTime(0.14, now);
    echoGain.gain.setValueAtTime(0.2, now);
    echoFeedback.gain.setValueAtTime(0.24, now);
    echo.connect(echoGain);
    echoGain.connect(bellAudioContext.destination);
    echo.connect(echoFeedback);
    echoFeedback.connect(echo);
    window.setTimeout(() => {
      echo.disconnect();
      echoGain.disconnect();
      echoFeedback.disconnect();
    }, 4500);

    for (const partial of partials) {
      const oscillator = bellAudioContext.createOscillator();
      const gain = bellAudioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(partial.frequency, now);
      oscillator.detune.setValueAtTime(partial.detune, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(partial.volume, now + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + partial.duration);
      oscillator.connect(gain);
      gain.connect(bellAudioContext.destination);
      gain.connect(echo);
      oscillator.start(now);
      oscillator.stop(now + partial.duration + 0.01);
    }

    const noiseDuration = 0.055;
    const noiseBuffer = bellAudioContext.createBuffer(
      1,
      Math.floor(bellAudioContext.sampleRate * noiseDuration),
      bellAudioContext.sampleRate
    );
    const noiseSamples = noiseBuffer.getChannelData(0);
    for (let index = 0; index < noiseSamples.length; index += 1) {
      noiseSamples[index] = (Math.random() * 2 - 1) * (1 - index / noiseSamples.length);
    }

    const noise = bellAudioContext.createBufferSource();
    const filter = bellAudioContext.createBiquadFilter();
    const noiseGain = bellAudioContext.createGain();
    noise.buffer = noiseBuffer;
    filter.type = "highpass";
    filter.frequency.setValueAtTime(2200, now);
    noiseGain.gain.setValueAtTime(0.065, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + noiseDuration);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(bellAudioContext.destination);
    noise.start(now);

  } catch (error) {
    console.warn("Browser blocked the intro bell sound.", error);
  }
}

function closeFightIntro() {
  if (introClosed) return;
  introClosed = true;
  window.clearTimeout(introFadeTimer);
  fightIntro.classList.add("is-fading");
  window.setTimeout(() => {
    fightIntro.hidden = true;
    document.querySelector("#hero-rsvp").focus({ preventScroll: true });
  }, 2000);
}

skipIntroButton.addEventListener("click", closeFightIntro);
document.addEventListener("keydown", (event) => {
  if (fightIntro.hidden) return;
  if (event.key === "Escape" && !fightIntro.hidden) closeFightIntro();
  if (event.key !== "Tab") return;
  event.preventDefault();
  skipIntroButton.focus();
});

skipIntroButton.focus({ preventScroll: true });
void ringBell();
introFadeTimer = window.setTimeout(closeFightIntro, 1000);

renderRsvps();
