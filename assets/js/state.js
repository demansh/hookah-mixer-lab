import { MAX_REQUIRED_FLAVORS, isIngredient } from '../core/js/index.js';
import { TEMPERATURES, DEFAULT_TEMPERATURE } from './options.js';

const temperatureTiers = new Set(TEMPERATURES.map((temperature) => temperature.tier));
const LIST_SEPARATOR = ',';
const MIX_SCREEN = 'mix';

export function createStartState(temperature = DEFAULT_TEMPERATURE) {
  return { screen: 'start', conceptId: null, required: [], excluded: [], page: 0, temperature };
}

export function readState(search, catalog) {
  const params = new URLSearchParams(search);
  const temperature = temperatureTiers.has(params.get('t')) ? params.get('t') : DEFAULT_TEMPERATURE;
  if (params.get('s') !== MIX_SCREEN) {
    return createStartState(temperature);
  }
  const conceptId = catalog.concepts.some((concept) => concept.id === params.get('c')) ? params.get('c') : null;
  const isKnownIngredient = (id) => isIngredient(catalog.flavorsById.get(id) ?? {});
  const required = unique(readList(params, 'keep').filter(isKnownIngredient)).slice(0, MAX_REQUIRED_FLAVORS);
  const excluded = unique(readList(params, 'drop').filter((id) => isKnownIngredient(id) && !required.includes(id)));
  const page = Math.max(0, Number.parseInt(params.get('p') ?? '0', 10) || 0);
  return { screen: MIX_SCREEN, conceptId, required, excluded, page, temperature };
}

export function writeState(state) {
  const params = new URLSearchParams();
  if (state.screen === MIX_SCREEN) {
    params.set('s', MIX_SCREEN);
    if (state.conceptId) {
      params.set('c', state.conceptId);
    }
    writeList(params, 'keep', state.required);
    writeList(params, 'drop', state.excluded);
    if (state.page > 0) {
      params.set('p', String(state.page));
    }
  }
  if (state.temperature !== DEFAULT_TEMPERATURE) {
    params.set('t', state.temperature);
  }
  const search = params.toString().replaceAll('%2C', LIST_SEPARATOR);
  return search ? `?${search}` : '';
}

export function toSelection(state) {
  return {
    concepts: state.conceptId ? { [state.conceptId]: 1 } : {},
    required: state.required,
    excluded: state.excluded,
  };
}

export function isMixScreen(state) {
  return state.screen === MIX_SCREEN;
}

export function startMix(state, conceptId) {
  return { ...state, screen: MIX_SCREEN, conceptId, required: [], excluded: [], page: 0 };
}

export function canPin(state) {
  return state.required.length < MAX_REQUIRED_FLAVORS;
}

export function pinFlavor(state, flavorId) {
  if (state.required.includes(flavorId) || !canPin(state)) {
    return state;
  }
  return refine(state, { required: [...state.required, flavorId], excluded: without(state.excluded, flavorId) });
}

export function unpinFlavor(state, flavorId) {
  return refine(state, { required: without(state.required, flavorId) });
}

export function excludeFlavor(state, flavorId) {
  if (state.excluded.includes(flavorId)) {
    return state;
  }
  return refine(state, { required: without(state.required, flavorId), excluded: [...state.excluded, flavorId] });
}

export function includeFlavor(state, flavorId) {
  return refine(state, { excluded: without(state.excluded, flavorId) });
}

export function nextPage(state) {
  return { ...state, page: state.page + 1 };
}

export function withPage(state, page) {
  return { ...state, page };
}

export function setTemperature(state, temperature) {
  return state.temperature === temperature ? state : { ...state, temperature };
}

function refine(state, changes) {
  return { ...state, ...changes, page: 0 };
}

function readList(params, key) {
  return (params.get(key) ?? '').split(LIST_SEPARATOR).filter(Boolean);
}

function writeList(params, key, values) {
  if (values.length > 0) {
    params.set(key, values.join(LIST_SEPARATOR));
  }
}

function unique(values) {
  return [...new Set(values)];
}

function without(values, value) {
  return values.filter((item) => item !== value);
}
