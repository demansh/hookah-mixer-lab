import { TEMPERATURES } from './options.js';

const NERVOUS_REPEATS = 2;
const EXHAUSTED_REPEATS = 4;

const EVENT_MOODS = {
  waiting: { face: '🧙', label: 'Мастер ждёт заказ' },
  puzzled: { face: '🤨', label: 'Мастер недоумевает: так не сочетается' },
  dizzy: { face: '😵', label: 'Идеи кончились, мастер начинает сначала' },
  exhausted: { face: '🥵', label: 'Мастер работает на пределе' },
  nervous: { face: '😰', label: 'Мастер уже нервничает' },
  sweat: { face: '😅', label: 'Мастер волнуется, что миксы не нравятся' },
};

export function resolveMood({ isStart, hasMix, wrapped, repeatCount, temperature }) {
  if (isStart) {
    return EVENT_MOODS.waiting;
  }
  if (!hasMix) {
    return EVENT_MOODS.puzzled;
  }
  if (wrapped) {
    return EVENT_MOODS.dizzy;
  }
  if (repeatCount >= EXHAUSTED_REPEATS) {
    return EVENT_MOODS.exhausted;
  }
  if (repeatCount >= NERVOUS_REPEATS) {
    return EVENT_MOODS.nervous;
  }
  if (repeatCount > 0) {
    return EVENT_MOODS.sweat;
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
