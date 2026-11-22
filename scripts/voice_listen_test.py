"""Tests for the decisions of voice-listen.py. Run: python3 -m unittest scripts/voice_listen_test.py"""
import importlib.util
import os
import unittest

spec = importlib.util.spec_from_file_location('voice_listen', os.path.join(os.path.dirname(__file__), 'voice-listen.py'))
v = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v)


class Gate(unittest.TestCase):
    def test_phrase_under_computer_sound_is_dropped(self):
        self.assertTrue(v.should_drop(3.0, 3.2))

    def test_phrase_that_only_touches_the_tail_is_kept(self):
        self.assertFalse(v.should_drop(0.3, 2.0))

    def test_long_phrase_with_a_short_blip_is_kept(self):
        self.assertFalse(v.should_drop(1.0, 10.0))

    def test_headphones_and_bluetooth_open_the_gate(self):
        self.assertTrue(v.output_is_private('alsa_output.pci.HiFi__sink', '[Out] Headphones', False))
        self.assertTrue(v.output_is_private('bluez_sink.AA_BB.a2dp_sink', 'headset-output', False))

    def test_speakers_and_hdmi_keep_the_gate(self):
        self.assertFalse(v.output_is_private('alsa_output.pci.HiFi__sink', '[Out] Speaker', False))
        self.assertFalse(v.output_is_private('alsa_output.pci.HiFi_3__sink', '[Out] HDMI1', False))

    def test_muted_output_opens_the_gate(self):
        self.assertTrue(v.output_is_private('alsa_output.pci.HiFi__sink', '[Out] Speaker', True))


class Language(unittest.TestCase):
    def test_english(self):
        self.assertEqual(v.pick_language([('en', 0.9), ('uk', 0.01)]), 'en')

    def test_ukrainian(self):
        self.assertEqual(v.pick_language([('uk', 0.7), ('en', 0.1)]), 'uk')

    def test_speech_taken_for_russian_is_ukrainian(self):
        self.assertEqual(v.pick_language([('ru', 0.6), ('uk', 0.2), ('en', 0.05)]), 'uk')

    def test_another_language_falls_to_english_when_no_slavic_weight(self):
        self.assertEqual(v.pick_language([('de', 0.6), ('en', 0.3), ('uk', 0.01)]), 'en')


class Words(unittest.TestCase):
    def test_stop_words(self):
        for text in ('Stop.', 'Wait!', 'stop stop', 'Wait, wait.', 'Стоп!', 'Зачекай.', 'Stopp', 'No, wait.'):
            self.assertTrue(v.is_stop(text), text)

    def test_a_sentence_that_mentions_stop_is_not_a_stop(self):
        self.assertFalse(v.is_stop('Why does the server stop after ten minutes?'))
        self.assertFalse(v.is_stop('What is the status?'))

    def test_stop_word_inside_the_adjutants_own_line(self):
        self.assertTrue(v.has_stop_word('Nuclear launch detected. Wait!'))
        self.assertTrue(v.has_stop_word('Nuclear launch stop detected'))
        self.assertFalse(v.has_stop_word('Nuclear launch detected.'))

    def test_offline_phrase(self):
        for text in ('Adjutant offline.', 'Adjutant, off line', 'Agitant offline', "Ад'ютант офлайн."):
            self.assertTrue(v.is_offline(text), text)

    def test_offline_needs_both_words(self):
        self.assertFalse(v.is_offline('Is the server offline?'))
        self.assertFalse(v.is_offline('Adjutant, what is the time?'))
        self.assertFalse(v.is_offline('Tell me why the adjutant went offline yesterday evening'))

    def test_classify_order(self):
        self.assertEqual(v.classify('Adjutant offline'), 'OFFLINE')
        self.assertEqual(v.classify('wait'), 'STOP')
        self.assertEqual(v.classify('Show me the last commit'), 'HEARD')


class Invented(unittest.TestCase):
    def test_known_inventions(self):
        self.assertTrue(v.is_invented('Thank you for watching!', 0.1, -0.2))
        self.assertTrue(v.is_invented('Дякую за перегляд!', 0.1, -0.2))

    def test_empty_and_unsure(self):
        self.assertTrue(v.is_invented(' . ', 0.0, 0.0))
        self.assertTrue(v.is_invented('Some words', 0.2, -1.4))
        self.assertTrue(v.is_invented('Some words', 0.8, -0.7))

    def test_clear_speech_is_kept(self):
        self.assertFalse(v.is_invented('What branch am I on?', 0.05, -0.25))


if __name__ == '__main__':
    unittest.main()
