# Behr · بحر

**The hidden rhythm inside Urdu poetry.**

**Live:** https://romaisamustabshirah.github.io/Behr/

Every Urdu ghazal is written in a *behr*: a meter made of long and short syllables that poets feel but readers rarely see. Behr makes this hidden structure perceptible in three ways:

- **Scan:** type a misra in Roman Urdu and a scansion engine finds its meter, handling poetic licence, *wasl* and *zihāf* variants
- **Hear:** a synthesized tabla plays the rhythm, a deep *dum* for long syllables and a bright *tak* for short ones
- **See:** each meter draws its own star-polygon signature in the 8-pointed *khatam* of Islamic geometry

All three are generated from the same underlying pattern, so sound, light and syllables move together.

Built with plain JavaScript, the Web Audio API and Canvas, with no libraries.
## Notation

| Mark | Weight | Name | Example syllables |
|------|--------|------|-------------------|
| ◡ | 1 | short (hijā-e-kotāh) | *ki*, *pe* |
| — | 2 | long (hijā-e-buland) | *zaa*, *dam*, *har* |

## Run locally

The JavaScript uses ES modules, so open it through a local server (not by double-clicking the file):

```bash
python -m http.server 8000
# then visit http://localhost:8000
```

Or use the VS Code **Live Server** extension.

## Roadmap

- [x] Meters as data, drawn as right-to-left rhythm with an animated playhead
- [x] Rhythm to sound (Web Audio)
- [x] Scansion engine: verse in, meter out
- [x] Generative visuals driven by the rhythm
- [x] Polish and write-up
