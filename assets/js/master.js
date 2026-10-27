import { TEMPERATURES } from './options.js';

const EVENT_MOODS = {
  puzzled: { face: '🤨', label: 'Мастер недоумевает: так не сочетается' },
  dizzy: { face: '😵', label: 'Идеи кончились, мастер начинает сначала' },
};

export function resolveMood({ hasMix = true, wrapped = false, temperature }) {
  if (!hasMix) {
    return EVENT_MOODS.puzzled;
  }
  if (wrapped) {
    return EVENT_MOODS.dizzy;
  }
  const { face, mood } = TEMPERATURES.find((item) => item.tier === temperature);
  return { face, label: mood };
}

export function showMaster(element, { face, label }) {
  element.textContent = face;
  element.setAttribute('aria-label', label);
  element.title = label;
  element.classList.remove('is-changing');
  void element.offsetWidth;
  element.classList.add('is-changing');
}
