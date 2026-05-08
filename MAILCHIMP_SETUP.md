# Mailchimp Newsletter Integration Setup

This guide explains how to set up Mailchimp integration for the newsletter subscription feature.

## Prerequisites

You need:
- A Mailchimp account (free tier is fine)
- A Mailchimp audience/list created
- Your Vercel project admin access

## Step 1: Get Your Mailchimp API Key

1. Log in to [Mailchimp](https://mailchimp.com)
2. Click your **profile icon** (top right) → **Account**
3. Go to **Extras** → **API keys**
4. Click **Create A Key** button
5. Copy the generated API key (format: `abc123def456-us12`)

## Step 2: Get Your Mailchimp List ID

1. In Mailchimp, go to **Audience** (left sidebar)
2. Select your audience/list
3. Click **Settings** → **Audience name and defaults**
4. Scroll down to find **List ID** (typically a long alphanumeric string like `8ba87552de`)
5. Copy this ID

## Step 3: Add Environment Variables to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your **Islamic Kids Learning Platform** project
3. Click **Settings** → **Environment Variables**
4. Add these two variables:

   **Variable 1:**
   - Name: `MAILCHIMP_API_KEY`
   - Value: Paste your API key from Step 1
   - Environments: Select all (Production, Preview, Development)
   - Click **Save**

   **Variable 2:**
   - Name: `MAILCHIMP_LIST_ID`
   - Value: Paste your List ID from Step 2
   - Environments: Select all (Production, Preview, Development)
   - Click **Save**

## Step 4: Redeploy Your Project

1. Go to **Deployments** tab in your Vercel project
2. Find the latest deployment
3. Click the three dots → **Redeploy**
4. Wait for the deployment to complete

## Step 5: Test the Newsletter Popup

1. Visit your app at https://islamic-kids-learning-platform.vercel.app
2. Wait ~8 seconds for the newsletter popup to appear
3. Enter a test email and click **Subscribe**
4. You should see a success message
5. Check your Mailchimp audience to confirm the subscriber was added

## Troubleshooting

**"Email service not configured" error:**
- Verify both `MAILCHIMP_API_KEY` and `MAILCHIMP_LIST_ID` are set in Vercel
- Wait a few minutes after adding variables for changes to take effect
- Redeploy your project to ensure new variables are loaded

**Subscriber not appearing in Mailchimp:**
- Check browser console for errors (F12 → Console)
- Verify the API key and List ID are correct
- Check if the email already exists in your Mailchimp list

**Invalid Mailchimp API response:**
- Make sure your API key is correct (should contain a dash like `key-server`)
- Verify your List ID matches the audience you're targeting
- Try creating a new API key in Mailchimp

## Local Development

For local testing, create a `.env.local` file in your project root:

```
MAILCHIMP_API_KEY=your_actual_api_key
MAILCHIMP_LIST_ID=your_actual_list_id
```

Then run `npm run dev` to test locally.
