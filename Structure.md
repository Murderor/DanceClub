```markdown
# Танцевальный менеджер - Документация проекта

## 📋 Обзор проекта

Веб-приложение для управления танцевальным коллективом. Позволяет регистрировать участников, генерировать уникальные 6-значные коды, управлять данными танцоров. Приложение использует Supabase в качестве базы данных и аутентификации.

## 🛠 Технологический стек

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Supabase (PostgreSQL + Authentication)
- **Хостинг**: GitHub Pages / Локальный сервер
- **Библиотеки**: 
  - SweetAlert2 - для красивых уведомлений
  - Font Awesome 6 - для иконок
  - Supabase JS Client - для работы с API

## 📁 Структура проекта

```
dance-manager/
│
├── index.html                 # Главная страница приложения
├── styles/
│   └── style.css             # Основные стили приложения
├── js/
│   ├── config.js             # Конфигурация Supabase и глобальные переменные
│   ├── auth.js               # Модуль авторизации и регистрации
│   ├── users.js              # Модуль управления участниками (CRUD)
│   └── main.js               # Главный модуль, инициализация приложения
└── README.md                 # Данный файл документации
```

## 📦 Модули приложения

### 1. config.js - Конфигурация
**Назначение**: Настройка подключения к Supabase и глобальные переменные

**Основные элементы**:
```javascript
const SUPABASE_CONFIG = {
    url: 'https://ваш_проект.supabase.co',
    anonKey: 'ваш_anon_ключ'
};
```

**Глобальные переменные**:
- `window.currentUser` - текущий авторизованный пользователь
- `window.currentProfile` - профиль текущего пользователя
- `window.allUsers` - список всех участников
- `window.initSupabase()` - функция инициализации клиента Supabase

### 2. auth.js - Аутентификация
**Назначение**: Управление входом, регистрацией и выходом пользователей

**Основные методы**:
| Метод | Описание |
|-------|----------|
| `checkSession()` | Проверка активной сессии, загрузка профиля |
| `loadUserProfile()` | Загрузка профиля пользователя из БД |
| `createUserProfile()` | Создание профиля при регистрации |
| `showAuth()` | Отображение формы авторизации |
| `logout()` | Выход из системы |
| `onAuthChange()` | Слушатель изменений состояния авторизации |
| `generateUniqueCode()` | Генерация уникального 6-значного кода |
| `getUniqueCode()` | Получение уникального кода с проверкой |

**Форма регистрации включает**:
- Фамилия (обязательно)
- Имя (обязательно)
- Отчество (опционально)
- Дата рождения (обязательно, возраст не менее 5 лет)
- Email (обязательно)
- Пароль (обязательно, минимум 6 символов)

### 3. users.js - Управление участниками
**Назначение**: CRUD операции с участниками коллектива

**Основные методы**:
| Метод | Описание |
|-------|----------|
| `loadUsers()` | Загрузка списка участников из Supabase |
| `addUser(userData)` | Добавление нового участника |
| `updateUser(userId, updatedData)` | Обновление данных участника |
| `deleteUser(userId)` | Удаление участника |
| `renderUsersTable(searchTerm)` | Отрисовка таблицы участников |
| `showAddModal()` | Отображение модального окна добавления |
| `openEditModal(userId)` | Отображение модального окна редактирования |
| `updateStats()` | Обновление счетчика участников |

**Особенности**:
- Автоматическая генерация уникального 6-значного кода при добавлении
- Проверка уникальности кода
- Невозможность удалить свой профиль
- Подсветка текущего пользователя в таблице

### 4. main.js - Главный модуль
**Назначение**: Инициализация приложения, управление интерфейсом

**Основные методы**:
| Метод | Описание |
|-------|----------|
| `init()` | Инициализация приложения, проверка сессии |
| `showMainApp()` | Отображение основного интерфейса |
| `hideMainApp()` | Скрытие основного интерфейса |
| `renderMainInterface()` | Рендеринг HTML структуры |
| `bindEvents()` | Привязка обработчиков событий |
| `showLoading()` | Отображение индикатора загрузки |
| `hideLoading()` | Скрытие индикатора загрузки |

## 🗄 Структура базы данных (Supabase)

### Таблица users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    last_name TEXT NOT NULL,
    first_name TEXT NOT NULL,
    patronymic TEXT,
    birth_date DATE NOT NULL,
    unique_code TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Индексы
```sql
CREATE INDEX idx_users_unique_code ON users(unique_code);
CREATE INDEX idx_users_last_name ON users(last_name);
CREATE INDEX idx_users_first_name ON users(first_name);
CREATE INDEX idx_users_email ON users(email);
```

### Триггеры
```sql
-- Автоматическое обновление updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 🔒 Политики безопасности (RLS)

```sql
-- Включаем RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Политики для users
CREATE POLICY "Users can view all users" ON users
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Authenticated users can insert users" ON users
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete users" ON users
    FOR DELETE USING (auth.role() = 'authenticated');
```

## 🚀 Настройка и запуск

### Предварительные требования
1. Аккаунт на [supabase.com](https://supabase.com)
2. Локальный веб-сервер (для разработки)

### Шаг 1: Создание проекта в Supabase
1. Зарегистрируйтесь на supabase.com
2. Создайте новый проект
3. Дождитесь создания базы данных

### Шаг 2: Настройка базы данных
1. Откройте SQL Editor в Supabase
2. Выполните SQL скрипты для создания таблицы `users`
3. Настройте RLS политики

### Шаг 3: Получение API ключей
1. Перейдите в Project Settings → API
2. Скопируйте `Project URL` и `anon public key`

### Шаг 4: Настройка приложения
1. Откройте `js/config.js`
2. Замените значения на свои:
```javascript
const SUPABASE_CONFIG = {
    url: 'https://ваш_проект.supabase.co',
    anonKey: 'ваш_anon_ключ'
};
```

### Шаг 5: Запуск приложения

#### Локальный запуск (рекомендуется):
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Node.js
npx serve
```
Затем откройте `http://localhost:8000`

#### Или используйте VS Code:
- Установите расширение "Live Server"
- Нажмите правой кнопкой на `index.html`
- Выберите "Open with Live Server"

#### Деплой на GitHub Pages:
1. Создайте репозиторий на GitHub
2. Загрузите все файлы проекта
3. Перейдите в Settings → Pages
4. Выберите ветку `main` и корневую директорию
5. Сохраните и получите ссылку на приложение

## 🎯 Функциональность

### Авторизация
- ✅ Регистрация с полными данными (ФИО, дата рождения, email, пароль)
- ✅ Вход существующих пользователей
- ✅ Автоматическое создание профиля при регистрации
- ✅ Генерация уникального 6-значного кода для каждого пользователя
- ✅ Выход из системы

### Управление участниками
- ✅ Просмотр списка всех участников
- ✅ Добавление новых участников
- ✅ Редактирование данных участников
- ✅ Удаление участников (кроме своего профиля)
- ✅ Поиск по имени, фамилии, коду или email
- ✅ Подсветка текущего пользователя в таблице

### Интерфейс
- ✅ Адаптивный дизайн для мобильных устройств
- ✅ Красивые уведомления через SweetAlert2
- ✅ Индикатор загрузки
- ✅ Статистика (общее количество участников, код пользователя)
- ✅ Модальные окна для форм

## 🔧 Устранение неполадок

### Проблема: Бесконечная загрузка после входа
**Решение**: Проверьте, что в таблице `users` есть запись с `id` текущего пользователя. Если нет, перезагрузите страницу - профиль будет создан автоматически.

### Проблема: Изменения не сохраняются
**Решение**: Проверьте консоль браузера на наличие ошибок. Убедитесь, что RLS политики разрешают операции UPDATE.

### Проблема: Ошибка при регистрации
**Решение**: Проверьте, что email не используется другим пользователем. Убедитесь, что возраст не менее 5 лет.

### Проблема: Не отображаются участники
**Решение**: Проверьте консоль на ошибки Supabase. Убедитесь, что таблица `users` существует и содержит данные.

## 📊 API Endpoints (Supabase)

### Authentication
| Метод | Описание |
|-------|----------|
| `supabase.auth.signUp()` | Регистрация пользователя |
| `supabase.auth.signInWithPassword()` | Вход с email/паролем |
| `supabase.auth.signOut()` | Выход из системы |
| `supabase.auth.getSession()` | Получение текущей сессии |
| `supabase.auth.onAuthStateChange()` | Отслеживание состояния авторизации |

### Database Operations (users)
| Операция | Метод Supabase |
|----------|----------------|
| SELECT | `supabase.from('users').select()` |
| INSERT | `supabase.from('users').insert()` |
| UPDATE | `supabase.from('users').update()` |
| DELETE | `supabase.from('users').delete()` |

## 🎨 Дизайн и UI

### Цветовая схема
- Основной градиент: `#667eea` → `#764ba2`
- Акцентный цвет: `#8b5cf6`
- Успех: `#06d6a0`
- Ошибка: `#ef476f`
- Текст: `#1f2937`

### Компоненты
- **Карточки статистики** - отображают ключевые метрики
- **Таблица участников** - с возможностью поиска и действий
- **Модальные окна** - для добавления/редактирования
- **Адаптивная навигация** - для мобильных устройств

## 📝 Примечания для разработчиков

### Добавление новых полей
1. Обновите структуру таблицы в Supabase
2. Добавьте поля в форму регистрации
3. Обновите методы `createUserProfile()` и `addUser()`
4. Добавьте поля в форму редактирования
5. Обновите `renderUsersTable()` для отображения

### Настройка RLS
Если нужно ограничить права:
```sql
-- Пример: только администраторы могут удалять
CREATE POLICY "Only admins can delete users" ON users
    FOR DELETE USING (
        auth.uid() IN (
            SELECT id FROM users WHERE role = 'admin'
        )
    );
```

### Отладка
Включите подробные логи в консоли:
- Все методы имеют `console.log()` для отслеживания
- Используйте `F12` для открытия инструментов разработчика
- Проверяйте вкладку Network для запросов к Supabase

## 📄 Лицензия

MIT License - свободное использование и модификация

## 👥 Поддержка

При возникновении вопросов:
1. Проверьте консоль браузера на наличие ошибок
2. Убедитесь, что Supabase настроен корректно
3. Проверьте, что все SQL скрипты выполнены
4. Убедитесь, что RLS политики не блокируют операции

---

**Версия**: 1.0.0  
**Дата обновления**: 30.03.2026  
**Автор**: Dance Manager Team
```