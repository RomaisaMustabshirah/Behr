# Behr · بحر

**The hidden rhythm inside Urdu poetry.**

Every Urdu ghazal is written in a *behr*, a meter made of feet (*arkān*) like *mafā‘īlun* and *fā‘ilātun*. Each foot is a pattern of short and long syllables. Behr makes that pattern visible and, in later stages, audible. It also scans real verses to work out which meter they're in.

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
- [ ] Generative visuals driven by the rhythm
- [ ] Polish and write-up