<<<<<<< HEAD
# Personal Saving Tracker
### Premium Financial Management

A high-end, editorial-style financial management application designed for precision and elegance. "Personal Saving Tracker" combines robust ledger tracking with professional-grade analytics.

## ✨ Features
- **Editorial Dashboard:** A bento-grid layout providing immediate financial insights and savings velocity.
- **Performance Reports:** Detailed year-to-date comparative analysis with high-fidelity PDF export capabilities.
- **Hybrid Storage:** Seamless offline-first experience using **Dexie.js** with cloud synchronization via **Supabase**.
- **Voice Expense Tracking:** Hands-free expense logging using integrated voice notes.
- **Adaptive Interface:** Fully optimized for both Light and Dark modes with a focus on high-contrast accessibility.
- **Global Ready:** Built-in localization support for English and French, including dynamic currency formatting.

##  Tech Stack
- **Framework:** React 19 + Vite
- **Styling:** Tailwind CSS 4 (OKLCH Color Support)
- **Database:** IndexedDB (Dexie) + Supabase 
- **Icons:** Lucide React
- **Charts:** Recharts

## ⚙️ Environment Configuration
Create a `.env` file in the root directory with the following keys:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
ASSEMBLYAI_API_KEY=your_assemblyai_api_key
```

## 🗄️ Database Schema (Supabase & Dexie)
The system expects the following tables in Supabase (PostgreSQL) and matching stores in Dexie:
- **profiles**: `id (uuid, pk), full_name, language, currency, theme, email_inflow, goal_alerts, monthly_summaries`
- **incomes**: `id (uuid, pk), user_id (uuid), amount (numeric), category, date (timestamptz)`
- **expenses**: `id (uuid, pk), user_id (uuid), amount (numeric), category, date (timestamptz)`
- **goals**: `id (uuid, pk), user_id (uuid), name, target_amount, saved_amount, deadline (date), color`

## 🤖 Edge Functions
The PST System utilizes Supabase Edge Functions for AI and Notifications:
1. **openai_api**: Handles Whisper-1 audio transcription and GPT-4o expense parsing.
2. **send-notification**: Manages transactional emails via Resend or SMTP.

## 📱 PWA & Offline Support
PST is a strictly offline-first application. 
- **Storage**: Uses IndexedDB for instant UI updates.
- **Sync**: The `syncData` and `pullData` utilities manage background synchronization with the Supabase cloud.
- **Service Worker**: Caching logic is handled in `/public/sw.js`. To force a client update, increment the `CACHE_NAME` constant.

## 🚀 Getting Started
1. Clone the repository.
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`
4. Build for production: `npm run build`

---
*© 2026 Personal Saving Tracker System. All Rights Reserved.*
=======
# personal-saving-tracker-with-ai
a personal saving tracker with ai voice to text
>>>>>>> 3a1d02fd0bd1365670d653b426f0ff00ffb8b0a1
