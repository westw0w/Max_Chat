# MAX Chat — веб-интерфейс Max на базе GREEN-API

Веб-приложение для обмена сообщениями Max через HTTP API [GREEN-API](https://green-api.com/). Позволяет отправлять и принимать текстовые сообщения, просматривать историю чатов.

## 🚀 Возможности

- **Авторизация**
- **Сохранение сессии**
- **Список чатов**
- **История сообщений**
- **Отправка сообщений**
- **Real-time уведомления**
- **Звуковые оповещения**
- **Новый чат**

## 🛠️ Технологический стек

| Технология                                                | Назначение                                   |
| --------------------------------------------------------- | -------------------------------------------- |
| [React 18](https://react.dev/)                            | UI-библиотека                                |
| [TypeScript 5.6](https://www.typescriptlang.org/)         | Статическая типизация                        |
| [Vite 5](https://vitejs.dev/)                             | Сборщик и dev-сервер                         |
| [CSS Modules](https://github.com/css-modules/css-modules) | Изолированные стили компонентов              |
| [TanStack React Query](https://tanstack.com/query)        | Управление серверным состоянием (установлен) |

## 📁 Структура проекта

```
max-chat/
├── index.html                          # Точка входа HTML
├── package.json                        # Зависимости и скрипты
├── tsconfig.json                       # Конфигурация TypeScript
├── vite.config.ts                      # Конфигурация Vite (алиас @)
└── src/
    ├── main.tsx                        # Точка входа React
    ├── app/
    │   ├── App.tsx                     # Корневой компонент (роутинг Auth ↔ MainLayout)
    │   ├── index.ts                    # Реэкспорт App
    │   └── styles/
    │       └── index.css               # Глобальные стили
    ├── components/
    │   ├── Auth/                       # Форма авторизации
    │   │   ├── Auth.tsx
    │   │   ├── Auth.module.css
    │   │   └── index.ts
    │   ├── MainLayout/                 # Основной лейаут
    │   │   ├── MainLayout.tsx
    │   │   ├── MainLayout.module.css
    │   │   └── index.ts
    │   ├── Sidebar/                    # Боковая панель со списком чатов
    │   │   ├── Sidebar.tsx
    │   │   ├── Sidebar.module.css
    │   │   └── index.ts
    │   ├── ChatWindow/                 # Окно переписки выбранного чата
    │   │   ├── ChatWindow.tsx
    │   │   ├── ChatWindow.module.css
    │   │   └── index.ts
    │   └── NewChatModal/               # Модальное окно создания нового чата
    │       ├── NewChatModal.tsx
    │       ├── NewChatModal.module.css
    │       └── index.ts
    ├── hooks/
    │   └── useChats.ts                 # Главный хук бизнес-логики чатов
    ├── services/
    │   ├── greenApi.ts                 # Клиент GREEN-API
    │   └── notificationService.ts      # Звуковые уведомления
    ├── types/
    │   ├── auth.ts                     # Типы авторизации
    │   ├── chat.ts                     # Типы чатов
    │   └── message.ts                  # Типы сообщений и уведомлений
    └── utils/
        ├── chatDisplay.ts              # Утилиты отображения
        └── messageFallback.ts          # Заглушки для нетекстовых типов сообщений
```

### Установка и запуск

```bash

# Установка зависимостей
npm install

# Запуск dev-сервера
npm run dev
```

Приложение будет доступно по адресу `http://localhost:5173`.

### Сборка для production

```bash
npm run build    # TypeScript-проверка + сборка Vite
npm run preview  # Предпросмотр собранного приложения
```
