# hookah-mixer-lab

Экспериментальный интерфейс Hookah Mixer. Здесь пробуем новые UX-идеи, не трогая основную версию
(https://demansh.github.io/hookah-mixer/).

**Сайт:** https://demansh.github.io/hookah-mixer-lab/

## Что сейчас есть
Заглушка: одна строка запроса и три микса — классика с изюминкой, эксперимент, смелое сочетание.
Повторная отправка того же запроса даёт следующую страницу миксов (по кругу). Внизу — версия ядра и зерно сессии.

## Устройство
- GitHub Pages + Jekyll (только сборка страницы), Vanilla JS с ES-модулями без сборщика.
- Ядро (база знаний и движок подбора) — репозиторий `hookah-mixer-core`, лежит рядом: `../hookah-mixer-core`.
  В приложение попадает копией собранного `dist/` в `assets/core/`; руками `assets/core/` не правим.
- `assets/js/app.js` — вся логика интерфейса, `assets/css/main.css` — стили, `index.html` — разметка.

## Обновить ядро
```bash
(cd ../hookah-mixer-core && npm install && npm run build)
./tools/sync-core.sh        # путь к ядру можно переопределить: CORE_DIR=... ./tools/sync-core.sh
```

## Запустить локально
```bash
bundle install
bundle exec jekyll serve    # http://127.0.0.1:4000/hookah-mixer-lab/
```

## Публикация
GitHub Pages из ветки `master`, корень репозитория (Settings → Pages → Deploy from a branch).

## Общий origin с основной версией
Все сайты `demansh.github.io/*` живут на одном origin, поэтому `localStorage`, `sessionStorage`, cookies
и кэши общие с основным приложением. Ключи хранилища лаборатории — только с префиксом `hookah-mixer-lab:`.
Service worker, если появится, регистрировать со scope `/hookah-mixer-lab/`.
