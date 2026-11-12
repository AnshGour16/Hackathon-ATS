# 🚀 Automated Hackathon Applicant Tracking System (ATS)

An intelligent, AI-powered judging platform built to completely automate the manual effort of scoring hackathon submissions. This project leverages Google Gemini AI to analyze pitch decks and GitHub repositories in seconds, providing a standardized, algorithmic score for every team.

## ✨ Features

- **Automated Pitch Deck Scoring:** Upload a PDF and our AI instantly ranks it on customizable criteria defined by the Hackathon Admin.
- **Participant Dashboard:** A dedicated authenticated portal for participants to view their Submission Status, AI Score, Strengths, Weaknesses, and Missing Sections.
- **Phase-Based Code Unlocking:** Organizers can click "Unlock Code Phase" to dynamically open a GitHub URL input on participant dashboards.
- **Advanced GitHub Code Analyzer:** Provide a public repository URL to have the backend ping the GitHub API, scrape the `README.md` and `package.json`, and feed the codebase context directly to Gemini for a true **Technical Complexity Score**.
- **Admin Leaderboard & CSV Export:** A fully protected `/admin` dashboard that sorts submissions by score. Includes a one-click CSV Export tool to download the entire leaderboard.
- **Idea Plagiarism Checker:** AI scans submissions against open-source cliches and flags highly derivative ideas directly to judges.
- **"Blind" Judging Mode:** Admins can optionally redact all team names, member PII, and college names from the grading dashboard to completely eliminate bias.
- **Custom Hackathon Tracks:** Organizers can define tracks (e.g. Web3, Healthcare) with distinct scoring algorithms and mandatory slide templates (e.g. "Missing Revenue Model").
- **Scorecard Radial Charts:** Visualized skill distribution graphs utilizing Recharts.
- **Downloadable PDF Reports:** Instantly generate a branded PDF scorecard with actionable feedback for participants.

## 🛠️ Technology Stack
- **Framework:** Next.js 16 (App Router)
- **Database:** MongoDB & Mongoose
- **AI Brain:** `gemini-2.5-flash` (Google Generative AI)
- **Styling:** Tailwind CSS + shadcn/ui
- **Authentication:** NextAuth.js + bcryptjs
- **PDF Processing:** `pdf2json` and `jspdf`

## 🚀 Getting Started

First, ensure you have set up your `.env.local` variables:
```bash
GEMINI_API_KEY=your_key_here
MONGODB_URI=your_mongodb_connection_string
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_super_secret_string
```

Then, boot the local development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the Upload Portal.

To generate the default Lead Judge account, navigate to `http://localhost:3000/api/setup-admin`.
Then log into the `/admin` dashboard using:
- **Email:** `admin@hackathon.com`
- **Password:** `admin123`

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
