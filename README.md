# plant-bud

## Setup

Install Node dependencies:

```bash
npm install
```

Install Python 3.10, 3.11, or 3.12 from https://www.python.org/downloads/ if it is not already installed. Python 3.12 is recommended.

If a previous `.venv` was created with another Python version, delete `.venv` and run setup again.

Install the Python AI dependencies used by the garden designer:

```bash
npm run setup
```

Start the app and the garden designer AI service together:

```bash
npm run dev
```

## Demo bots

Create realistic demo users, posts, follows, likes, comments, polls, reviews, services, and nursery products:

```bash
npm run demo:bots
```

Rebuild the demo dataset:

```bash
npm run demo:bots -- --refresh
```

Use Pexels images when `PEXELS_API_KEY` is available:

```bash
npm run demo:bots -- --refresh --with-pexels
```

Remove only the demo bot dataset:

```bash
npm run demo:bots -- --cleanup
```

Demo accounts use the `@bot.plantbud.test` email domain and default password `PlantBudDemo123!`.
