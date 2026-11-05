# Drop Table

A free course in **SQL, Python, data analytics, machine learning and AI**, told through the story of Big Face, a kid working shifts at the Grail Room, a fictional rare-sneaker shop in Atlanta.

**Play it:** https://bashfromohio.github.io/droppable/

- 30 shifts, one lesson each, from "what is data?" to training models in the browser and checking an AI's work
- A Python lesson before every Python puzzle, plus a Python playground (a small beginner-Python interpreter in plain JavaScript, `minipy.js`)
- Learning docs (a day-by-day handbook), an A–Z glossary, and the storybook workbook PDF
- No accounts, no cookies, no trackers. Progress is saved in the browser only after the learner says yes.

## Run it locally

No build step. Serve the folder and open it:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Files

| File | What it is |
|---|---|
| `index.html` | Layout and styles |
| `app.js` | The app: routing, shifts, playground, docs, legal pages |
| `data.js` | Lessons, tables, cheat sheet |
| `py.js`, `pylearn.js` | Python corner puzzles and their lessons (`tools/make_pylearn.py` regenerates `pylearn.js` and checks every example with real Python) |
| `glossary.js` | Glossary terms, linked to the day each is taught |
| `minipy.js` | Beginner Python interpreter used by the playground |
| `releases.js` | Snapshot of the real release calendar |
| `events.js` | The 100 money events in Big Face's story |
| `fonts/` | Self-hosted fonts (SIL Open Font License) |

The release list on this GitHub Pages version is a snapshot; the Claude-hosted version refreshes it daily.

## Legal

Created by **Ofgeneration LLC**. © 2026 Ofgeneration LLC. All rights reserved.
Questions, privacy requests and takedowns: support@grailroom.com.
The Grail Room, Big Face, Rae and Theo are fictional. Brand names belong to their owners. Not affiliated with any brand, store or marketplace.
