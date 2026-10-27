import { MAX_REQUIRED_FLAVORS, isIngredient, flavorLabel } from '../core/js/index.js';
import { DIRECTIONS, SHIFTS, COOLING_ID, LANG } from './options.js';

const directionsById = new Map(DIRECTIONS.map((direction) => [direction.id, direction]));
const shiftsById = new Map(SHIFTS.map((shift) => [shift.id, shift]));
const LIST_SEPARATOR = ',';

export function createEmptyState() {
  return { directionId: null, pinned: [], excluded: [], shifts: [], page: 0 };
}

export function findDirection(directionId) {
  return directionsById.get(directionId) ?? null;
}

export function readState(search, catalog) {
  const params = new URLSearchParams(search);
  const directionId = params.get('d');
  if (!directionsById.has(directionId)) {
    return createEmptyState();
  }
  const isKnownIngredient = (id) => isIngredient(catalog.flavorsById.get(id) ?? {});
  const pinned = unique(readList(params, 'keep').filter(isKnownIngredient)).slice(0, MAX_REQUIRED_FLAVORS);
  const excluded = unique(readList(params, 'drop').filter((id) => isKnownIngredient(id) && !pinned.includes(id)));
  const shifts = unique(readList(params, 'shift').filter((id) => shiftsById.has(id)));
  const page = Math.max(0, Number.parseInt(params.get('p') ?? '0', 10) || 0);
  return { directionId, pinned, excluded, shifts, page };
}

export function writeState(state) {
  if (!state.directionId) {
    return '';
  }
  const params = new URLSearchParams({ d: state.directionId });
  writeList(params, 'keep', state.pinned);
  writeList(params, 'drop', state.excluded);
  writeList(params, 'shift', state.shifts);
  if (state.page > 0) {
    params.set('p', String(state.page));
  }
  return `?${params.toString().replaceAll('%2C', LIST_SEPARATOR)}`;
}

export function buildQuery(state, catalog) {
  const label = (id) => flavorLabel(catalog.flavorsById.get(id), LANG);
  return [
    findDirection(state.directionId)?.query ?? '',
    ...state.pinned.map(label),
    ...state.shifts.map((id) => shiftsById.get(id).query),
    ...state.excluded.map((id) => `без ${label(id)}`),
  ].filter(Boolean).join(', ');
}

export function canPin(state) {
  return state.pinned.length < MAX_REQUIRED_FLAVORS;
}

export function selectDirection(directionId) {
  return { ...createEmptyState(), directionId };
}

export function pinFlavor(state, flavorId) {
  if (state.pinned.includes(flavorId) || !canPin(state)) {
    return state;
  }
  return refine(state, {
    pinned: [...state.pinned, flavorId],
    excluded: without(state.excluded, flavorId),
  });
}

export function unpinFlavor(state, flavorId) {
  return refine(state, { pinned: without(state.pinned, flavorId) });
}

export function excludeFlavor(state, flavorId) {
  if (state.excluded.includes(flavorId)) {
    return state;
  }
  return refine(state, {
    pinned: without(state.pinned, flavorId),
    excluded: [...state.excluded, flavorId],
  });
}

export function includeFlavor(state, flavorId) {
  return refine(state, { excluded: without(state.excluded, flavorId) });
}

export function toggleShift(state, shiftId) {
  const shifts = state.shifts.includes(shiftId) ? without(state.shifts, shiftId) : [...state.shifts, shiftId];
  return refine(state, { shifts });
}

export function isCoolingOn(state) {
  return state.pinned.includes(COOLING_ID);
}

export function toggleCooling(state) {
  return isCoolingOn(state) ? unpinFlavor(state, COOLING_ID) : pinFlavor(state, COOLING_ID);
}

export function nextPage(state) {
  return { ...state, page: state.page + 1 };
}

export function withPage(state, page) {
  return { ...state, page };
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
