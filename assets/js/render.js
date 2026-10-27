import { flavorLabel } from '../core/js/index.js';
import { DIRECTIONS, SHIFTS, COOLING_ID, COOLING_LABEL, TIER_LABELS, LANG } from './options.js';

export function renderDirections(container, { onSelect }) {
  const grid = createElement('div', 'direction-grid');
  DIRECTIONS.forEach((direction) => {
    const button = createButton(`direction-button direction-button--${direction.id}`, () => onSelect(direction.id));
    button.append(
      createElement('span', 'direction-icon', direction.icon),
      createElement('span', 'direction-label', direction.label),
    );
    grid.append(button);
  });
  container.replaceChildren(
    createElement('p', 'screen-hint', 'Чего хочется? Выберите направление — миксы появятся сразу.'),
    grid,
  );
}

export function renderResults(container, view, actions) {
  container.replaceChildren(
    createResultsHeader(view, actions),
    ...optional(createSelectionChips(view, actions)),
    createShiftRow(view, actions),
    createMixList(view, actions),
    createButton('more-button', actions.onMore, 'Ещё варианты'),
  );
}

function createResultsHeader({ direction }, { onBack }) {
  const header = createElement('div', 'results-header');
  header.append(
    createButton('back-button', onBack, '← Направления'),
    createElement('h2', 'results-title', `${direction.icon} ${direction.label}`),
  );
  return header;
}

function createSelectionChips({ state, catalog }, { onUnpin, onInclude }) {
  const pinned = state.pinned.filter((id) => id !== COOLING_ID);
  if (pinned.length === 0 && state.excluded.length === 0) {
    return null;
  }
  const row = createElement('div', 'chip-row');
  pinned.forEach((id) => {
    row.append(createButton('chip chip--pinned', () => onUnpin(id), `📌 ${label(catalog, id)} ✕`));
  });
  state.excluded.forEach((id) => {
    row.append(createButton('chip chip--excluded', () => onInclude(id), `🚫 ${label(catalog, id)} ✕`));
  });
  return row;
}

function createShiftRow({ state, canPin, isCoolingOn }, { onToggleShift, onToggleCooling }) {
  const row = createElement('div', 'shift-row');
  SHIFTS.forEach((shift) => {
    row.append(createToggle(shift.label, state.shifts.includes(shift.id), () => onToggleShift(shift.id)));
  });
  const cooling = createToggle(COOLING_LABEL, isCoolingOn, onToggleCooling);
  cooling.disabled = !isCoolingOn && !canPin;
  row.append(cooling);
  return row;
}

function createMixList(view, actions) {
  const list = createElement('section', 'mix-list');
  list.setAttribute('aria-live', 'polite');
  if (view.mixes.length === 0) {
    list.append(createElement('p', 'screen-hint', 'Ничего не нашлось. Снимите одно из уточнений.'));
    return list;
  }
  view.mixes.forEach((mix) => list.append(createMixCard(mix, view, actions)));
  return list;
}

function createMixCard(mix, view, actions) {
  const card = createElement('article', `mix-card mix-card--${mix.tier}`);
  card.append(createElement('h3', 'mix-tier', TIER_LABELS[mix.tier] ?? mix.tier));
  const componentList = createElement('ul', 'mix-components');
  mix.components.forEach((component) => componentList.append(createComponentRow(component, view, actions)));
  card.append(componentList);
  const noteText = mix.note?.[LANG];
  if (noteText) {
    card.append(createElement('p', 'mix-note', noteText));
  }
  const similarButton = createButton('similar-button', () => {}, 'Хочу похожее · скоро');
  similarButton.disabled = true;
  card.append(similarButton);
  return card;
}

function createComponentRow({ flavorId, share }, { state, catalog, canPin }, { onPin, onUnpin, onExclude }) {
  const isPinned = state.pinned.includes(flavorId);
  const item = createElement('li', 'mix-component');
  const toggle = createButton('mix-component-toggle', () => toggleActions(item));
  toggle.setAttribute('aria-expanded', 'false');
  toggle.append(
    createElement('span', 'mix-component-name', `${isPinned ? '📌 ' : ''}${label(catalog, flavorId)}`),
    createElement('span', 'mix-component-share', `${share}%`),
  );
  const actionRow = createElement('div', 'mix-component-actions');
  actionRow.hidden = true;
  if (isPinned) {
    actionRow.append(createButton('action-button', () => onUnpin(flavorId), 'Открепить'));
  } else {
    const pinButton = createButton('action-button', () => onPin(flavorId), '📌 Оставить во всех');
    pinButton.disabled = !canPin;
    actionRow.append(pinButton);
  }
  actionRow.append(createButton('action-button action-button--danger', () => onExclude(flavorId), '✕ Убрать'));
  item.append(toggle, actionRow);
  return item;
}

function toggleActions(item) {
  const willOpen = item.querySelector('.mix-component-actions').hidden;
  item.closest('.mix-list').querySelectorAll('.mix-component').forEach((other) => {
    other.querySelector('.mix-component-actions').hidden = true;
    other.querySelector('.mix-component-toggle').setAttribute('aria-expanded', 'false');
  });
  item.querySelector('.mix-component-actions').hidden = !willOpen;
  item.querySelector('.mix-component-toggle').setAttribute('aria-expanded', String(willOpen));
}

function createToggle(text, isPressed, onClick) {
  const button = createButton('shift-toggle', onClick, text);
  button.setAttribute('aria-pressed', String(isPressed));
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
