# hookah-mixer-lab — контекст для AI-агента

Песочница для экспериментов с UX Hookah Mixer. Основная версия — `~/dev/pet/hookah-mixer`
(https://demansh.github.io/hookah-mixer/), её не трогаем. Ядро — `~/dev/pet/hookah-mixer-core`
(база знаний и движок подбора миксов, описание API в его `README.md`). Подробности о проекте — в `README.md`.

## Пользователь и правила работы (обязательно)
- Общение и документация — на русском.
- **Никаких комментариев в коде** (включая docstrings). Unit-тестов нет, тестовые фреймворки не предлагать.
- Агент **не коммитит и не пушит**: в конце даёт команду `git add -A && git commit -m "..." && git push`.
  Локальный `user.email` репозитория — `demansh17@gmail.com`.
- Ядро используем только через `assets/core/js/index.js`; `assets/core/` не правим руками — только
  `tools/sync-core.sh` после `npm run build` в ядре. Нужна правка движка или данных — она делается в ядре.
- Общий origin с основной версией: ключи `localStorage`/`sessionStorage` — только с префиксом
  `hookah-mixer-lab:`, service worker — только со scope `/hookah-mixer-lab/`.
- Безопасность: строгий CSP в `_layouts/default.html`, пользовательский ввод выводить только через `textContent`.
- Планы и исследования сохранять в `~/ai/hookah-mixer/` (≤100 строк, ≤120 символов, разделы: запрос
  пользователя, краткое содержание, основная часть).

## Команды
```bash
./tools/sync-core.sh               # подтянуть собранное ядро из ../hookah-mixer-core/dist
bundle exec jekyll serve           # http://127.0.0.1:4000/hookah-mixer-lab/
bundle exec jekyll build           # проверить, что сайт собирается
```

## Состояние на 2026-10-27
- Заглушка: строка запроса → 3 микса (classic, balanced, bold), повтор запроса — следующая страница.
- Ядро 0.1.0. Дальше — эксперименты с UX (в планах навигация по графу миксов, см. CLAUDE.md ядра).
