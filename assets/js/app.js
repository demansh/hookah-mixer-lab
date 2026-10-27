import { CORE_VERSION, loadCatalog, recommend, createSessionSeed, flavorLabel } from '../core/js/index.js';

const LANG = 'ru';
const TIER_LABELS = {
  classic: 'Классика с изюминкой',
  balanced: 'Эксперимент',
  bold: 'Смелое сочетание',
};

const baseUrl = document.documentElement.dataset.baseurl || '';
const sessionSeed = createSessionSeed();

const formElement = document.getElementById('query-form');
const queryInput = document.getElementById('query-input');
const submitButton = document.getElementById('query-submit');
const statusElement = document.getElementById('status');
const mixesContainer = document.getElementById('mixes');
const footerElement = document.getElementById('app-footer');

async function main() {
  footerElement.textContent = `core ${CORE_VERSION} · seed ${sessionSeed}`;

  let catalog;
  try {
    catalog = await loadCatalog(`${baseUrl}/assets/core/data`);
  } catch (error) {
    console.error(error);
    showStatus('Не удалось загрузить базу ароматов. Обновите страницу.');
    return;
  }
  submitButton.disabled = false;

  const session = { query: null, page: 0 };

  formElement.addEventListener('submit', async (event) => {
    event.preventDefault();
    const query = queryInput.value.trim();
    const page = query === session.query ? session.page + 1 : 0;
    try {
      const { mixes, loadedPage } = await loadMixes(query, page, catalog);
      Object.assign(session, { query, page: loadedPage });
      showStatus(null);
      renderMixes(mixes, catalog);
    } catch (error) {
      console.error(error);
      showStatus('Не получилось подобрать миксы. Попробуйте другой запрос.');
    }
  });
}

async function loadMixes(query, page, catalog) {
  const request = { query, seed: sessionSeed };
  const result = await recommend(request, catalog, page);
  if (page > 0 && result.mixes.length === 0) {
    const firstPage = await recommend(request, catalog, 0);
    return { mixes: firstPage.mixes, loadedPage: 0 };
  }
  return { mixes: result.mixes, loadedPage: page };
}

function renderMixes(mixes, catalog) {
  mixesContainer.replaceChildren(...mixes.map((mix) => createMixCard(mix, catalog)));
}

function createMixCard(mix, catalog) {
  const card = createElement('article', `mix-card mix-card--${mix.tier}`);
  card.append(createElement('h2', 'mix-tier', TIER_LABELS[mix.tier] ?? mix.tier));

  const componentList = createElement('ul', 'mix-components');
  mix.components.forEach(({ flavorId, share }) => {
    const item = createElement('li', 'mix-component');
    const flavor = catalog.flavorsById.get(flavorId);
    item.append(
      createElement('span', 'mix-component-name', flavor ? flavorLabel(flavor, LANG) : flavorId),
      createElement('span', 'mix-component-share', `${share}%`),
    );
    componentList.append(item);
  });
  card.append(componentList);

  const noteText = mix.note?.[LANG];
  if (noteText) {
    card.append(createElement('p', 'mix-note', noteText));
  }
  return card;
}

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
}

function showStatus(message) {
  statusElement.hidden = message === null;
  statusElement.textContent = message ?? '';
}

main();
