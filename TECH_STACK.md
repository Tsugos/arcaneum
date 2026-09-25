# TECH_STACK

## Назначение

Этот документ фиксирует официальный стек технологий проекта Arcaneum.

Выбранный стек считается базовым и не должен изменяться без серьезных архитектурных причин.

---

# Frontend

Framework:
- React

Language:
- TypeScript

Build Tool:
- Vite

Routing:
- TanStack Router

State Management:
- Zustand

Server State:
- TanStack Query

Forms:
- React Hook Form

Validation:
- Zod

Styling:
- Tailwind CSS

Icons:
- Lucide

Animations:
- Motion

---

# Local Storage

Основное хранилище:

- IndexedDB

Рекомендуемая библиотека:

- Dexie

Использование LocalStorage допускается только для небольших пользовательских настроек.

---

# PWA

Использовать:

- Vite PWA Plugin

Требования:

- установка через браузер;
- офлайн-доступ;
- кэширование статических ресурсов;
- автоматическое обновление Service Worker.

---

# AI

Первичный провайдер:

- AI Horde

Архитектура обязана поддерживать:

- OpenRouter;
- Ollama;
- LM Studio;
- KoboldCPP;
- OpenAI;
- Anthropic;
- Google Gemini;
- любые OpenAI-совместимые API.

Подключение новых провайдеров не должно требовать изменения существующего кода.

---

# Image Generation

Первый источник:

- AI Horde

Архитектура должна позволять подключать альтернативные сервисы генерации изображений.

---

# Voice

Speech-to-Text:

- Web Speech API (если доступен)
- альтернативные локальные реализации через адаптеры.

Text-to-Speech:

- проектируется как отдельный модуль без привязки к конкретной технологии.

---

# Тестирование

Unit:
- Vitest

Component:
- Testing Library

E2E:
- Playwright

---

# Линтинг

ESLint

Prettier

TypeScript Strict Mode обязателен.

Использование `any` допускается только при документированном обосновании.

---

# Архитектурное правило

Технологии — это детали реализации.

Архитектура проекта не должна зависеть от выбранного стека.

При необходимости стек можно заменить без изменения бизнес-логики.