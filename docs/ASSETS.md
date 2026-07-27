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

For this in-house orientation, organisers have approved the use of familiar third-party character, celebrity, sports, vehicle and food imagery. Cache selected images locally in the repository/deployment instead of hotlinking them so the event does not depend on third-party servers.

Keep `config/assets-sources.json` when an automated source pass is used; it records where each cached image came from and makes bad matches easy to replace before the event.

## Asset manifest workflow

When adding a curated image:

1. match the exact path already configured in `config/teams.json`;
2. optimise it to WebP;
3. run `npm run assets:check`;
4. visually check it at a narrow phone width;
5. ensure text remains readable over the artwork.

Artwork is presentation-only. Team/character allocation never depends on image availability.

## Automated in-house artwork cache

`config/assets-sources.json` maps each configured character to a selected image source. The actual image binaries are intentionally Git-ignored because this repository is public.

On a machine with ImageMagick installed:

```bash
npm run assets:fetch
npm run assets:check
```

`assets:fetch` downloads each source with a timeout, falls back to the cached search thumbnail when the origin fails, and renders a consistent 720×1280 WebP with a blurred full-screen background plus the uncropped source in the foreground. Existing files are skipped, so the command is resumable.

The production Docker build installs ImageMagick in its build stage and runs the same fetch step before Vite builds `dist/`. A failed individual image never breaks deployment; that character uses the built-in cinematic fallback instead.
