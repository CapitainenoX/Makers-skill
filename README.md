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
| node | optionnel | Remotion (motion design en code) |

Clés d'API, toutes facultatives et fournies par toi :
`ELEVENLABS_API_KEY`, `TENOR_API_KEY`, `GIPHY_API_KEY`, `PEXELS_API_KEY`, `PIXABAY_API_KEY`.
Aucune n'est jamais écrite dans un fichier ni affichée.

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
| `maker-vfx` | détourage, fond vert, looks, glitch, cinématiques Blender |
| `maker-screen` | briefer un enregistrement d'écran puis le rendre dynamique |
| `maker-render` | rendu, QC mesuré, auto-critique, livraison |
| `maker-memory` | marché, style appris, retours du créateur, journal des vidéos |

### Le moteur : un EDL déclaratif

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

### La mémoire

`.maker/memory/` — quatre fichiers courts : le marché, le style appris, tes retours datés,
et le journal des vidéos publiées (pour ne jamais refaire deux fois le même sujet).
Tes retours priment sur les préférences de l'agent. Toujours.

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
