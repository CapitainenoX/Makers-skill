# Maker Skill

Un harnais agentique de production vidéo pour Claude Code. Il étudie ton marché, choisit un
sujet, écrit le script, va chercher les clips / la musique / les mèmes, monte, anime, mixe,
contrôle la qualité, livre — et retient ce que tu as aimé pour la prochaine fois.

Conçu pour tourner **vite et en économie de tokens** : tout ce qui est déterministe passe
par un outil (`mk`), pas par le modèle. Un petit modèle écrit du JSON, le harnais écrit le
ffmpeg. Un modèle frontier fait la même chose, en plus subtil.

```
"fais-moi un short sur ce repo GitHub"
"monte mes rushs en 40s vertical"
"mode autonome : trouve un sujet et fais la vidéo"
"enlève le fond de cette vidéo et mets-la sur un fond animé"
```

---

## Installation

```bash
git clone https://github.com/CapitainenoX/Makers-skill.git
cd Makers-skill
./install.sh                # ~/.claude/skills  (partout)
./install.sh --project      # ./.claude/skills  (ce projet seulement)
```

Puis vérifie l'hôte :

```bash
bash ~/.claude/skills/maker/toolbelt/doctor.sh
```

| Dépendance | Statut | Pourquoi |
|---|---|---|
| **ffmpeg** (avec libass) | requis | tout le rendu, et le texte animé |
| **yt-dlp** | fortement conseillé | télécharger clips, musiques, sous-titres auto |
| whisper / faster-whisper | optionnel | transcription → sous-titres |
| rembg | optionnel | détourage IA (sans fond vert) |
| edge-tts / kokoro / piper | optionnel | voix off locale et gratuite |
| Puter (token) | optionnel | voix neuronales réelles, sans clé de fournisseur |
| node 18+ | pour `maker-remotion` | rendu Remotion (motion design en code) |

Clés d'API, toutes facultatives et fournies par toi :
`ELEVENLABS_API_KEY`, `TENOR_API_KEY`, `GIPHY_API_KEY`, `PEXELS_API_KEY`, `PIXABAY_API_KEY`, `FREESOUND_API_KEY`, `PUTER_AUTH_TOKEN`.
Aucune n'est jamais écrite dans un fichier ni affichée — `mk doctor` dit seulement
lesquelles sont présentes. Chaque son téléchargé écrit sa ligne dans `credits.md`.

---

## Comment c'est construit

Un skill routeur qui appelle dix sous-skills, chacun chargé **au moment où il sert**
(progressive disclosure : rien ne coûte de contexte tant que ce n'est pas ouvert).

| Skill | Rôle |
|---|---|
| `maker` | routeur, modes, boucle de production, règles non négociables |
| `maker-research` | marché, tendances, concurrence, dédoublonnage des sujets |
| `maker-script` | hook, structure, beat sheet, voix off, titres, miniature |
| `maker-assets` | téléchargements, musiques, mèmes, SFX, b-roll, lecture des rushs |
| `maker-voice` | TTS (ElevenLabs / Kokoro / Piper / edge-tts), transcription, sous-titres |
| `maker-motion` | rythme, easing, typo cinétique, transitions, couleur — la doctrine |
| `maker-edit` | l'EDL ffmpeg, ou piloter CapCut / Premiere / Resolve / Kdenlive… en MCP |
| `maker-remotion` | motion design par code : typo cinétique **+ tes rushs encadrés** dans des mockups |
| `maker-vfx` | détourage, fond vert, looks, glitch, cinématiques Blender |
| `maker-screen` | briefer un enregistrement d'écran puis le rendre dynamique |
| `maker-render` | rendu, QC mesuré, auto-critique, livraison |
| `maker-memory` | marché, style appris, retours du créateur, journal des vidéos |

### Deux moteurs

**`mk assemble`** monte des rushs avec ffmpeg, comme un monteur. **`mk remotion`** les
*présente* : la même capture d'écran, mise dans un mockup de téléphone sur un dégradé,
avec une vraie ombre et une dérive de quelques pixels, ne se lit plus comme un rush mais
comme du design produit. C'est le style « studio » fond clair.

19 types de scène. Cinq portent de la vidéo (`card`, `media`, `tiles`, `annotate`, plein
cadre), quatre portent la structure (`chips` pastilles à logos, `diagram` hub + connecteurs,
`flow` pipeline, `mock` composant d'UI reconstruit).

La signature du style, c'est **une phrase qui coule avec l'emphase dedans** — pas des
lignes empilées :

```json
"rich": "every **AI assistant** you have ever used **works** this way"
```

Le bloc est **centré**, les bords haut/bas remplis par un `decor` qui déborde et dérive.
Le style par défaut est **noir sur blanc** ; la couleur s'active avec `brand.accent`.
Chaque scène entre par une direction différente (`variant` tourne automatiquement).
Les surlignages sont **animés** : le texte arrive, puis le marqueur le traverse.
La police (Inter) est **embarquée**, jamais tirée d'un CDN au rendu.

### De vrais logos, du vrai son

```bash
mk logo get github docker node --color 111111   # marques réelles (Simple Icons, CC0)
mk sound pack                                   # one-shots enregistrés (Freesound, CC0) + crédits
mk sound music "minimal tech ambient loop"      # un lit musical, licence tracée
mk sfx gen --all                                # repli synthétisé, aucune clé d'API
mk tts "<le script>" -o voice/vo.wav
mk mix out/video.mp4 -o out/final.mp4 --from-deck deck.json --voice voice/vo.wav --music bed.mp3
```

`mk mix --from-deck` place un one-shot par coupe, 60 ms en avance, choisi selon le type de
scène ; la voix passe devant, le lit est ducké dessous, et le tout est normalisé en deux
passes à −14 LUFS. **Une vidéo muette est l'erreur la plus chère de ce format** — le lint
et le QC la refusent tous les deux. Les deux moteurs se composent : on rend l'habillage en Remotion (avec
alpha), on le pose sur la timeline de l'EDL.

```bash
mk remotion init                                 # une fois
mk remotion deck deck.json --template footage-short   # celui à prendre si tu as des rushs
mk remotion validate deck.json                   # gratuit, toujours avant de rendre
mk remotion sheet deck.json -o out/sheet.png     # une image par scène — et on la REGARDE
mk remotion render deck.json -o out/final.mp4
```

Là aussi le modèle écrit du JSON (des *scènes*), les composants React possèdent chaque
pixel. Le style et ses règles : `skills/maker-remotion/references/studio-style.md`.

Dépendances : Node 18+ et un Chromium **headless shell** (Chrome moderne a supprimé
l'ancien mode headless ; `mk` réutilise celui de l'hôte s'il en trouve un).

### Le moteur rushs : un EDL déclaratif

Le modèle écrit un JSON (plans, mouvements, textes, sons), `mk assemble` construit le
graphe ffmpeg, met chaque étape en cache, et **critique le montage** :

```bash
mk assemble edl.json --dry-run
# "average shot length 3.4s exceeds 2.6s — the edit will feel flat"
# "no on-screen text in the first 1.5s — sound-off viewers have nothing to read"
```

Le texte passe par libass, pas par `drawtext` : ça survit aux builds ffmpeg 7 sans
libharfbuzz, et ça permet le scale animé, l'overshoot et la typo cinétique que `drawtext`
ne sait pas faire.

### La mémoire, et la bibliothèque

`.maker/memory/` — le marché, le style appris, tes retours datés, **les patterns prouvés
par un chiffre**, et le journal des vidéos avec leurs performances.

```bash
mk mem perf mon-short --views 15 --engaged 7 --retention 41
#  → "47% des vues engagées — sous 60%, c'est le corps qui a perdu, pas le hook"
mk mem win  "voix off + lit ducké" --evidence "72% de vue moyenne"
mk mem fail "montage muet, musique hors sujet" --evidence "7/15 engagées"
```

`.maker/library/` garde ce qui a déjà marché — logos, lits musicaux, one-shots, prises de
voix, fragments de deck — avec le **pourquoi**. C'est ce qui fait passer la deuxième vidéo
de quarante minutes à cinq.

| Passage | Budget | Ce qu'il paie |
|---|---|---|
| **Le premier** | 20–40 min | étude de marché, logos, pack SFX, fichier de style, un rendu complet |
| **Tous les suivants** | **~5 min** | script → deck → rendu → mix → QC, en relisant la mémoire |

---

## La boîte à outils `mk`

```bash
mk doctor                                   # que sait faire cette machine
mk init mon-short --format shorts
mk scan rushes/ --deep                      # index + planches-contact à regarder
mk fetch <url> --clip 00:01:12 00:01:26
mk music "dark lofi no copyright"
mk sfx vine boom -n 3
mk tts "Ce repo a 40 000 étoiles." -o voice/vo.wav --lang fr
mk transcribe voice/vo.wav -o subs/vo.srt
mk subs subs/vo.srt -o subs/captions.ass --style shout
mk bgremove rushes/cam.mp4 out/cam.webm --mode auto
mk assemble edl.json --preview
mk remotion sheet deck.json -o out/sheet.png
mk remotion render deck.json -o out/final.mp4
mk qc out/final.mp4 --target shorts
mk mem similar "repo github qui remplace notion"
```

Toutes les commandes répondent en JSON. Toutes les écritures restent dans `.maker/`.
Aucune ne construit de commande shell à partir de contenu téléchargé.

---

## Modes

| Mode | Déclencheur | Comportement |
|---|---|---|
| **auto** (défaut) | "fais-moi une vidéo" | décide tout, monte, s'auto-évalue, livre |
| **plan** | "propose d'abord" | concept + shot list, puis attend |
| **step** | "étape par étape" | une phase par tour |
| **assist** | "juste un titre" | fait la chose demandée, rien d'autre |
| **autonome** | "trouve un sujet" | choisit aussi le sujet, puis enchaîne en auto |

---

## Ce que ça ne fera pas

- Mettre le visage ou la voix d'une personne réelle dans un contenu qui laisse croire
  qu'elle a dit ou fait quelque chose qu'elle n'a pas fait.
- Prétendre qu'un morceau sous droits est « probablement OK ». Soit c'est libre, soit
  c'est signalé.
- Dire qu'une vidéo est bonne sans avoir regardé les images qu'elle contient.

## Licence

MIT.
