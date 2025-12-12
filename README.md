# Telegram Crypto Mining Mini App

This is a complete Telegram Mini App for Crypto Mining, built with React, Tailwind CSS, and Supabase.

## Features
- **Ads Mining**: Watch ads to earn crypto.
- **Mining Wheel**: Daily lucky spin (requires deposit & 10k ads).
- **VIP System**: 3 Levels based on ads watched.
- **Referral System**: Earn 10% of friends' earnings.
- **Withdrawal**: Request USDT withdrawals.
- **Auto-Auth**: Seamless login using Telegram ID.
- **Multi-language**: Arabic, English, Russian.

## Setup & Deployment

### 1. Supabase Setup
The project uses Supabase for the backend. Ensure you have applied all migration scripts provided in the development process.
- **Auth**: 
    - Go to Authentication -> Providers -> Email.
    - **ENABLE** "Enable Email Provider".
    - **ENABLE** "Allow new users to sign up" (Critical for Telegram Auto-Login).
    - **DISABLE** "Confirm Email" (To allow instant login).
- **Database**: Contains `profiles`, `withdrawals`, and secure RPC functions.

### 2. Deployment (Netlify)
This project is ready for Netlify.
1. Connect your repository to Netlify.
2. Build command: `yarn build`
3. Publish directory: `dist`
4. The `public/_redirects` file ensures React Router works correctly.

### 3. Telegram Bot Setup
**Bot Token:** `8552107028:AAHEBcWWs94eSZi2U8Br5lgtZbTc0UoGEDE`

1. Go to @BotFather in Telegram.
2. Create a new bot or select existing one.
3. Use `/newapp` to create a Mini App.
4. Paste your Netlify URL when asked for the Web App URL.
5. Menu Button: You can also set the menu button URL using `/setmenubutton`.

## Troubleshooting
**Error: "Signups not allowed for this instance"**
- This means you have disabled "Email Signups" in Supabase. 
- The app uses a hidden email system (based on Telegram ID) to create accounts securely.
- **Fix:** Go to Supabase Dashboard -> Authentication -> Providers -> Email -> Enable "Allow new users to sign up".

## Development
- `yarn run dev`: Start local server.
- `yarn build`: Build for production.
