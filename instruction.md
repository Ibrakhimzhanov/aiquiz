Ты — опытный full-stack разработчик. Помоги мне создать AI Quiz Generator для подготовки к TOEFL.

## О проекте
Я дизайнер без технического бэкграунда. Мне нужно пошаговое руководство с полным кодом. Это будет дополнение к моему сайту toeflwrite.uz (TOEFL Writing Checker).

## Что должен делать продукт:

### Основной функционал:
1. Пользователь выбирает тему/раздел TOEFL (Reading, Listening, Grammar, Vocabulary)
2. Выбирает сложность (Easy, Medium, Hard)
3. Выбирает количество вопросов (5, 10, 20)
4. Нажимает "Generate Quiz"
5. AI генерирует тест с вопросами в формате TOEFL
6. Пользователь проходит тест
7. В конце — результат с объяснениями правильных ответов
8. Сохранение истории и прогресса

### Типы вопросов (как в реальном TOEFL):
- Multiple Choice (4 варианта)
- Reading Comprehension (текст + вопросы)
- Sentence Completion (заполни пропуск)
- Vocabulary in Context (значение слова в контексте)
- Error Identification (найди ошибку)

### Монетизация:
- Free: 3 теста в день, базовые темы
- Pro ($7.99/неделя или $29.99/год): Unlimited тесты, все темы, детальная аналитика прогресса
- Оплата через Stripe

## Tech Stack:
- Frontend: Next.js 14 (App Router)
- Styling: Tailwind CSS
- Database: Supabase (PostgreSQL)
- Auth: Supabase Auth
- AI: OpenAI GPT-4o-mini API
- Payments: Stripe
- Hosting: Vercel

## Структура базы данных (Supabase):

### Таблица: users
- id (uuid, primary key)
- email (text)
- created_at (timestamp)
- subscription_status (text: 'free', 'pro')
- subscription_end (timestamp, nullable)
- daily_quizzes_count (integer, default 0)
- last_quiz_date (date)

### Таблица: quizzes
- id (uuid, primary key)
- user_id (uuid, foreign key → users)
- category (text: 'reading', 'listening', 'grammar', 'vocabulary')
- difficulty (text: 'easy', 'medium', 'hard')
- questions_count (integer)
- score (integer)
- total_questions (integer)
- created_at (timestamp)
- time_spent_seconds (integer)

### Таблица: quiz_questions
- id (uuid, primary key)
- quiz_id (uuid, foreign key → quizzes)
- question_type (text)
- question_text (text)
- options (jsonb) — массив вариантов
- correct_answer (text)
- user_answer (text, nullable)
- explanation (text)
- is_correct (boolean)

## Структура проекта:
toefl-quiz/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Landing page
│   ├── quiz/
│   │   ├── page.tsx               # Выбор параметров теста
│   │   ├── [id]/
│   │   │   └── page.tsx           # Прохождение теста
│   │   └── result/
│   │       └── [id]/page.tsx      # Результаты
│   ├── dashboard/
│   │   └── page.tsx               # История и прогресс
│   ├── pricing/
│   │   └── page.tsx               # Страница цен
│   └── api/
│       ├── generate-quiz/
│       │   └── route.ts           # API генерации теста
│       ├── submit-quiz/
│       │   └── route.ts           # API сохранения результата
│       ├── webhook/
│       │   └── route.ts           # Stripe webhook
│       └── create-checkout/
│           └── route.ts           # Создание Stripe сессии
├── components/
│   ├── QuizCard.tsx               # Карточка вопроса
│   ├── QuizTimer.tsx              # Таймер теста
│   ├── ProgressBar.tsx            # Прогресс прохождения
│   ├── ResultChart.tsx            # График результатов
│   └── Navbar.tsx
├── lib/
│   ├── supabase.ts
│   ├── openai.ts
│   └── stripe.ts
└── prompts/
└── quiz-prompts.ts            # Промпты для генерации

## Что мне нужно:

### Шаг 1: Настройка проекта
- package.json с зависимостями
- Инструкция по созданию проекта Supabase
- Файл .env.example

### Шаг 2: База данных
- SQL скрипт для создания таблиц в Supabase
- Row Level Security политики

### Шаг 3: API генерации теста (/api/generate-quiz)
- Принимает: category, difficulty, questions_count
- Проверяет лимит бесплатных тестов
- Вызывает OpenAI с правильным промптом
- Возвращает структурированный JSON с вопросами

### Шаг 4: Промпты для OpenAI
Создай отдельные промпты для каждого типа вопросов:

**Reading Comprehension:**
Generate a TOEFL-style reading comprehension exercise.

Difficulty: {difficulty}
Create a passage of 150-200 words on an academic topic
Generate {count} multiple choice questions about the passage
Each question has 4 options (A, B, C, D)
Include questions about: main idea, details, inference, vocabulary in context
Return JSON format:
{
"passage": "...",
"questions": [
{
"question": "...",
"options": ["A) ...", "B) ...", "C) ...", "D) ..."],
"correct_answer": "A",
"explanation": "..."
}
]
}


**Vocabulary:**
Generate {count} TOEFL vocabulary questions.

Difficulty: {difficulty}
Format: Word in sentence context, choose the meaning
Academic vocabulary appropriate for TOEFL
Return JSON with question, options, correct_answer, explanation


**Grammar:**
Generate {count} TOEFL grammar questions.

Difficulty: {difficulty}
Types: Error identification, sentence completion
Focus on: verb tenses, articles, prepositions, conditionals
Return JSON format


### Шаг 5: UI страницы теста
- Отображение вопроса
- Варианты ответов (radio buttons)
- Таймер (опционально)
- Кнопки "Previous" / "Next"
- Прогресс бар
- Кнопка "Submit Quiz"

### Шаг 6: Страница результатов
- Общий балл (например: 8/10 — 80%)
- Breakdown по типам вопросов
- Список всех вопросов с правильными ответами и объяснениями
- Кнопка "Try Again" / "New Quiz"

### Шаг 7: Dashboard пользователя
- История всех тестов
- График прогресса по времени
- Статистика по категориям (сильные/слабые стороны)
- Streak (дни подряд)

### Шаг 8: Stripe интеграция
- Checkout для подписки
- Webhook для обновления статуса
- Проверка подписки в API

## Дизайн:
- Современный, минималистичный
- Цвета: синий (#2563EB) + белый + светло-серый
- Похожий на Duolingo / Quizlet
- Mobile-first responsive

## Дополнительно:
- Комментарии в коде на русском
- SEO оптимизация (meta tags, sitemap)
- Инструкция по деплою на Vercel

Начни с настройки проекта и базы данных, потом API и UI.
