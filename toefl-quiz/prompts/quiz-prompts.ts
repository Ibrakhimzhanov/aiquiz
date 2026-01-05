// Промпты для генерации вопросов через OpenAI
import type { Category, Difficulty } from '@/types'

// Базовый системный промпт
const SYSTEM_PROMPT = `You are a TOEFL test preparation expert. Generate high-quality practice questions that match the style and difficulty of the actual TOEFL exam.

IMPORTANT:
- Return ONLY valid JSON, no markdown or explanations
- All text must be in English
- Questions must be appropriate for the specified difficulty level
- Explanations should be educational and help students understand why the answer is correct`

// Промпт для Reading Comprehension
export function getReadingPrompt(difficulty: Difficulty, count: number): string {
  const wordCount = difficulty === 'easy' ? '100-150' : difficulty === 'medium' ? '150-200' : '200-250'

  return `Generate a TOEFL-style reading comprehension exercise.

Difficulty: ${difficulty}
Create an academic passage of ${wordCount} words on a topic like science, history, or social studies.
Generate ${count} multiple choice questions about the passage.

Each question must test one of these skills:
- Main idea comprehension
- Detail identification
- Inference making
- Vocabulary in context

Return JSON format:
{
  "questions": [
    {
      "question_type": "reading_comprehension",
      "passage": "The full passage text here...",
      "question_text": "Question about the passage...",
      "options": ["A) First option", "B) Second option", "C) Third option", "D) Fourth option"],
      "correct_answer": "A",
      "explanation": "Why this answer is correct..."
    }
  ]
}

Note: Use the SAME passage for all questions, but include it in each question object.`
}

// Промпт для Grammar
export function getGrammarPrompt(difficulty: Difficulty, count: number): string {
  const focus = difficulty === 'easy'
    ? 'basic verb tenses, articles, simple prepositions'
    : difficulty === 'medium'
    ? 'complex tenses, conditionals, relative clauses'
    : 'advanced grammar, subtle errors, complex structures'

  return `Generate ${count} TOEFL-style grammar questions.

Difficulty: ${difficulty}
Focus on: ${focus}

Question types to include:
1. Error Identification: Find the grammatical error in the sentence
2. Sentence Completion: Fill in the blank with the correct form

Return JSON format:
{
  "questions": [
    {
      "question_type": "error_identification",
      "passage": null,
      "question_text": "Identify the error: The students [A) has been] working [B) on their] project [C) since] three [D) hours].",
      "options": ["A) has been", "B) on their", "C) since", "D) hours"],
      "correct_answer": "C",
      "explanation": "'Since' should be 'for'. We use 'for' with duration (three hours) and 'since' with a point in time."
    },
    {
      "question_type": "sentence_completion",
      "passage": null,
      "question_text": "If I _____ about the meeting, I would have attended.",
      "options": ["A) knew", "B) had known", "C) have known", "D) would know"],
      "correct_answer": "B",
      "explanation": "This is a third conditional sentence. We use 'had + past participle' in the if-clause for unreal past situations."
    }
  ]
}`
}

// Промпт для Vocabulary
export function getVocabularyPrompt(difficulty: Difficulty, count: number): string {
  const level = difficulty === 'easy'
    ? 'common academic words (B1-B2 level)'
    : difficulty === 'medium'
    ? 'intermediate academic vocabulary (B2-C1 level)'
    : 'advanced academic vocabulary (C1-C2 level)'

  return `Generate ${count} TOEFL-style vocabulary questions.

Difficulty: ${difficulty}
Vocabulary level: ${level}

Each question should:
- Present a word in context (within a sentence)
- Ask for the meaning or a synonym
- Include plausible distractors

Return JSON format:
{
  "questions": [
    {
      "question_type": "multiple_choice",
      "passage": null,
      "question_text": "The scientist's hypothesis was subsequently validated by multiple experiments. The word 'validated' is closest in meaning to:",
      "options": ["A) questioned", "B) confirmed", "C) rejected", "D) modified"],
      "correct_answer": "B",
      "explanation": "'Validated' means confirmed or proven to be correct. In this context, the experiments confirmed the hypothesis."
    }
  ]
}`
}

// Промпт для Listening (текстовая симуляция)
export function getListeningPrompt(difficulty: Difficulty, count: number): string {
  const type = difficulty === 'easy'
    ? 'a simple conversation between two students'
    : difficulty === 'medium'
    ? 'an academic discussion or short lecture excerpt'
    : 'a complex lecture with multiple speakers or detailed academic content'

  return `Generate a TOEFL-style listening comprehension exercise (text-based simulation).

Difficulty: ${difficulty}
Create ${type} as a transcript.
Generate ${count} comprehension questions.

The transcript should be 100-200 words and include speaker labels.

Question types:
- Main idea/purpose
- Detail questions
- Speaker's attitude/opinion
- Inference questions

Return JSON format:
{
  "questions": [
    {
      "question_type": "multiple_choice",
      "passage": "[Transcript]\\nProfessor: Today we'll discuss...\\nStudent: So you mean that...\\nProfessor: Exactly, and furthermore...",
      "question_text": "What is the main purpose of the professor's lecture?",
      "options": ["A) To explain...", "B) To describe...", "C) To compare...", "D) To argue..."],
      "correct_answer": "A",
      "explanation": "The professor's main purpose is to..."
    }
  ]
}

Note: Use the SAME transcript for all questions, include it in each question object.`
}

// Промпт для Mixed
export function getMixedPrompt(difficulty: Difficulty, count: number): string {
  return `Generate ${count} mixed TOEFL-style questions covering different skills.

Difficulty: ${difficulty}

Include a variety of:
- Reading comprehension (with short passages)
- Grammar (error identification, sentence completion)
- Vocabulary (words in context)

Distribute questions across these types. Each question should be self-contained.

Return JSON format:
{
  "questions": [
    {
      "question_type": "multiple_choice" | "error_identification" | "sentence_completion" | "reading_comprehension",
      "passage": "Short passage if needed, or null",
      "question_text": "The question...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct_answer": "A",
      "explanation": "Why this is correct..."
    }
  ]
}`
}

// Получить промпт по категории
export function getPromptForCategory(
  category: Category,
  difficulty: Difficulty,
  count: number
): { system: string; user: string } {
  let userPrompt: string

  switch (category) {
    case 'reading':
      userPrompt = getReadingPrompt(difficulty, count)
      break
    case 'grammar':
      userPrompt = getGrammarPrompt(difficulty, count)
      break
    case 'vocabulary':
      userPrompt = getVocabularyPrompt(difficulty, count)
      break
    case 'listening':
      userPrompt = getListeningPrompt(difficulty, count)
      break
    case 'mixed':
      userPrompt = getMixedPrompt(difficulty, count)
      break
    default:
      userPrompt = getMixedPrompt(difficulty, count)
  }

  return {
    system: SYSTEM_PROMPT,
    user: userPrompt,
  }
}
