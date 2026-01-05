-- =============================================
-- TOEFL Quiz Generator - Database Schema
-- Выполните этот скрипт в Supabase SQL Editor
-- =============================================

-- Включаем расширение для генерации UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- Таблица пользователей
-- =============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'pro')),
  subscription_end TIMESTAMP WITH TIME ZONE,
  daily_quizzes_count INTEGER DEFAULT 0,
  last_quiz_date DATE,
  streak_days INTEGER DEFAULT 0,
  last_activity_date DATE
);

-- Индекс для быстрого поиска по email
CREATE INDEX idx_users_email ON users(email);

-- =============================================
-- Таблица тестов
-- =============================================
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  -- Session token для идентификации гостевых тестов (хранится в cookie клиента)
  session_token UUID DEFAULT NULL,
  category TEXT NOT NULL CHECK (category IN ('reading', 'grammar', 'vocabulary', 'listening', 'mixed')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  questions_count INTEGER NOT NULL,
  score INTEGER DEFAULT 0,
  timer_mode TEXT DEFAULT 'none' CHECK (timer_mode IN ('none', 'soft', 'strict')),
  quiz_mode TEXT DEFAULT 'exam' CHECK (quiz_mode IN ('learning', 'exam')),
  time_spent_seconds INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Гостевые тесты автоматически удаляются через 24 часа
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Индекс для поиска гостевых тестов по session_token
CREATE INDEX idx_quizzes_session_token ON quizzes(session_token) WHERE session_token IS NOT NULL;

-- Индексы для быстрого поиска
CREATE INDEX idx_quizzes_user_id ON quizzes(user_id);
CREATE INDEX idx_quizzes_created_at ON quizzes(created_at);

-- =============================================
-- Таблица вопросов теста
-- =============================================
CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  question_type TEXT NOT NULL,
  passage TEXT,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer TEXT NOT NULL,
  user_answer TEXT,
  explanation TEXT NOT NULL,
  is_correct BOOLEAN,
  order_index INTEGER NOT NULL
);

-- Индекс для быстрого поиска вопросов по тесту
CREATE INDEX idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);

-- =============================================
-- Row Level Security (RLS) политики
-- =============================================

-- Включаем RLS для всех таблиц
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;

-- Политики для users
-- Пользователь может читать только свои данные
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Пользователь может обновлять только свои данные
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Политики для quizzes
-- Пользователь может читать только свои тесты (НЕ гостевые - user_id NOT NULL)
CREATE POLICY "Users can read own quizzes" ON quizzes
  FOR SELECT USING (auth.uid() = user_id AND user_id IS NOT NULL);

-- Пользователь может создавать тесты только привязанные к себе
-- Гостевые тесты создаются через service client в API
CREATE POLICY "Users can create own quizzes" ON quizzes
  FOR INSERT WITH CHECK (auth.uid() = user_id AND user_id IS NOT NULL);

-- Пользователь может обновлять только свои тесты
CREATE POLICY "Users can update own quizzes" ON quizzes
  FOR UPDATE USING (auth.uid() = user_id AND user_id IS NOT NULL);

-- Пользователь может удалять только свои тесты
CREATE POLICY "Users can delete own quizzes" ON quizzes
  FOR DELETE USING (auth.uid() = user_id AND user_id IS NOT NULL);

-- Политики для quiz_questions
-- Пользователь может читать вопросы только своих тестов (НЕ гостевых)
CREATE POLICY "Users can read own quiz questions" ON quiz_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quizzes
      WHERE quizzes.id = quiz_questions.quiz_id
      AND quizzes.user_id = auth.uid()
      AND quizzes.user_id IS NOT NULL
    )
  );

-- Пользователь может создавать вопросы только для своих тестов
-- Вопросы для гостевых тестов создаются через service client
CREATE POLICY "Users can create quiz questions" ON quiz_questions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM quizzes
      WHERE quizzes.id = quiz_questions.quiz_id
      AND quizzes.user_id = auth.uid()
      AND quizzes.user_id IS NOT NULL
    )
  );

-- Пользователь может обновлять вопросы только своих тестов
CREATE POLICY "Users can update own quiz questions" ON quiz_questions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM quizzes
      WHERE quizzes.id = quiz_questions.quiz_id
      AND quizzes.user_id = auth.uid()
      AND quizzes.user_id IS NOT NULL
    )
  );

-- =============================================
-- Функция для создания пользователя при регистрации
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для автоматического создания записи в users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- Функция для обновления streak
-- =============================================
CREATE OR REPLACE FUNCTION update_user_streak(user_uuid UUID)
RETURNS void AS $$
DECLARE
  last_activity DATE;
  current_streak INTEGER;
BEGIN
  SELECT last_activity_date, streak_days INTO last_activity, current_streak
  FROM users WHERE id = user_uuid;

  IF last_activity IS NULL OR last_activity < CURRENT_DATE - INTERVAL '1 day' THEN
    -- Streak сброшен
    UPDATE users SET streak_days = 1, last_activity_date = CURRENT_DATE WHERE id = user_uuid;
  ELSIF last_activity = CURRENT_DATE - INTERVAL '1 day' THEN
    -- Продолжаем streak
    UPDATE users SET streak_days = current_streak + 1, last_activity_date = CURRENT_DATE WHERE id = user_uuid;
  ELSIF last_activity = CURRENT_DATE THEN
    -- Уже активен сегодня, ничего не делаем
    NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Функция для проверки лимита бесплатных тестов
-- =============================================
CREATE OR REPLACE FUNCTION check_quiz_limit(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_status TEXT;
  quiz_count INTEGER;
  last_date DATE;
BEGIN
  SELECT subscription_status, daily_quizzes_count, last_quiz_date
  INTO user_status, quiz_count, last_date
  FROM users WHERE id = user_uuid;

  -- Pro пользователи без лимита
  IF user_status = 'pro' THEN
    RETURN TRUE;
  END IF;

  -- Если сегодня новый день, сбрасываем счетчик
  IF last_date IS NULL OR last_date < CURRENT_DATE THEN
    UPDATE users SET daily_quizzes_count = 0, last_quiz_date = CURRENT_DATE WHERE id = user_uuid;
    RETURN TRUE;
  END IF;

  -- Проверяем лимит (3 теста в день для free)
  RETURN quiz_count < 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Функция для увеличения счетчика тестов
-- =============================================
CREATE OR REPLACE FUNCTION increment_quiz_count(user_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET daily_quizzes_count = daily_quizzes_count + 1,
      last_quiz_date = CURRENT_DATE
  WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Атомарная функция для проверки и резервирования лимита
-- Решает race condition через FOR UPDATE блокировку
-- =============================================
CREATE OR REPLACE FUNCTION check_and_reserve_quiz_limit(user_uuid UUID, daily_limit INTEGER DEFAULT 3)
RETURNS BOOLEAN AS $$
DECLARE
  user_status TEXT;
  quiz_count INTEGER;
  last_date DATE;
BEGIN
  -- Блокируем строку пользователя для предотвращения race condition
  SELECT subscription_status, daily_quizzes_count, last_quiz_date
  INTO user_status, quiz_count, last_date
  FROM users
  WHERE id = user_uuid
  FOR UPDATE;

  -- Пользователь не найден
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Pro пользователи без лимита
  IF user_status = 'pro' THEN
    RETURN TRUE;
  END IF;

  -- Если сегодня новый день, сбрасываем счетчик и резервируем
  IF last_date IS NULL OR last_date < CURRENT_DATE THEN
    UPDATE users
    SET daily_quizzes_count = 1,
        last_quiz_date = CURRENT_DATE
    WHERE id = user_uuid;
    RETURN TRUE;
  END IF;

  -- Проверяем лимит
  IF quiz_count >= daily_limit THEN
    RETURN FALSE;
  END IF;

  -- Резервируем место (увеличиваем счетчик)
  UPDATE users
  SET daily_quizzes_count = daily_quizzes_count + 1
  WHERE id = user_uuid;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Функция для отката резервирования лимита (при ошибке)
-- =============================================
CREATE OR REPLACE FUNCTION rollback_quiz_reservation(user_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET daily_quizzes_count = GREATEST(daily_quizzes_count - 1, 0)
  WHERE id = user_uuid
  AND last_quiz_date = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
