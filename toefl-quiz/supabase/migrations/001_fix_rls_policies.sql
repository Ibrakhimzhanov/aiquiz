-- =============================================
-- Миграция: Исправление RLS политик для гостевых тестов
-- Запустите этот скрипт в Supabase SQL Editor
-- =============================================

-- Добавляем новые поля в quizzes (если не существуют)
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS session_token UUID DEFAULT NULL;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Индекс для гостевых тестов
CREATE INDEX IF NOT EXISTS idx_quizzes_session_token ON quizzes(session_token) WHERE session_token IS NOT NULL;

-- Удаляем старые политики
DROP POLICY IF EXISTS "Users can read own quizzes" ON quizzes;
DROP POLICY IF EXISTS "Users can create own quizzes" ON quizzes;
DROP POLICY IF EXISTS "Users can update own quizzes" ON quizzes;
DROP POLICY IF EXISTS "Users can read own quiz questions" ON quiz_questions;
DROP POLICY IF EXISTS "Users can create quiz questions" ON quiz_questions;
DROP POLICY IF EXISTS "Users can update own quiz questions" ON quiz_questions;

-- Новые политики для quizzes (только для зарегистрированных пользователей)
CREATE POLICY "Users can read own quizzes" ON quizzes
  FOR SELECT USING (auth.uid() = user_id AND user_id IS NOT NULL);

CREATE POLICY "Users can create own quizzes" ON quizzes
  FOR INSERT WITH CHECK (auth.uid() = user_id AND user_id IS NOT NULL);

CREATE POLICY "Users can update own quizzes" ON quizzes
  FOR UPDATE USING (auth.uid() = user_id AND user_id IS NOT NULL);

CREATE POLICY "Users can delete own quizzes" ON quizzes
  FOR DELETE USING (auth.uid() = user_id AND user_id IS NOT NULL);

-- Новые политики для quiz_questions
CREATE POLICY "Users can read own quiz questions" ON quiz_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quizzes
      WHERE quizzes.id = quiz_questions.quiz_id
      AND quizzes.user_id = auth.uid()
      AND quizzes.user_id IS NOT NULL
    )
  );

CREATE POLICY "Users can create quiz questions" ON quiz_questions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM quizzes
      WHERE quizzes.id = quiz_questions.quiz_id
      AND quizzes.user_id = auth.uid()
      AND quizzes.user_id IS NOT NULL
    )
  );

CREATE POLICY "Users can update own quiz questions" ON quiz_questions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM quizzes
      WHERE quizzes.id = quiz_questions.quiz_id
      AND quizzes.user_id = auth.uid()
      AND quizzes.user_id IS NOT NULL
    )
  );

-- Функция для очистки истекших гостевых тестов (запускать через cron)
CREATE OR REPLACE FUNCTION cleanup_expired_guest_quizzes()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM quizzes
  WHERE user_id IS NULL
  AND expires_at IS NOT NULL
  AND expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Комментарий: Для автоматической очистки настройте pg_cron:
-- SELECT cron.schedule('cleanup-guest-quizzes', '0 * * * *', 'SELECT cleanup_expired_guest_quizzes()');
