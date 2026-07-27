# Character Artwork

The public catalogue currently defines **21 teams × 28 identities = 588 character slots**.

Each identity has an expected artwork path:

```text
public/assets/characters/<team-id>/<character-id>.webp
```

Run:

```bash
npm run assets:check
```

to see which files are present or missing.

## Missing artwork is safe

The participant experience does not break when an image is absent. `CharacterArt` renders a team-coloured cinematic fallback using the team's emoji and character name. This makes the event runnable before every optional asset has been curated.

## Recommended image format

For the phone-first reveal/card experience:

- portrait composition;
- roughly 1080×1920 source or similar tall aspect ratio;
- WebP where practical;
- keep files reasonably compressed for hundreds of phones on venue Wi-Fi;
- keep the subject away from the lower text/gradient area where possible.

The same image is used both as the dominant character art and as the full-screen visual background treatment; a separate wallpaper is not required.

## Rights / licensing

Do not mass-download random search-engine images into this public repository.

For real people, use images the organisers have permission to use or assets with a suitable licence and retain attribution/licence records where required.

For copyrighted fictional characters, supply event-authorised artwork separately rather than committing unverified third-party images here.

## Asset manifest workflow

When adding a curated image:

1. match the exact path already configured in `config/teams.json`;
2. optimise it to WebP;
3. run `npm run assets:check`;
4. visually check it at a narrow phone width;
5. ensure text remains readable over the artwork.

Artwork is presentation-only. Team/character allocation never depends on image availability.
