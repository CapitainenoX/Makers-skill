#!/usr/bin/env python3
"""mk compose — an original music bed, synthesised on the spot.

No key, no download, no licence to check, no Content ID claim: kick, clap, hats, a
plucked sub-bass line, a detuned pad and an arpeggio that enters after the fourth bar
to lift the middle. The drums drop out when the outro starts so the last card breathes.

It is minimal tech on purpose — the register that sits under a voice without fighting
it. Change the key, the progression, the tempo and the seed per video: two videos on
the same bed is the audio version of the same decor on every scene.

    mk compose -o bed.wav --deck deck.json                 # length and outro from the deck
    mk compose -o bed.wav --duration 32 --bpm 124 --prog dm --seed 7
"""
from __future__ import annotations

import argparse, wave

from _common import die, emit, read_json, safe_path

SR = 48000

# Four-bar progressions as MIDI triads, with the bass roots under them.
PROGS = {
    "am": ([[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], [45, 41, 48, 43]),  # Am F C G
    "dm": ([[62, 65, 69], [58, 62, 65], [53, 57, 60], [60, 64, 67]], [50, 46, 41, 48]),  # Dm Bb F C
    "em": ([[64, 67, 71], [60, 64, 67], [55, 59, 62], [62, 66, 69]], [52, 48, 43, 50]),  # Em C G D
    "cm": ([[60, 63, 67], [56, 60, 63], [63, 67, 70], [58, 62, 65]], [48, 44, 51, 46]),  # Cm Ab Eb Bb
    "fm": ([[65, 68, 72], [61, 65, 68], [56, 60, 63], [63, 67, 70]], [41, 49, 44, 51]),  # Fm Db Ab Eb
}


def main():
    ap = argparse.ArgumentParser(prog="mk compose")
    ap.add_argument("-o", "--output", required=True)
    ap.add_argument("--deck", help="take the length and the outro start from a deck")
    ap.add_argument("--duration", type=float, help="seconds (default: deck length + 2)")
    ap.add_argument("--outro-at", type=float, help="drums stop here (default: last scene start)")
    ap.add_argument("--bpm", type=float, default=124)
    ap.add_argument("--prog", default="am", choices=sorted(PROGS))
    ap.add_argument("--seed", type=int, default=7)
    a = ap.parse_args()

    import numpy as np

    dur, outro = a.duration, a.outro_at
    if a.deck:
        deck = read_json(safe_path(a.deck, must_exist=True)) or die("unreadable deck")
        ds = [float(s["duration"]) for s in deck.get("scenes", [])]
        if not ds:
            die("deck has no scenes")
        dur = dur or sum(ds) + 2.0
        outro = outro if outro is not None else sum(ds[:-1])
    if not dur:
        die("give --duration or --deck")
    outro = outro if outro is not None else dur - 2.0

    beat = 60 / a.bpm
    n = int(dur * SR)
    L = np.zeros(n); R = np.zeros(n)
    rng = np.random.default_rng(a.seed)

    def lp(x, fc):
        # one-pole low-pass: warm enough for plucks and hats, no scipy needed
        k = np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); s = 0.0
        for i, v in enumerate(x):
            s = (1 - k) * v + k * s; y[i] = s
        return y

    def env(m, att, dec):
        t = np.arange(m) / SR
        return np.minimum(1, t / att) * np.exp(-t / dec)

    def add(sig, t, g=1.0, pan=0.0):
        i = int(t * SR)
        if i >= n:
            return
        j = min(n, i + len(sig))
        L[i:j] += sig[:j - i] * g * (1 - pan); R[i:j] += sig[:j - i] * g * (1 + pan)

    f = lambda m: 440 * 2 ** ((m - 69) / 12)
    tk = np.arange(int(0.45 * SR)) / SR
    kick = np.sin(2 * np.pi * (48 * tk + (110 / 18) * (1 - np.exp(-18 * tk)))) * np.exp(-tk / 0.16)
    kick += 0.3 * np.sin(2 * np.pi * 48 * tk) * np.exp(-tk / 0.3)
    hn = rng.standard_normal(int(0.06 * SR)); hat = (hn - lp(hn, 9000)) * env(len(hn), 0.001, 0.015)
    clap = lp(rng.standard_normal(int(0.25 * SR)), 3500) * env(int(0.25 * SR), 0.002, 0.06)

    def pluck(freq, d, bright):
        m = int(d * SR); t = np.arange(m) / SR
        x = 2 * ((freq * t) % 1) - 1 + 0.5 * (2 * ((freq * 1.005 * t) % 1) - 1)
        return lp(x, bright) * env(m, 0.004, d / 3)

    def pad(freqs, d):
        m = int(d * SR); t = np.arange(m) / SR; x = np.zeros(m)
        for fr in freqs:
            for dt in (-0.004, 0.004):
                x += np.sin(2 * np.pi * fr * (1 + dt) * t) + 0.25 * np.sin(4 * np.pi * fr * (1 + dt) * t)
        return x * np.minimum(1, t / 0.6) * np.minimum(1, (d - t) / 0.6) / len(freqs)

    chords, roots = PROGS[a.prog]
    bar = 4 * beat
    for b in range(int(np.ceil(dur / bar))):
        t0 = b * bar; c = b % 4
        add(pad([f(m) for m in chords[c]], bar + 0.3), t0, 0.11)
        for k in range(4):
            tb = t0 + k * beat
            if tb >= outro:
                continue
            add(kick, tb, 0.9)
            if k in (1, 3):
                add(clap, tb, 0.35, 0.1)
            add(hat, tb + beat / 2, 0.22, -0.3)
            if b >= 2:
                add(hat, tb + beat / 4, 0.08, 0.3); add(hat, tb + 3 * beat / 4, 0.08, 0.3)
        for e in range(8):
            te = t0 + e * beat / 2
            if te < outro:
                add(pluck(f(roots[c] - 12 + (12 if e in (3, 7) else 0)), 0.22, 700 + 500 * (b % 2)), te, 0.45)
        if b >= 4:
            for s in range(16):
                ts = t0 + s * beat / 4
                if ts < outro:
                    add(pluck(f(chords[c][s % 3] + 12), 0.12, 3000), ts, 0.07, 0.5 if s % 2 else -0.5)

    d = int(0.375 * SR)
    L[d:] += 0.18 * R[:-d]; R[d:] += 0.18 * L[:-d]
    t = np.arange(n) / SR
    fade = np.minimum(np.clip((dur - t) / 1.8, 0, 1), np.clip(t / 0.05, 0, 1))
    st = np.stack([L * fade, R * fade], 1)
    st = st / (np.abs(st).max() or 1) * 0.89

    out = safe_path(a.output, write=True)
    out.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(out), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((st * 32767).astype(np.int16).tobytes())
    emit({"ok": True, "output": str(out), "duration_s": round(dur, 2), "bpm": a.bpm,
          "prog": a.prog, "seed": a.seed, "drums_out_at": round(outro, 2),
          "licence": "original synthesis — no third-party rights; credit it as 'original composition'",
          "next": "mk mix <video> -o final.mp4 --from-deck <deck> --voice vo.wav --music " + a.output})


if __name__ == "__main__":
    main()
