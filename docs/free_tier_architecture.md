# SABJIWALA 5 - 100% Free-Tier MVP Deployment Guide

This document details the configuration, deployment, and testing workflows for launching **SABJIWALA 5** on free hosting layers (Vercel + Supabase + OpenStreetMap + Leaflet.js).

---

## 1. Local Installation & Development

### Prerequisites
* Install **Node.js** (v20 or higher).
* Install **Flutter SDK** (for compiling the mobile app).
* Create a free account on [Supabase](https://supabase.com/) and [Vercel](https://vercel.com/).

### Backend & Database Client Setup
1. Clone the repository and navigate to the project directory:
   ```bash
   cd akshay_bhaiya/web
   npm install
   ```
2. Setup environment variables by creating `.env.local` in `web/` with:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL="https://your-supabase-project.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
   ```
3. Run the development server locally:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3001](http://localhost:3001) in your browser.

---

## 2. Supabase Free-Tier Database Setup

To provision your PostgreSQL database and enable real-time replication without a credit card:

1. Log in to the [Supabase Dashboard](https://supabase.com/dashboard) and create a new project.
2. Open the **SQL Editor** tab from the left navigation bar.
3. Paste the contents of [supabase_setup.sql](file:///Users/shubhampandey/sabjiwala/akshay_bhaiya/docs/supabase_setup.sql) into a new query window.
4. Click **Run** to execute the script. This will generate all tables, RLS policies, real-time publication bindings, and spatial search functions.
5. In the database dashboard, navigate to **Project Settings ➔ API** and copy the **Project URL** and **anon public API Key**. Paste these into your `.env.local` file.

---

## 3. Vercel Free-Tier Frontend Deployment

Vercel provides a free serverless tier perfect for running the Next.js web application.

1. Connect your GitHub repository to [Vercel](https://vercel.com/import/git).
2. Choose the `akshay_bhaiya/web` directory as the project root.
3. In the **Environment Variables** panel, insert:
   * `NEXT_PUBLIC_SUPABASE_URL` = your Supabase Project URL
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase Anon Key
4. Click **Deploy**. Vercel will build and assign a free SSL-enabled `.vercel.app` domain.

---

## 4. Mobile App Setup (Flutter)

To run the Flutter app locally or compile a release binary:

1. Navigate to the mobile folder:
   ```bash
   cd akshay_bhaiya/mobile
   ```
2. Install dependencies:
   ```bash
   flutter pub get
   ```
3. Open `lib/main.dart` and replace `url` and `anonKey` inside `Supabase.initialize` with your live database keys.
4. Connect an Android/iOS emulator and launch the app:
   ```bash
   flutter run
   ```
