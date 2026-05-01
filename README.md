# Islamic Kids Learning Platform

A fun, safe, and educational Islamic learning platform for children aged 5-14.

## Features

- 🎮 Islamic Games (Matching, Memory, Quiz) - **Unlimited Plays!**
- 📝 Daily Quizzes with multiple difficulty levels - **Play as much as you want!**
- 📖 Quran Learning with meanings and facts
- 📜 Hadith Learning with practical examples
- ⭐ Points & Rewards System - **Earn up to 100 points daily**
- 🏆 Badge System - **1 badge per 250 points earned**
- 👨‍👩‍👧‍👦 Parent-Safe Features
- 📱 Mobile-First Responsive Design
- 🔐 Secure Supabase Backend with RLS

## Getting Started

### Prerequisites

- Node.js 18+
- Firebase Project
- npm or yarn

### Installation

```bash
npm install
```

### Environment Setup

Create a `.env.local` file in the root directory:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### Supabase Device Compatibility Checklist

To make auth and points updates work reliably across desktop and mobile browsers:

1. In Supabase Dashboard -> Authentication -> URL Configuration:
- Set Site URL to your production domain.
- Add Redirect URLs for both production and local dev (for example `http://localhost:3000/*`, `http://localhost:3001/*`, and your deployed domain).

2. In your deploy environment (Vercel/hosting), set all three variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

3. In browser testing, avoid private/incognito mode when validating persistent sessions.

4. Verify Realtime is enabled for `users` and `users_points` updates in Supabase.

### Running Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/               # Next.js app directory
├── components/        # Reusable UI components
├── lib/              # Utilities and helpers
├── types/            # TypeScript type definitions
└── data/             # Content data (Quran, Hadith, etc.)
public/               # Static assets
```

## Features Overview

### Games
- Ayah Matching
- Surah Memory Cards
- True/False Questions
- Multiple Choice

### Quizzes
- Easy (5-7 yrs)
- Medium (8-10 yrs)
- Hard (11-14 yrs)

### Quran Sections
- Surah Yaseen
- Surah Kahf
- Surah Mulk
- Surah Waqiah
- Last 10 Surahs

### Points System
- Beginner → Learner → Explorer → Young Scholar
- Digital badges
- Weekly/Monthly leaderboards

## Safety

- No chat functionality
- No external links
- Parental email updates available
- Age-appropriate content only
- No music or inappropriate content
- Secure Firebase rules

## License

Educational Use Only

## Contributing

For Islamic education content additions, please ensure:
- Content is from authentic sources
- Age-appropriate language
- Clear explanations with examples
