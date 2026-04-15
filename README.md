# StudyLift

A free browser-based study app for O Levels (and similar exam systems), with:

- Topic planner saved in local storage
- Quick quiz prompt generator
- Built-in no-cost AI-style study assistant (offline tutoring logic)
- Optional Gemini API mode using your own API key (free tier available)
- Optional Ark Labs API mode (OpenAI-compatible chat completions)

## Run locally

Open `index.html` directly in your browser.

## Why this is free

This version does not call any paid AI APIs. All logic runs in your browser, so there is no server cost.

If you want better AI responses, you can switch to Gemini mode and use a free-tier key from Google AI Studio, or switch to Ark Labs mode with your account key. The key is stored only in your browser's local storage for this demo.

## Optional upgrades

- Connect to a free-tier LLM endpoint (if available)
- Add past-paper import and mark scheme tracking
- Add subject-specific prompt packs
