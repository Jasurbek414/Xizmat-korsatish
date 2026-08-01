#!/usr/bin/env python3
"""
Kutish musiqasi (music-on-hold) generatori.

NEGA SKRIPT, TAYYOR FAYL EMAS:
  Audio fayllar .gitignore'da (git kod uchun, media uchun emas), shuning uchun
  yangi serverga deploy qilinganda moh/ papkasi bo'sh bo'lib qoladi va mijoz
  kutishda jimlik eshitadi. Bu skript git'ga tushadi va musiqani istalgan
  joyda QAYTA YARATADI - qo'lda fayl ko'chirish kerak emas.

NEGA O'ZIMIZ YARATAMIZ:
  Tayyor musiqa deyarli har doim mualliflik huquqi bilan himoyalangan. Bu
  yerda oddiy sinus to'lqinlaridan sintez qilingan original ohang - hech
  qanday huquqiy cheklov yo'q.

FORMAT: 8 kHz, mono, 16-bit PCM WAV - Asterisk'ning "wav" formati.
  Telefon liniyasi 8 kHz'dan yuqorisini baribir tashlaydi, shuning uchun
  yuqori sifat faqat joy egallaydi.

ISHLATISH:
  python3 scripts/generate-moh.py
  keyin:  docker restart service-core-asterisk
  tekshirish:  docker exec service-core-asterisk asterisk -rx "moh show files"
"""

import math
import os
import struct
import wave

RATE = 8000          # Asterisk "wav" formati uchun
CHORD_SECONDS = 4.0  # har akkord davomiyligi
OUT_NAME = "kutish-musiqasi.wav"

# Am - F - C - G: keng tarqalgan, quloqqa yoqimli va bir-biriga silliq
# o'tadigan progressiya. Oxirgi akkord (G) birinchisiga (Am) tabiiy
# qaytadi, shuning uchun fayl uzluksiz aylanadi (loop) - Asterisk uni
# to'xtovsiz takrorlaydi va tikilgan joy sezilmaydi.
PROGRESSION = [
    (110.00, [220.00, 261.63, 329.63]),  # Am : A2 bass + A3 C4 E4
    (87.31,  [174.61, 220.00, 261.63]),  # F  : F2 bass + F3 A3 C4
    (130.81, [196.00, 261.63, 329.63]),  # C  : C3 bass + G3 C4 E4
    (98.00,  [196.00, 246.94, 293.66]),  # G  : G2 bass + G3 B3 D4
]


def envelope(t, dur, attack=0.05, release=0.35):
    """Yumshoq kirish/chiqish - keskin boshlanish 'chirt' etib eshitiladi."""
    if t < attack:
        return t / attack
    if t > dur - release:
        return max(0.0, (dur - t) / release)
    return 1.0


def generate():
    samples = []
    for bass_hz, chord in PROGRESSION:
        n = int(RATE * CHORD_SECONDS)
        for i in range(n):
            t = i / RATE
            value = 0.0

            # Past bass - akkordga "vazn" beradi, doimiy va yumshoq.
            value += 0.18 * math.sin(2 * math.pi * bass_hz * t) * envelope(
                t, CHORD_SECONDS, attack=0.30, release=0.60
            )

            # Arpejio: akkord notalari ketma-ket "chertiladi", har biri
            # eksponensial so'nadi - jonli cholg'u taassurotini beradi.
            for idx, note_hz in enumerate(chord):
                start = idx * (CHORD_SECONDS / len(chord))
                if t < start:
                    continue
                dt = t - start
                decay = math.exp(-1.6 * dt)
                # Ikkinchi garmonika ozgina qo'shiladi - toza sinus juda
                # "quruq" eshitiladi, garmonika unga iliqlik beradi.
                tone = math.sin(2 * math.pi * note_hz * t) + 0.25 * math.sin(
                    2 * math.pi * note_hz * 2 * t
                )
                value += 0.16 * tone * decay

            # Kesilishning (clipping) oldini olamiz.
            value = max(-0.95, min(0.95, value))
            samples.append(struct.pack("<h", int(value * 32767)))

    return b"".join(samples)


def main():
    out_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "asterisk-config", "moh",
    )
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, OUT_NAME)

    data = generate()
    with wave.open(path, "wb") as w:
        w.setnchannels(1)     # mono
        w.setsampwidth(2)     # 16-bit
        w.setframerate(RATE)  # 8 kHz
        w.writeframes(data)

    secs = len(data) / 2 / RATE
    print("Yaratildi : %s" % path)
    print("Davomiylik: %.1f soniya (%d KB)" % (secs, len(data) // 1024))
    print("Format    : %d Hz, mono, 16-bit PCM" % RATE)
    print("")
    print("Keyingi qadam:  docker restart service-core-asterisk")


if __name__ == "__main__":
    main()
