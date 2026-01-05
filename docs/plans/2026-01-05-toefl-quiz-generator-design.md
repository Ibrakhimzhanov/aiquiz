# TOEFL AI Quiz Generator - Design Document

## Overview

AI-powered quiz generator for TOEFL preparation. Integrates with toeflwrite.uz as a complementary product.

## Key Decisions

| Aspect | Decision |
|--------|----------|
| Listening | Text-based simulation (transcripts), no real audio |
| Auth | Guest mode (1 test) + Email/Password + Google OAuth |
| Limits | Guest: 1 test (cookies), Free: 3/day (DB), Pro: unlimited |
| Timer | User choice: none / soft / strict |
| Explanations | User choice: learning mode (immediate) / exam mode (end) |
| Categories | Reading, Grammar, Vocabulary, Listening (text), Mixed |
| Dashboard | History, progress chart, category breakdown, streak |
| AI Errors | 3 retries + error message |

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Next.js   │────▶│  Supabase   │     │   OpenAI    │
│  Frontend   │     │  (Auth+DB)  │     │  GPT-4o-mini│
└─────────────┘     └─────────────┘     └─────────────┘
       │                                       │
       └──────────────┬────────────────────────┘
                      ▼
               ┌─────────────┐
               │   Stripe    │
               └─────────────┘
```

## User Flow

1. Landing → "Try Free" button
2. Quiz Setup → Category, difficulty, questions count, timer, mode
3. Limit Check:
   - Guest: localStorage (1 test)
   - Free: DB check (3/day)
   - Pro: unlimited
4. Generation → OpenAI API call
5. Quiz → Answer questions
6. Results → Score + explanations + save prompt (guests)
7. Dashboard → History, progress, stats (registered only)

## Database Schema

### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subscription_status TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'pro')),
  subscription_end TIMESTAMP WITH TIME ZONE,
  daily_quizzes_count INTEGER DEFAULT 0,
  last_quiz_date DATE,
  streak_days INTEGER DEFAULT 0,
  last_activity_date DATE
);
```

### quizzes
```sql
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('reading', 'grammar', 'vocabulary', 'listening', 'mixed')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  questions_count INTEGER NOT NULL,
  score INTEGER DEFAULT 0,
  timer_mode TEXT DEFAULT 'none' CHECK (timer_mode IN ('none', 'soft', 'strict')),
  quiz_mode TEXT DEFAULT 'exam' CHECK (quiz_mode IN ('learning', 'exam')),
  time_spent_seconds INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### quiz_questions
```sql
CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
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
```

## Categories & Question Types

| Category | Description | Question Types |
|----------|-------------|----------------|
| Reading | Academic text 150-200 words | Main idea, Details, Inference, Vocabulary in context |
| Grammar | Grammar constructions | Error identification, Sentence completion |
| Vocabulary | Academic TOEFL vocabulary | Word meaning in context, Synonyms |
| Listening | Lecture/dialog transcript | Comprehension, Details, Speaker's purpose |
| Mixed | Combination of all types | Random from all categories |

## Difficulty Levels

- **Easy** — basic vocabulary, simple constructions, short texts
- **Medium** — academic vocabulary, complex sentences
- **Hard** — advanced vocabulary, nuanced meanings, long passages

## Question Counts

- 5 questions (~5 min)
- 10 questions (~10 min)
- 20 questions (~20 min)

## Monetization

- **Free**: 3 tests/day, all categories
- **Pro** ($7.99/week or $29.99/year): Unlimited tests, detailed analytics

## Tech Stack

- Frontend: Next.js 14 (App Router)
- Styling: Tailwind CSS
- Database: Supabase (PostgreSQL)
- Auth: Supabase Auth (Email + Google OAuth)
- AI: OpenAI GPT-4o-mini
- Payments: Stripe
- Hosting: Vercel

## Design

- Modern, minimalist
- Colors: Blue (#2563EB), White, Light Gray
- Similar to Duolingo/Quizlet
- Mobile-first responsive

## Project Structure

```
toefl-quiz/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Landing
│   ├── quiz/
│   │   ├── page.tsx               # Quiz setup
│   │   ├── [id]/page.tsx          # Quiz session
│   │   └── result/[id]/page.tsx   # Results
│   ├── dashboard/page.tsx          # User dashboard
│   ├── pricing/page.tsx            # Pricing page
│   ├── auth/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── callback/route.ts      # OAuth callback
│   └── api/
│       ├── generate-quiz/route.ts
│       ├── submit-quiz/route.ts
│       ├── webhook/route.ts        # Stripe webhook
│       └── create-checkout/route.ts
├── components/
│   ├── ui/                         # Reusable UI components
│   ├── quiz/                       # Quiz-specific components
│   └── dashboard/                  # Dashboard components
├── lib/
│   ├── supabase/
│   ├── openai.ts
│   └── stripe.ts
├── prompts/
│   └── quiz-prompts.ts
└── types/
    └── index.ts
```
