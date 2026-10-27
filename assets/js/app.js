import { CORE_VERSION, loadCatalog, recommendSelection, createSessionSeed } from '../core/js/index.js';
import {
  createStartState, readState, writeState, toSelection, isMixScreen, startMix, canPin, pinFlavor, unpinFlavor,
  excludeFlavor, includeFlavor, nextPage, withPage, setTemperature,
} from './state.js';
import { renderStart, renderMix, renderThermometer } from './render.js';
import { TEMPERATURES } from './options.js';

const baseUrl = document.documentElement.dataset.baseurl || '';
const sessionSeed = createSessionSeed();
const tierOrder = TEMPERATURES.map((temperature) => temperature.tier);

const screenElement = document.getElementById('screen');
const thermometerElement = document.getElementById('thermometer');
const statusElement = document.getElementById('status');
const footerElement = document.getElementById('app-footer');

let catalog = null;
let shuffledConcepts = [];
let state = createStartState();
let renderRevision = 0;

const actions = {
  onPickConcept: (conceptId) => update(startMix(state, conceptId)),
  onSurprise: () => update(startMix(state, null)),
  onPin: (flavorId) => update(pinFlavor(state, flavorId)),
  onUnpin: (flavorId) => update(unpinFlavor(state, flavorId)),
  onExclude: (flavorId) => update(excludeFlavor(state, flavorId)),
  onInclude: (flavorId) => update(includeFlavor(state, flavorId)),
  onAnother: () => update(nextPage(state)),
  onSetTemperature: (tier) => update(setTemperature(state, tier), { replace: true, keepScroll: true }),
};

async function main() {
  footerElement.textContent = `core ${CORE_VERSION} · seed ${sessionSeed}`;
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
    render();
  });
  render();
}

function update(nextState, { replace = false, keepScroll = false } = {}) {
  if (nextState === state) {
    return;
  }
  state = nextState;
  saveUrl(replace);
  render();
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

async function render() {
  const revision = ++renderRevision;
  renderThermometer(thermometerElement, state.temperature, actions);
  if (!isMixScreen(state)) {
    showStatus(null);
    renderStart(screenElement, { concepts: shuffledConcepts }, actions);
    return;
  }
  try {
    const { mixes, page } = await loadMixes(state.page);
    if (revision !== renderRevision) {
      return;
    }
    if (page !== state.page) {
      state = withPage(state, page);
      saveUrl(true);
    }
    const mix = pickMix(mixes, state.temperature);
    showStatus(null);
    renderMix(screenElement, {
      state,
      catalog,
      mix,
      concept: catalog.concepts.find((concept) => concept.id === state.conceptId) ?? null,
      temperature: TEMPERATURES.find((temperature) => temperature.tier === state.temperature),
      isFallbackTier: Boolean(mix) && mix.tier !== state.temperature,
      canPin: canPin(state),
    }, actions);
  } catch (error) {
    console.error(error);
    showStatus('Не получилось подобрать микс. Вернитесь назад и попробуйте другое настроение.');
  }
}

async function loadMixes(page) {
  const request = { ...toSelection(state), seed: sessionSeed };
  const result = await recommendSelection(request, catalog, page);
  if (page > 0 && result.mixes.length === 0) {
    const firstPage = await recommendSelection(request, catalog, 0);
    return { mixes: firstPage.mixes, page: 0 };
  }
  return { mixes: result.mixes, page };
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
