# Crypto Price Tracker API

Этот проект представляет собой backend-сервис для отслеживания курсов криптовалют с биржи Binance и мониторинга балансов Биткоин-адресов в реальном времени. Сервис написан на Node.js, TypeScript и Express

## Возможности

Автоматическое обновление курсов валют с Binance каждые 60 секунд
Реестр разрешенных валют: цены отдаются только для зарегистрированных тикеров
CRUD-управление валютами и Биткоин-адресами

## Требования

Node.js версии 22 или выше
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

- `src/app.ts` — класс App: настройка Express и маршрутов
- `src/index.ts` — точка входа: запуск сервера, планировщика и graceful shutdown
- `src/container.ts` — DI-контейнер Awilix
- `src/config/` — конфигурация из переменных окружения
- `src/db/` — подключение и инициализация схемы SQLite
- `src/currencies/` — модуль валют
- `src/price/` — модуль цен и интеграция с Binance
- `src/addresses/` — модуль отслеживаемых Биткоин-адресов
- `src/blockchain/` — интеграция с Blockcypher
- `src/services/` — планировщик фоновых задач
- `src/tasks/` — фоновые задачи
- `src/middlewares/` — middleware аутентификации и обработки ошибок
- `src/errors/` — классы ошибок приложения
- `src/utils/` — логгер
- `openapi/openapi.yaml` — спецификация OpenAPI
- `Dockerfile` — многоэтапная сборка образа
- `docker-compose.yml` — оркестрация и volume для данных
- `.env.example` — шаблон переменных окружения
