import { flavorLabel } from '../core/js/index.js';
import { TEMPERATURES, LANG } from './options.js';
import { createIcon } from './icons.js';

export function conceptLabel(concept) {
  const phrase = concept.phrases[LANG][0] ?? concept.id;
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

export function renderStart(container, { concepts }, { onPickConcept }) {
  const cloud = createElement('div', 'concept-cloud');
  concepts.forEach((concept) => {
    cloud.append(createButton('concept-chip', () => onPickConcept(concept.id), conceptLabel(concept)));
  });
  container.replaceChildren(
    createElement('p', 'screen-hint', 'Выберите настроение — или доверьтесь случаю кнопкой внизу.'),
    cloud,
  );
}

export function renderMix(container, view, actions) {
  const { concept, mix, temperature, isFallbackTier } = view;
  const card = createElement('article', `mix-card mix-card--${mix?.tier ?? 'none'}`);
  card.append(
    createElement('p', 'mix-concept', concept ? conceptLabel(concept) : 'На вкус мастера'),
    createElement('h2', 'mix-mood', temperature.mood),
  );
  if (isFallbackTier) {
    card.append(createElement('p', 'mix-hint', 'На этой температуре вариантов нет — показан ближайший.'));
  }
  if (mix) {
    const componentList = createElement('ul', 'mix-components');
    mix.components.forEach((component) => componentList.append(createComponentRow(component, view, actions)));
    card.append(componentList);
    const noteText = mix.note?.[LANG];
    if (noteText) {
      card.append(createElement('p', 'mix-note', noteText));
    }
  } else {
    card.append(createElement('p', 'mix-hint', 'Ничего не нашлось. Верните убранный аромат или открепите один.'));
  }
  container.replaceChildren(card, ...optional(createExcludedRow(view, actions)));
}

export function renderBottomActions(container, isMixScreen, { onSurprise, onReset, onAnother }) {
  if (!isMixScreen) {
    container.replaceChildren(createButton('surprise-button', onSurprise, '🎲 Случайный микс'));
    return;
  }
  container.replaceChildren(
    createIconButton('reset-button', onReset, 'trash', 'Начать заново'),
    createIconButton('another-button', onAnother, 'refresh', 'Другой микс'),
  );
}

export function renderThermometer(container, currentTier, { onSetTemperature }) {
  const scale = createElement('div', 'thermometer-scale');
  scale.setAttribute('role', 'group');
  scale.setAttribute('aria-label', 'Температура мастера');
  TEMPERATURES.forEach((temperature) => {
    const button = createButton(`thermometer-step thermometer-step--${temperature.tier}`, () => onSetTemperature(temperature.tier));
    button.setAttribute('aria-pressed', String(temperature.tier === currentTier));
    button.append(
      createElement('span', 'thermometer-value', temperature.label),
      createElement('span', 'thermometer-caption', temperature.caption),
    );
    scale.append(button);
  });
  container.replaceChildren(createElement('span', 'thermometer-title', '🌡️ Температура мастера'), scale);
}

function createComponentRow({ flavorId, share }, { state, catalog, canPin }, { onPin, onUnpin, onExclude }) {
  const isPinned = state.required.includes(flavorId);
  const flavorName = label(catalog, flavorId);
  const item = createElement('li', `mix-component${isPinned ? ' mix-component--pinned' : ''}`);
  const pinButton = createIconButton(
    'pin-button',
    () => (isPinned ? onUnpin(flavorId) : onPin(flavorId)),
    'heart',
    isPinned ? `Открепить: ${flavorName}` : `Оставить во всех миксах: ${flavorName}`,
  );
  pinButton.setAttribute('aria-pressed', String(isPinned));
  pinButton.disabled = !isPinned && !canPin;
  item.append(
    pinButton,
    createElement('span', 'mix-component-name', flavorName),
    createElement('span', 'mix-component-share', `${share}%`),
    createIconButton('exclude-button', () => onExclude(flavorId), 'x', `Убрать: ${flavorName}`),
  );
  return item;
}

function createExcludedRow({ state, catalog }, { onInclude }) {
  if (state.excluded.length === 0) {
    return null;
  }
  const row = createElement('div', 'excluded-row');
  row.append(createElement('span', 'excluded-title', 'Убрано:'));
  state.excluded.forEach((id) => {
    row.append(createButton('excluded-chip', () => onInclude(id), `${label(catalog, id)} ✕`));
  });
  return row;
}

function createIconButton(className, onClick, iconName, accessibleLabel) {
  const button = createButton(`icon-button ${className}`, onClick);
  button.setAttribute('aria-label', accessibleLabel);
  button.title = accessibleLabel;
  button.append(createIcon(iconName));
  return button;
}

function createButton(className, onClick, text) {
  const button = createElement('button', className, text);
  button.type = 'button';
  button.addEventListener('click', onClick);
  return button;
}

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
}

function label(catalog, flavorId) {
  const flavor = catalog.flavorsById.get(flavorId);
  return flavor ? flavorLabel(flavor, LANG) : flavorId;
}

function optional(element) {
  return element ? [element] : [];
}
