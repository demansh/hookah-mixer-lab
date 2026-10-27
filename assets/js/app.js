import { CORE_VERSION, loadCatalog, recommendSelection, createSessionSeed } from '../core/js/index.js';
import {
  createStartState, readState, writeState, toSelection, isMixScreen, startMix, canPin, pinFlavor, unpinFlavor,
  excludeFlavor, includeFlavor, nextPage, withPage, setTemperature,
} from './state.js';
import { renderStart, renderMix, renderThermometer, renderBottomActions } from './render.js';
import { TEMPERATURES } from './options.js';
import { resolveMood, showMaster } from './master.js';

const baseUrl = document.documentElement.dataset.baseurl || '';
const tierOrder = TEMPERATURES.map((temperature) => temperature.tier);
const MAX_UNSEEN_ATTEMPTS = 12;

const screenElement = document.getElementById('screen');
const thermometerElement = document.getElementById('thermometer');
const bottomActionsElement = document.getElementById('bottom-actions');
const masterElement = document.getElementById('master');
const statusElement = document.getElementById('status');
const footerElement = document.getElementById('app-footer');

let catalog = null;
let sessionSeed = createSessionSeed();
let shuffledConcepts = [];
let state = createStartState();
let renderRevision = 0;
let currentMix = null;
let heldMix = null;
const seenMixKeys = new Set();

const actions = {
  onPickConcept: (conceptId) => update(startMix(state, conceptId), { resetSeen: true }),
  onSurprise: () => update(startMix(state, null), { resetSeen: true }),
  onPin: (flavorId) => holdMix(pinFlavor(state, flavorId)),
  onUnpin: (flavorId) => holdMix(unpinFlavor(state, flavorId)),
  onExclude: (flavorId) => update(excludeFlavor(state, flavorId), { resetSeen: true }),
  onInclude: (flavorId) => update(includeFlavor(state, flavorId), { resetSeen: true }),
  onAnother: () => showAnotherMix(),
  onReset: () => resetProgress(),
  onSetTemperature: (tier) => update(setTemperature(state, tier), { replace: true, keepScroll: true }),
};

async function main() {
  renderFooter();
  try {
    catalog = await loadCatalog(`${baseUrl}/assets/core/data`);
  } catch (error) {
    console.error(error);
    showStatus('Не удалось загрузить базу ароматов. Обновите страницу.');
    return;
  }
  shuffledConcepts = shuffle(catalog.concepts);
  state = readState(window.location.search, catalog);
  window.addEventListener('popstate', () => {
    state = readState(window.location.search, catalog);
    heldMix = null;
    seenMixKeys.clear();
    render();
  });
  render();
}

function resetProgress() {
  sessionSeed = createSessionSeed();
  shuffledConcepts = shuffle(catalog.concepts);
  renderFooter();
  update(createStartState(state.temperature), { resetSeen: true });
}

function holdMix(nextState) {
  if (nextState === state) {
    return;
  }
  heldMix = heldMix ?? currentMix;
  state = nextState;
  saveUrl(false);
  render();
}

function showAnotherMix() {
  if (heldMix) {
    heldMix = null;
    render({ preferUnseen: true });
    return;
  }
  update(nextPage(state), { preferUnseen: true });
}

function renderFooter() {
  footerElement.textContent = `core ${CORE_VERSION} · seed ${sessionSeed}`;
}

function update(nextState, { replace = false, keepScroll = false, resetSeen = false, preferUnseen = false } = {}) {
  if (nextState === state) {
    return;
  }
  heldMix = null;
  if (resetSeen) {
    seenMixKeys.clear();
  }
  state = nextState;
  saveUrl(replace);
  render({ preferUnseen });
  if (!keepScroll) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function saveUrl(replace) {
  const url = `${window.location.pathname}${writeState(state)}`;
  if (replace) {
    window.history.replaceState(null, '', url);
  } else {
    window.history.pushState(null, '', url);
  }
}

async function render({ preferUnseen = false } = {}) {
  const revision = ++renderRevision;
  renderThermometer(thermometerElement, state.temperature, actions);
  renderBottomActions(bottomActionsElement, isMixScreen(state), actions);
  if (!isMixScreen(state)) {
    currentMix = null;
    showStatus(null);
    showMaster(masterElement, resolveMood({ temperature: state.temperature }));
    renderStart(screenElement, { concepts: shuffledConcepts }, actions);
    return;
  }
  if (heldMix) {
    showMaster(masterElement, resolveMood({ temperature: state.temperature }));
    renderMixCard(heldMix);
    return;
  }
  try {
    const { mix, page, wrapped } = preferUnseen ? await loadUnseenMix(state.page) : await loadMix(state.page);
    if (revision !== renderRevision) {
      return;
    }
    if (wrapped) {
      seenMixKeys.clear();
    }
    if (mix) {
      seenMixKeys.add(mixKey(mix));
    }
    if (page !== state.page) {
      state = withPage(state, page);
      saveUrl(true);
    }
    currentMix = mix;
    showStatus(null);
    const mood = resolveMood({ hasMix: Boolean(mix), wrapped, temperature: state.temperature });
    showMaster(masterElement, mood);
    renderMixCard(mix);
  } catch (error) {
    console.error(error);
    showStatus('Не получилось подобрать микс. Вернитесь назад и попробуйте другое настроение.');
  }
}

function renderMixCard(mix) {
  renderMix(screenElement, {
    state,
    catalog,
    mix,
    concept: catalog.concepts.find((concept) => concept.id === state.conceptId) ?? null,
    isFallbackTier: Boolean(mix) && mix.tier !== state.temperature,
    canPin: canPin(state),
  }, actions);
}

async function loadMix(page) {
  const request = { ...toSelection(state), seed: sessionSeed };
  const result = await recommendSelection(request, catalog, page);
  if (page > 0 && result.mixes.length === 0) {
    const firstPage = await recommendSelection(request, catalog, 0);
    return { mix: pickMix(firstPage.mixes, state.temperature), page: 0, wrapped: true };
  }
  return { mix: pickMix(result.mixes, state.temperature), page, wrapped: false };
}

async function loadUnseenMix(startPage) {
  let loaded = await loadMix(startPage);
  for (let attempt = 0; attempt < MAX_UNSEEN_ATTEMPTS; attempt += 1) {
    if (!loaded.mix || loaded.wrapped || !seenMixKeys.has(mixKey(loaded.mix))) {
      break;
    }
    loaded = await loadMix(loaded.page + 1);
  }
  return loaded;
}

function mixKey(mix) {
  return mix.components.map((component) => component.flavorId).sort().join('+');
}

function pickMix(mixes, tier) {
  const distance = (mix) => Math.abs(tierOrder.indexOf(mix.tier) - tierOrder.indexOf(tier));
  return [...mixes].sort((left, right) => distance(left) - distance(right))[0] ?? null;
}

function shuffle(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function showStatus(message) {
  statusElement.hidden = message === null;
  statusElement.textContent = message ?? '';
}

main();
