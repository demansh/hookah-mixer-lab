import { CORE_VERSION, loadCatalog, recommend, createSessionSeed } from '../core/js/index.js';
import {
  readState, writeState, buildQuery, findDirection, canPin, isCoolingOn, selectDirection, pinFlavor, unpinFlavor,
  excludeFlavor, includeFlavor, toggleShift, toggleCooling, nextPage, withPage, createEmptyState,
} from './state.js';
import { renderDirections, renderResults } from './render.js';

const baseUrl = document.documentElement.dataset.baseurl || '';
const sessionSeed = createSessionSeed();

const screenElement = document.getElementById('screen');
const statusElement = document.getElementById('status');
const footerElement = document.getElementById('app-footer');

let catalog = null;
let state = createEmptyState();
let renderRevision = 0;

async function main() {
  footerElement.textContent = `core ${CORE_VERSION} · seed ${sessionSeed}`;
  try {
    catalog = await loadCatalog(`${baseUrl}/assets/core/data`);
  } catch (error) {
    console.error(error);
    showStatus('Не удалось загрузить базу ароматов. Обновите страницу.');
    return;
  }
  state = readState(window.location.search, catalog);
  window.addEventListener('popstate', () => {
    state = readState(window.location.search, catalog);
    render();
  });
  render();
}

const actions = {
  onSelect: (directionId) => update(selectDirection(directionId)),
  onBack: () => update(createEmptyState()),
  onPin: (flavorId) => update(pinFlavor(state, flavorId)),
  onUnpin: (flavorId) => update(unpinFlavor(state, flavorId)),
  onExclude: (flavorId) => update(excludeFlavor(state, flavorId)),
  onInclude: (flavorId) => update(includeFlavor(state, flavorId)),
  onToggleShift: (shiftId) => update(toggleShift(state, shiftId)),
  onToggleCooling: () => update(toggleCooling(state)),
  onMore: () => update(nextPage(state), { replace: true }),
};

function update(nextState, { replace = false } = {}) {
  if (nextState === state) {
    return;
  }
  state = nextState;
  saveUrl(replace);
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
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
  const direction = findDirection(state.directionId);
  if (!direction) {
    showStatus(null);
    renderDirections(screenElement, actions);
    return;
  }
  try {
    const { mixes, page } = await loadMixes(buildQuery(state, catalog), state.page);
    if (revision !== renderRevision) {
      return;
    }
    if (page !== state.page) {
      state = withPage(state, page);
      saveUrl(true);
    }
    showStatus(null);
    renderResults(screenElement, {
      direction, state, catalog, mixes, canPin: canPin(state), isCoolingOn: isCoolingOn(state),
    }, actions);
  } catch (error) {
    console.error(error);
    showStatus('Не получилось подобрать миксы. Снимите одно из уточнений или выберите другое направление.');
  }
}

async function loadMixes(query, page) {
  const request = { query, seed: sessionSeed };
  const result = await recommend(request, catalog, page);
  if (page > 0 && result.mixes.length === 0) {
    const firstPage = await recommend(request, catalog, 0);
    return { mixes: firstPage.mixes, page: 0 };
  }
  return { mixes: result.mixes, page };
}

function showStatus(message) {
  statusElement.hidden = message === null;
  statusElement.textContent = message ?? '';
}

main();
