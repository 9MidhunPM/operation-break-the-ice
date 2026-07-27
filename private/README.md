# Private event data

Run:

```bash
npm run setup:seniors
```

This creates `private/seniors.json` and prints the 21 secret senior invite URLs. Edit the generated file to set the real senior display names, clues, reserved characters and photo filenames.

Put childhood photos in `private/photos/` using the filenames from that config.

Both `private/seniors.json` and `private/photos/` are ignored by Git and excluded from the Docker build context. Docker Compose mounts the whole `private/` directory read-only at runtime.
