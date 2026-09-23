# Filming the real tool

The best beat in a video about software is the software working. A marketing page is a
poor substitute: cookie banners, empty hero frames, nothing moving. When the tool can
run on this machine, run it and film it.

## 1. Run it

Install it where it cannot touch the creator's setup (a venv, a container, the scratch
directory), start it, wait for its health endpoint:

```bash
python3 -m venv /tmp/tool && /tmp/tool/bin/pip install -q <package>      # can be GBs — background it
DATA_DIR=/tmp/tool-data <tool> serve --port 8080 &
until curl -sf localhost:8080/health; do sleep 5; done
```

If it needs a model, give it a real one — a mocked answer on screen is a fabricated
demo. A small local model through Ollama is enough for a 3 s beat:

```bash
curl -fsSL https://ollama.com/download/ollama-linux-amd64.tar.zst | zstd -d | tar -x -C /tmp/ollama
OLLAMA_MODELS=/tmp/ollama-models /tmp/ollama/bin/ollama serve &
/tmp/ollama/bin/ollama pull qwen2.5:1.5b          # supports tool calling; gemma3:1b does not
curl -s localhost:11434/api/generate -d '{"model":"qwen2.5:1.5b","prompt":"hi","stream":false,"keep_alive":"30m"}'
```

Warm the model before filming: the first answer on a cold CPU model takes tens of seconds.
Apps that enable tool calling by default (Open WebUI) show an error on models without it —
pick the model to match, and start from a clean data directory so the sidebar is empty.

## 2. Film it

Playwright records a context to webm. Dismiss first-run modals in a throwaway context and
carry its storage into the recorded one, so the take starts clean:

```js
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM });
  const warm = await b.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' });
  const wp = await warm.newPage(); await wp.goto(URL, { waitUntil: 'networkidle' });
  const ok = wp.getByText("Okay, Let's Go!"); if (await ok.count()) await ok.click();
  const state = await warm.storageState(); await warm.close();

  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark',
    storageState: state, recordVideo: { dir: 'vid', size: { width: 1280, height: 800 } } });
  const p = await ctx.newPage(); await p.goto(URL, { waitUntil: 'networkidle' });
  await p.locator('#chat-input').click();
  await p.keyboard.type('Explain what a vector database is, in 3 short bullet points.', { delay: 35 });
  await p.keyboard.press('Enter');
  await p.waitForTimeout(22000);            // long enough for the whole answer to stream
  await ctx.close(); await b.close();
})();
```

`colorScheme: 'dark'` matters on a black-and-white channel: the product's own dark mode
sits inside the browser shell without a seam. For a marketing page, scroll it with
`mouse.wheel` in small steps instead.

## 3. Cut it to a beat

Tile the take at 1 fps to find the moments, then speed-ramp them into one clip:

```bash
ffmpeg -i take.webm -vf "fps=1,scale=320:-1,tile=6x5" -frames:v 1 timeline.png   # look at it
ffmpeg -i take.webm -filter_complex \
  "[0:v]trim=3.9:6.9,setpts=(PTS-STARTPTS)/2.5[a];[0:v]trim=14.6:30.2,setpts=(PTS-STARTPTS)/8[b];\
   [a][b]concat=n=2:v=1,fps=30,format=yuv420p[v]" -map "[v]" -c:v libx264 -crf 18 public/shots/chat.mp4
```

Typing at ×2.5 still reads as typing; a streamed answer at ×8 reads as "it answers".
Then in the deck, fit the clip to its scene with `speed` rather than re-cutting:

```jsonc
"media": { "src": "shots/chat.mp4", "in": 0, "out": 3.15, "speed": 1.3 }
```

The footage is real; the clock is not. If a viewer asks, say the model ran on a CPU
sandbox and the clip is sped up.

## 4. Rights

A capture of the creator's own install of an open-source tool is theirs to use. A capture
of someone's marketing site is fine for commentary on that product; do not use it to
imply endorsement, and never capture a page behind a login that is not the creator's.
