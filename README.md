# Crypto Price Tracker API

Backend-сервис на Node.js, Express, TypeScript и SQLite для отслеживания и агрегации курсов криптовалют с использованием официального API CoinMarketCap.

## Возможности

Управление валютами (CRUD): создание, просмотр, редактирование и удаление криптовалют в реестре.
Интеграция с CoinMarketCap: получение котировок в единой валюте (USD) с ограничением таймаутов и автоматическими повторами при сбоях (retry).
Хранение истории в SQLite: хранение цен и метаданных без использования ORM (чистый SQL с параметризацией для защиты от SQL-инъекций).
Фоновая синхронизация: периодический опрос котировок каждые 5 минут с защитой от наложения задач и корректным завершением (Graceful Shutdown по SIGINT/SIGTERM).

## Требования

Node.js версии 18 или выше (рекомендуется 20+)
Для запуска через Docker — установленные Docker и Docker Compose

## Установка

1.  Клонируйте репозиторий:
    ```bash
    git clone https://github.com/Zonexe/evercode-internship.git
    cd evercode-internship
    ```
2.  Установите зависимости:
    ```bash
    npm install
    ```
3.  Создайте файл окружения из шаблона:
    ```bash
    cp .env.example .env
    ```
4.  Сгенерируйте 64-символьный токен и укажите его в `.env` как значение `API_TOKEN`:
    ```bash
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
    ```
5.  Инициализируйте схему базы данных:
    ```bash
    npm run db:init
    ```

## Переменные окружения

Конфигурация загружается из файла `.env`. См. `.env.example`.

`PORT` — порт HTTP-сервера. По умолчанию `3000`.
`APP_NAME` — название приложения. По умолчанию `EvercodeInternshipApp`.
`APP_VERSION` — версия приложения. По умолчанию `1.0.0`.
`DB_PATH` — путь к файлу базы данных SQLite. По умолчанию `./data/currencies.db`.
`API_TOKEN` — обязательный Bearer-токен для авторизации. Должен содержать ровно 64 символа. Приложение завершится с ошибкой, если токен отсутствует или имеет другую длину.

## Использование

### Запуск в режиме разработки

    ```bash
    npm run start:dev
    ```

### Production-сборка и запуск

    ```bash
    npm run build
    npm start
    ```

### Запуск через Docker

1.  Укажите `API_TOKEN` в файле `.env`
2.  Соберите и запустите контейнер:
    ```bash
    docker compose up --build
    ```

После запуска сервер доступен по адресу `http://localhost:3000`, а интерактивная документация Swagger — на `http://localhost:3000/api-docs`

## Структура проекта

src/index.ts — точка входа: инициализация, запуск фонового шедулера и Graceful Shutdown
src/app.ts — настройка Express, Swagger UI и подключение маршрутов
src/container.ts — контейнер внедрения зависимостей (Awilix DI)
src/currencies/ — модуль валют (контроллеры, валидация, репозиторий SQLite)
src/price/ — модуль цен, история котировок и клиент CoinMarketCap API
src/tasks/ — фоновая синхронизация котировок (UpdatePricesTask)
src/services/ — планировщик периодических задач (Scheduler)
src/middlewares/ — middleware авторизации токена и глобальной обработки ошибок
openapi/openapi.yaml — OpenAPI 3.0 спецификация
