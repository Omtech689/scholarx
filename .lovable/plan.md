## 1. Remove email verification

Configure Lovable Cloud auth to auto-confirm new signups so users can sign in immediately after creating an account. No code changes needed in `login.tsx` — the existing flow already redirects to `/chat` on success; today it only "works" because the session is sometimes returned, but with auto-confirm it will reliably work every time.

## 2. Voice option in chat

Add two voice features to `src/routes/chat.tsx`:

**a) Voice input (mic → text)** — a microphone button next to the Send button. Click to start/stop dictation; transcribed text streams into the input box. Uses the browser's built-in Web Speech API (`webkitSpeechRecognition`), so **no API key and no cost**. Works in Chrome, Edge, Safari.

**b) Voice output (read AI response aloud)** — a small speaker button on each assistant message. Click to hear it; click again to stop. Uses the browser's built-in `speechSynthesis` API — also free, no key.

Both gracefully hide if the browser doesn't support them.

> If you'd prefer higher-quality AI voices (ElevenLabs) instead of the free browser voices, say the word and I'll wire that up using an `ELEVENLABS_API_KEY` secret — but the browser approach needs zero setup.

## 3. Where to add the API key

You don't need to add one. The AI tutor already works because Lovable Cloud automatically provisions a `LOVABLE_API_KEY` secret for your project (it's how `src/server/chat.functions.ts` calls Gemini 2.5 Flash). It's free until Oct 13, 2025, then usage-based.

If you ever want to manage it: open **Cloud → Settings → Secrets** in the Lovable sidebar. You'll see `LOVABLE_API_KEY` listed there. The same place is where you'd add other keys (e.g. ElevenLabs) if you opt into premium voices later.

## Technical notes

- Auth: call `cloud--configure_auth` with `auto_confirm_signups: true`.
- Voice input: feature-detect `window.SpeechRecognition || window.webkitSpeechRecognition`, instantiate, set `continuous=false`, `interimResults=true`, append `event.results[i][0].transcript` to the input state. Toggle a `listening` boolean for the mic button UI (pulse animation when active).
- Voice output: `const u = new SpeechSynthesisUtterance(text); window.speechSynthesis.speak(u);` — strip Markdown before speaking for cleaner audio. Track which message is "speaking" to toggle the icon.
- No new dependencies, no migration, no edge function changes.
