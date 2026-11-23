#!/usr/bin/env python3
"""
The ears of Adjutant voice mode. Records the microphone without end, cuts it into phrases,
drops the phrases that overlap computer sound, recognises the rest on this machine, and prints
one line per event on standard output:

  READY                the model is loaded and the microphone is open
  HEARD [en] text      a phrase of the owner, in English or Ukrainian
  STOP text            a phrase like "stop" or "wait" (also touches voice/stop-requested)
  OFFLINE              the owner said "Adjutant offline"; the listener ends
  PAUSED               other computer sound has kept listening shut for ten seconds
  RESUMED              that sound has ended

Why each phrase was kept or dropped goes to standard error. No audio is written to disk.
Settings come from the environment, so they can be tried without editing this file:
  VOICE_MODEL (small) VOICE_END_SILENCE (1.2 s) VOICE_TAIL (0.5 s) VOICE_MONITOR_LEVEL (30)
  VOICE_MIN_LEVEL (350) VOICE_LOUD_FACTOR (1.8) VOICE_GATE (auto | on | off)
"""
import difflib
import os
import re
import sys
import time

FRAME_SECONDS = 0.1
RATE = 16000
FRAME_SAMPLES = int(RATE * FRAME_SECONDS)

STOP_WORDS = {
    'stop', 'wait', 'halt', 'abort', 'cancel', 'weight',
    'стоп', 'стій', 'чекай', 'зачекай', 'почекай', 'зупинись', 'зупини', 'зупинися', 'скасуй',
}
# Sentences Whisper makes up from noise or silence. Compared after normalising.
INVENTED = {
    'thank you for watching', 'thanks for watching', 'thank you for watching!', 'you', 'bye',
    'дякую за перегляд', 'дякую за увагу', 'субтитри', 'продовження наступне',
    'продолжение следует', 'спасибо за просмотр', 'субтитры',
}


# ---- decisions (pure; tested in voice_listen_test.py) ----

def normalise(text):
    """Lower case, no punctuation, single spaces. Apostrophes inside words go too."""
    text = re.sub(r"[’'`ʼ]", '', text.lower())
    return ' '.join(re.sub(r'[^\w\s]', ' ', text, flags=re.UNICODE).split())


def should_drop(gated_seconds, total_seconds):
    """True if so much of the phrase overlapped computer sound that it cannot be trusted."""
    return gated_seconds > max(0.5, 0.15 * total_seconds)


def output_is_private(sink_name, port, muted):
    """True if the microphone cannot hear the output: headphones, a headset, Bluetooth, or mute."""
    if muted:
        return True
    return bool(re.search(r'headphone|headset|bluez|a2dp|handsfree|earbud', f'{sink_name} {port}', re.I))


def pick_language(probabilities):
    """English or Ukrainian, whichever is likelier. Speech taken for a near Slavic language counts as Ukrainian."""
    p = dict(probabilities)
    slavic = sum(p.get(code, 0.0) for code in ('uk', 'ru', 'be', 'pl', 'bg'))
    return 'uk' if slavic > p.get('en', 0.0) else 'en'


def _like(word, targets, threshold=0.78):
    return any(word == t or difflib.SequenceMatcher(None, word, t).ratio() >= threshold for t in targets)


def is_stop(text):
    """True for a short phrase that is at least somewhat like "stop" or "wait"."""
    words = normalise(text).split()
    return 0 < len(words) <= 4 and any(_like(w, STOP_WORDS) for w in words)


def has_stop_word(text):
    """True if any word is a stop word. Used only while an abort window is open, when the phrase
    also holds the Adjutant's own line, which never has such a word."""
    return any(_like(w, STOP_WORDS, 0.85) for w in normalise(text).split())


def is_offline(text):
    """True for "Adjutant offline" and near spellings, in English or Ukrainian."""
    flat = normalise(text).replace('off line', 'offline').replace('оф лайн', 'офлайн')
    words = flat.split()
    if not 2 <= len(words) <= 5:
        return False
    name = any(_like(w, ('adjutant', 'agitant', 'adjudant', 'адютант', 'адьютант'), 0.72) for w in words)
    off = any(_like(w, ('offline', 'офлайн'), 0.8) for w in words)
    return name and off


def is_invented(text, no_speech, log_probability):
    """True if the recognised text is more likely made up by the model than spoken."""
    flat = normalise(text)
    if not flat or flat in INVENTED:
        return True
    if log_probability < -1.1:
        return True
    return no_speech > 0.6 and log_probability < -0.6


def classify(text):
    """The event for a recognised phrase: 'OFFLINE', 'STOP' or 'HEARD'."""
    if is_offline(text):
        return 'OFFLINE'
    if is_stop(text):
        return 'STOP'
    return 'HEARD'


# ---- the listener ----

def main():
    import queue
    import subprocess
    import threading

    import numpy as np
    from faster_whisper import WhisperModel

    cache = os.path.join(os.environ.get('XDG_CACHE_HOME') or os.path.expanduser('~/.cache'), 'adjutant-voice')
    voice = os.path.join(cache, 'voice')
    os.makedirs(voice, exist_ok=True)
    pid_file, busy_file, stop_file, armed_file = (os.path.join(voice, n) for n in ('listener.pid', 'busy', 'stop-requested', 'window-open'))
    lock_file = os.path.join(cache, 'playing.lock')

    model_name = os.environ.get('VOICE_MODEL', 'small')
    end_silence = float(os.environ.get('VOICE_END_SILENCE', '1.2'))
    tail = float(os.environ.get('VOICE_TAIL', '0.5'))
    monitor_level = float(os.environ.get('VOICE_MONITOR_LEVEL', '30'))
    min_level = float(os.environ.get('VOICE_MIN_LEVEL', '350'))
    gate_mode = os.environ.get('VOICE_GATE', 'auto')
    loud_factor = float(os.environ.get('VOICE_LOUD_FACTOR', '1.8'))

    def emit(line):
        print(line, flush=True)

    def note(line):
        print(f'{time.strftime("%H:%M:%S")} {line}', file=sys.stderr, flush=True)

    with open(pid_file, 'w') as f:
        f.write(str(os.getpid()))
    for leftover in (busy_file, stop_file, armed_file):
        try: os.unlink(leftover)
        except OSError: pass

    started = time.time()
    model = WhisperModel(model_name, device='cpu', compute_type='int8', cpu_threads=8)
    note(f'model {model_name} loaded in {time.time() - started:.1f} s; end silence {end_silence} s, tail {tail} s')

    state = {'last_loud': 0.0, 'loud_since': None, 'private': False, 'running': True, 'monitor_peak': 0.0}

    def record(source):
        return subprocess.Popen(
            ['parec', '--format=s16le', f'--rate={RATE}', '--channels=1', '--latency-msec=60', '-d', source,
             '--client-name=adjutant-voice-mode'],
            stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)

    def frames(process):
        size = FRAME_SAMPLES * 2
        while state['running']:
            data = process.stdout.read(size)
            if len(data) < size:
                return
            yield np.frombuffer(data, dtype=np.int16).astype(np.float32)

    def watch_output():
        """Marks when the computer itself is playing sound."""
        while state['running']:
            process = record('@DEFAULT_MONITOR@')
            for frame in frames(process):
                level = float(np.sqrt((frame ** 2).mean()))
                now = time.time()
                if level > monitor_level:
                    state['last_loud'] = now
                    state['monitor_peak'] = max(state['monitor_peak'], level)
                    if state['loud_since'] is None:
                        state['loud_since'] = now
                elif state['loud_since'] is not None and now - state['last_loud'] > 2.0:
                    state['loud_since'] = None
            process.kill()
            time.sleep(1)

    def watch_port():
        """Headphones or a muted output mean the microphone cannot hear the computer."""
        previous = None
        while state['running']:
            try:
                env = dict(os.environ, LC_ALL='C')
                default = subprocess.run(['pactl', 'get-default-sink'], capture_output=True, text=True, env=env).stdout.strip()
                listing = subprocess.run(['pactl', 'list', 'sinks'], capture_output=True, text=True, env=env).stdout
                port, muted = '', False
                for block in listing.split('Sink #'):
                    if f'Name: {default}\n' in block:
                        found = re.search(r'Active Port: (.*)', block)
                        port = found.group(1) if found else ''
                        muted = bool(re.search(r'Mute: yes', block))
                private = output_is_private(default, port, muted)
                if gate_mode == 'on': private = False
                if gate_mode == 'off': private = True
                state['private'] = private
                if private != previous:
                    note(f'output: {port or default}{" (muted)" if muted else ""}; gate {"open: nothing is dropped" if private else "in use"}')
                    previous = private
            except Exception as e:  # pactl missing or busy: keep the last answer
                note(f'could not read the output port: {e}')
            time.sleep(3)

    def adjutant_speaking():
        try:
            with open(lock_file) as f:
                os.kill(int(f.read().split()[0]), 0)
            return True
        except (OSError, ValueError, IndexError):
            return False

    phrases = queue.Queue()
    pending = {'count': 0}

    def recognise():
        while True:
            audio, gated, total, ended = phrases.get()
            try:
                if should_drop(gated, total):
                    if not os.path.exists(armed_file):
                        note(f'dropped: computer sound over {gated:.1f} of {total:.1f} s')
                        continue
                    # An abort window is open: a stop said over the Adjutant's own line must still count.
                    x = audio / 32768.0
                    _, _, probabilities = model.detect_language(x)
                    segments, _ = model.transcribe(x, language=pick_language(probabilities), beam_size=5, vad_filter=True,
                                                   condition_on_previous_text=False)
                    text = ' '.join(s.text.strip() for s in segments).strip()
                    if has_stop_word(text):
                        note(f'STOP inside computer sound, window open: "{text}"')
                        open(stop_file, 'w').close()
                        emit(f'STOP {text}')
                    else:
                        note(f'dropped: computer sound over {gated:.1f} of {total:.1f} s, window open, no stop in "{text}"')
                    continue
                began = time.time()
                x = audio / 32768.0
                _, _, probabilities = model.detect_language(x)
                language = pick_language(probabilities)
                segments, _ = model.transcribe(
                    x, language=language, beam_size=5, vad_filter=True, condition_on_previous_text=False,
                    hotwords="Ад'ютант" if language == 'uk' else 'Adjutant')
                segments = list(segments)
                text = ' '.join(s.text.strip() for s in segments).strip()
                if not segments:
                    note(f'dropped: no speech in {total:.1f} s of sound')
                    continue
                no_speech = sum(s.no_speech_prob for s in segments) / len(segments)
                log_probability = sum(s.avg_logprob for s in segments) / len(segments)
                took = time.time() - began
                detail = f'{total:.1f} s of sound, recognised in {took:.1f} s, {time.time() - ended:.1f} s after the last word; confidence {log_probability:.2f}, no-speech {no_speech:.2f}'
                if is_invented(text, no_speech, log_probability):
                    note(f'dropped as invented: "{text}" ({detail})')
                    continue
                kind = classify(text)
                note(f'{kind} [{language}] "{text}" ({detail})')
                if kind == 'OFFLINE':
                    emit('OFFLINE')
                    state['running'] = False
                    os._exit(0)
                if kind == 'STOP':
                    open(stop_file, 'w').close()
                    emit(f'STOP {text}')
                else:
                    emit(f'HEARD [{language}] {text}')
            except Exception as e:
                note(f'recognition failed: {e}')
            finally:
                pending['count'] -= 1

    for target in (watch_output, watch_port, recognise):
        threading.Thread(target=target, daemon=True).start()

    def set_busy(busy):
        try:
            if busy: open(busy_file, 'w').close()
            else: os.unlink(busy_file)
        except OSError:
            pass

    microphone = record('@DEFAULT_SOURCE@')
    emit('READY')

    floor_levels = []          # the last eight seconds of loudness, for the noise floor
    preroll = []               # the last half second before a phrase starts
    phrase, loud_run, quiet_run, gated_frames = None, 0, 0, 0
    paused, was_busy, last_levels = False, False, time.time() - 27

    try:
        for frame in frames(microphone):
            now = time.time()
            level = float(np.sqrt((frame ** 2).mean()))
            speaking = adjutant_speaking()
            gated = (not state['private']) and (speaking or now - state['last_loud'] < tail)

            # Long sound from another program: say so once, on screen. The Adjutant's own speech does not count.
            if speaking:
                state['loud_since'] = None
            other = (not state['private']) and not speaking and state['loud_since'] is not None
            if other and not paused and now - state['loud_since'] >= 10:
                paused = True
                emit('PAUSED')
            if paused and state['loud_since'] is None:
                paused = False
                emit('RESUMED')

            # The noise floor is the quietest tenth of the last eight seconds, speech or not, so a
            # noisy microphone cannot hold a phrase open.
            floor_levels.append(level)
            del floor_levels[:-80]
            floor = sorted(floor_levels)[len(floor_levels) // 10]
            threshold = max(min_level, loud_factor * floor)
            loud = len(floor_levels) >= 10 and level > threshold
            if now - last_levels >= 30:
                last_levels = now
                note(f'microphone: noise floor {floor:.0f}, speech above {threshold:.0f}')

            if phrase is None:
                preroll.append(frame)
                del preroll[:-5]
                loud_run = loud_run + 1 if loud else 0
                if loud_run >= 3:
                    phrase, quiet_run, gated_frames = list(preroll), 0, 0
            else:
                phrase.append(frame)
                if gated:
                    gated_frames += 1
                elif gated_frames and gated_frames >= 0.8 * (len(phrase) - 1):
                    # Everything so far was computer sound and it has just ended: a new phrase starts here.
                    phrase, gated_frames, quiet_run = phrase[-3:], 0, 0
                quiet_run = 0 if loud else quiet_run + 1
                seconds = len(phrase) * FRAME_SECONDS
                if quiet_run * FRAME_SECONDS >= end_silence or seconds >= 30:
                    pending['count'] += 1
                    phrases.put((np.concatenate(phrase), gated_frames * FRAME_SECONDS, seconds, now - quiet_run * FRAME_SECONDS))
                    phrase, loud_run, preroll = None, 0, []

            busy = phrase is not None or pending['count'] > 0
            if busy != was_busy:
                set_busy(busy)
                was_busy = busy
    finally:
        state['running'] = False
        microphone.kill()
        set_busy(False)
        try:
            if open(pid_file).read().strip() == str(os.getpid()):
                os.unlink(pid_file)
        except OSError:
            pass


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        pass
