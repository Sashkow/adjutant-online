"""Builds src/tts/uk/uk-stress.bin.gz: where the stress falls in Ukrainian word forms.

The Ukrainian voice model reads letters directly and guesses the stress unless it is marked, and
its guesses are often wrong. This file lets the speaker mark it. The data comes from the
"ukrainian-word-stress" package (lang-uk, MIT licence), repacked so that a browser can search it
without loading 2.9 million strings.

Run:  uv run --no-project --with marisa-trie --with pip python scripts/build-uk-stress.py

Format (little endian): "UKS1", block count, one byte offset per block, then the blocks. A block
holds up to 32 words in sorted order; each is: the number of leading letters shared with the word
before it, the remaining letters (one byte each, see ALPHABET), and a closing byte 0x80 + the
number of the stressed vowel (0 = the first vowel of the word). Only words of two or more vowels.
"""
import gzip, os, struct, subprocess, sys, tempfile, zipfile

ALPHABET = "абвгґдеєжзиіїйклмнопрстуфхцчшщьюя'-"   # byte value = position + 1
VOWELS = set("аеєиіїоуюя")
BLOCK = 32
out_path = os.path.join(os.path.dirname(__file__), '..', 'src', 'tts', 'uk', 'uk-stress.bin.gz')

import marisa_trie
with tempfile.TemporaryDirectory() as tmp:
    subprocess.run([sys.executable, '-m', 'pip', 'download', '-q', '--no-deps', 'ukrainian-word-stress==2.1.0', '-d', tmp], check=True)
    wheel = next(f for f in os.listdir(tmp) if f.endswith('.whl'))
    zipfile.ZipFile(os.path.join(tmp, wheel)).extract('ukrainian_word_stress/data/stress.trie', tmp)
    zipfile.ZipFile(os.path.join(tmp, wheel)).extract('ukrainian_word_stress/tags.py', tmp)
    sys.path.insert(0, os.path.join(tmp, 'ukrainian_word_stress'))
    from tags import TAGS
    trie = marisa_trie.BytesTrie(); trie.load(os.path.join(tmp, 'ukrainian_word_stress/data/stress.trie'))
    POS, REC = TAGS['POS-separator'], TAGS['Record-separator']
    code = {c: i + 1 for i, c in enumerate(ALPHABET)}
    words, ambiguous = {}, 0
    for word, value in trie.iteritems():
        if REC in value:
            first = next(item for item in value.split(REC) if item)
            accents = first.partition(POS)[0]; ambiguous += 1
        else:
            accents = value
        if not accents: continue
        lower = word.lower()
        if any(c not in code for c in lower): continue
        vowels = [i for i, c in enumerate(lower) if c in VOWELS]
        at = accents[0] - 1                       # the mark goes after this letter
        if len(vowels) < 2 or at not in vowels: continue
        if lower in words and word != lower: continue   # prefer the common noun over the name
        words[lower] = vowels.index(at)
keys = sorted(words, key=lambda w: bytes(code[c] for c in w))
blocks, prev = [], b''
for i, w in enumerate(keys):
    b = bytes(code[c] for c in w)
    if i % BLOCK == 0: blocks.append(bytearray()); prev = b''
    shared = 0
    while shared < min(len(prev), len(b)) and prev[shared] == b[shared]: shared += 1
    blocks[-1] += bytes([shared]) + b[shared:] + bytes([0x80 + min(words[w], 0x7f)])
    prev = b
offsets, at = [], 0
for blk in blocks: offsets.append(at); at += len(blk)
raw = b'UKS1' + struct.pack('<I', len(blocks)) + struct.pack(f'<{len(blocks)}I', *offsets) + b''.join(blocks)
os.makedirs(os.path.dirname(out_path), exist_ok=True)
with open(out_path, 'wb') as f: f.write(gzip.compress(raw, 9, mtime=0))
print(f'{len(keys)} words ({ambiguous} with more than one possible stress: the first is used), {len(raw)} bytes, {os.path.getsize(out_path)} compressed')
