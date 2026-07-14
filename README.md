# AI Video Vanguard

A living, curated feed of AI-made video references, ordered by date — latest on top. Static site: YouTube embeds only, no backend.

Maintained by **Aleix Perdigó** · spotted a recent reference that belongs here? → aleix.perdigo@goroka.tv

## Adding a video

Edit `videos.json` and append an entry to the `videos` array:

```json
{
  "id": "unique-slug",
  "youtubeId": "YOUTUBE_ID",
  "title": "Title",
  "director": "Creator",
  "tool": "Veo",
  "date": "2026-06-01",
  "categories": ["Narrative", "Photorealism"],
  "highlight": "Standout fact (optional)",
  "description": "Credits / notes (optional)",
  "source": "https://www.youtube.com/watch?v=YOUTUBE_ID",
  "scifiFantasy": true,
  "cartoon": true,
  "ads": true
}
```

- `scifiFantasy` / `cartoon` / `ads` drive the three IN/OUT toggles. A video with several flags shows if **at least one** of them is IN.
- `pinBottom: true` pins the entry to the very bottom of the feed, always.
- Ordering is **always** by date, newest first. There is no sort control.

### Getting the real publish date

oEmbed does not return it. Pull it straight from the watch page:

```
curl -s -A "Mozilla/5.0" "https://www.youtube.com/watch?v=ID" \
  | grep -oE '"(publishDate|uploadDate)":"[0-9-]{10}' | head -1
```

## Local

```
python3 -m http.server 8132
```

## Dormant features

Behind flags in `app.js`, kept for later:

- `CATEGORY_FILTERS_ENABLED` — filter chips per category (VFX, Worldbuilding…)
- `LIKES_ENABLED` — per-card like button and sort-by-likes

## Analytics

GoatCounter (cookieless) in `index.html`.
