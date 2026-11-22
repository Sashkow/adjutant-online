window.SCENES = [
 {
  "id": "task",
  "title": "The task",
  "show": [
   "phone",
   "app"
  ],
  "cards": [
   "<b>Conditions</b>",
   "spell and say first",
   "no web pages",
   "everything inside the Claude app"
  ],
  "steps": [
   {
    "t": "Here is the task I was given.",
    "hl": [],
    "at": 0.523
   },
   {
    "t": "This box on the left is your Android phone, with the Claude app inside it.",
    "hl": [
     "phone",
     "app"
    ],
    "at": 2.841
   },
   {
    "t": "You want the app to speak to you in the Adjutant voice.",
    "hl": [
     "app"
    ],
    "at": 7.666
   },
   {
    "t": "These three tags are the three things you named.",
    "hl": [
     "chip-voice",
     "chip-spell",
     "chip-say"
    ],
    "at": 10.844
   },
   {
    "t": "This one is voice mode through the Adjutant effect.",
    "hl": [
     "chip-voice"
    ],
    "at": 13.665
   },
   {
    "t": "This one is spell, which rewords the reply and speaks it.",
    "hl": [
     "chip-spell"
    ],
    "at": 17.041
   },
   {
    "t": "And this one is say, which speaks the text exactly as written.",
    "hl": [
     "chip-say"
    ],
    "at": 21.082
   },
   {
    "t": "Your conditions are listed on the right.",
    "hl": [
     "cards"
    ],
    "at": 25.223
   },
   {
    "t": "Spell and say come first, with no web pages, and everything inside the app.",
    "hl": [
     "cards"
    ],
    "at": 27.987
   }
  ],
  "seconds": 33.552,
  "audio": "audio/01-task.wav"
 },
 {
  "id": "problem",
  "title": "Where is the sound made?",
  "show": [
   "phone",
   "app",
   "chip-voice",
   "chip-spell",
   "chip-say"
  ],
  "cards": [
   "laptop: code runs here, speakers here ✓",
   "phone: the Claude app runs no code ✗",
   "Claude's code runs in Anthropic's sandbox"
  ],
  "steps": [
   {
    "t": "The main problem is where the sound is made.",
    "hl": [],
    "at": 0.567
   },
   {
    "t": "This box on the right is your laptop.",
    "hl": [
     "laptop"
    ],
    "at": 3.161
   },
   {
    "t": "There, the speaker program runs on your own computer, and plays on your speakers.",
    "hl": [
     "laptop",
     "mark-laptop"
    ],
    "at": 5.787
   },
   {
    "t": "The phone is different.",
    "hl": [
     "phone"
    ],
    "at": 10.757
   },
   {
    "t": "The Claude app runs no code on the phone itself.",
    "hl": [
     "app",
     "mark-phone"
    ],
    "at": 12.489
   },
   {
    "t": "This large box in the middle is a sandbox on Anthropic's computers.",
    "hl": [
     "sandbox"
    ],
    "at": 15.605
   },
   {
    "t": "That is where Claude's code runs.",
    "hl": [
     "sandbox"
    ],
    "at": 20.139
   },
   {
    "t": "So the sound must be made there, and sent back into the chat.",
    "hl": [
     "sandbox",
     "a-phone-sandbox"
    ],
    "at": 22.54
   }
  ],
  "seconds": 26.775,
  "audio": "audio/02-problem.wav"
 },
 {
  "id": "route",
  "title": "The main route",
  "show": [
   "phone",
   "app",
   "chip-voice",
   "chip-spell",
   "chip-say",
   "sandbox"
  ],
  "cards": [
   "spell: reworded by the clear-speech rules",
   "say: the text as written",
   "say.js --out reply.wav --no-play",
   "the file plays in the chat"
  ],
  "steps": [
   {
    "t": "This is the route I recommend.",
    "hl": [],
    "at": 0.567
   },
   {
    "t": "You type spell or say in the Claude app.",
    "hl": [
     "chip-spell",
     "chip-say"
    ],
    "at": 2.775
   },
   {
    "t": "The request goes to this box, which is a skill on your claude account.",
    "hl": [
     "skill",
     "a-phone-sandbox"
    ],
    "at": 5.349
   },
   {
    "t": "These two boxes are the two commands.",
    "hl": [
     "reword",
     "keep",
     "a-skill-reword",
     "a-skill-keep"
    ],
    "at": 9.807
   },
   {
    "t": "For spell, Claude rewords the text with the clear speech rules.",
    "hl": [
     "reword",
     "a-skill-reword"
    ],
    "at": 12.594
   },
   {
    "t": "For say, Claude keeps the text as it is.",
    "hl": [
     "keep",
     "a-skill-keep"
    ],
    "at": 16.669
   },
   {
    "t": "This box is the same speaker program as on your laptop.",
    "hl": [
     "sayjs",
     "a-reword-say",
     "a-keep-say"
    ],
    "at": 19.663
   },
   {
    "t": "It writes a sound file, which is this box.",
    "hl": [
     "wav",
     "a-say-wav"
    ],
    "at": 23.668
   },
   {
    "t": "The file comes back into the chat, and you play it here.",
    "hl": [
     "player",
     "a-wav-phone"
    ],
    "at": 27.01
   }
  ],
  "seconds": 31.152,
  "audio": "audio/03-route.wav"
 },
 {
  "id": "parts",
  "title": "What the speaker needs",
  "show": [
   "phone",
   "app",
   "chip-spell",
   "chip-say",
   "sandbox",
   "skill",
   "reword",
   "keep",
   "sayjs",
   "wav",
   "a-skill-reword",
   "a-skill-keep",
   "a-reword-say",
   "a-keep-say",
   "a-say-wav"
  ],
  "cards": [
   "say.js: 124 KB, exists ✓",
   "packages from npm: approved site ✓",
   "voice model, 78 MB, Hugging Face: not on the list ?"
  ],
  "steps": [
   {
    "t": "These are the parts the speaker program needs.",
    "hl": [
     "sayjs",
     "npm",
     "hf"
    ],
    "at": 0.567
   },
   {
    "t": "The program itself is small, and it already exists.",
    "hl": [
     "sayjs"
    ],
    "at": 3.413
   },
   {
    "t": "This box is the package manager site.",
    "hl": [
     "npm",
     "a-npm-say"
    ],
    "at": 7.233
   },
   {
    "t": "The sandbox is allowed to reach it, so it has a check mark.",
    "hl": [
     "npm"
    ],
    "at": 10.417
   },
   {
    "t": "This box is the Hugging Face site, which holds the voice model.",
    "hl": [
     "hf",
     "a-hf-say"
    ],
    "at": 14.188
   },
   {
    "t": "The model is about eighty megabytes.",
    "hl": [
     "hf"
    ],
    "at": 18.396
   },
   {
    "t": "That site is not on the approved list, so the download may be refused.",
    "hl": [
     "hf"
    ],
    "at": 20.898
   }
  ],
  "seconds": 26.32,
  "audio": "audio/04-parts.wav"
 },
 {
  "id": "fallbacks",
  "title": "A fallback for each unknown",
  "show": [
   "phone",
   "app",
   "chip-spell",
   "chip-say",
   "sandbox",
   "skill",
   "reword",
   "keep",
   "sayjs",
   "wav",
   "npm",
   "hf",
   "a-npm-say",
   "a-hf-say",
   "a-say-wav",
   "a-wav-phone",
   "player"
  ],
  "cards": [
   "skills not in the Android app → a claude.ai Project holds the files",
   "Hugging Face refused → model on GitHub, or packed in the skill",
   "file does not play → a small player inside the reply",
   "neither plays → this route is closed"
  ],
  "steps": [
   {
    "t": "Each open part has a fallback.",
    "hl": [
     "cards"
    ],
    "at": 0.567
   },
   {
    "t": "They are listed on the right.",
    "hl": [
     "cards"
    ],
    "at": 2.95
   },
   {
    "t": "Uploaded skills may not work in the Android app.",
    "hl": [
     "skill"
    ],
    "at": 4.909
   },
   {
    "t": "Then a claude project, this dashed box, can hold the same files.",
    "hl": [
     "project"
    ],
    "at": 8.148
   },
   {
    "t": "If Hugging Face is refused, the model can come from GitHub, which is this box.",
    "hl": [
     "github",
     "a-gh-say"
    ],
    "at": 12.948
   },
   {
    "t": "It could also be packed inside the skill.",
    "hl": [
     "skill"
    ],
    "at": 18.484
   },
   {
    "t": "If the app does not play the sound file, Claude can put a small player inside its reply.",
    "hl": [
     "artifact"
    ],
    "at": 21.236
   },
   {
    "t": "That is this button in the chat.",
    "hl": [
     "artifact"
    ],
    "at": 26.647
   },
   {
    "t": "If neither plays inside the app, this route is closed.",
    "hl": [
     "player",
     "artifact"
    ],
    "at": 28.958
   }
  ],
  "seconds": 33.892,
  "audio": "audio/05-fallbacks.wav"
 },
 {
  "id": "delay",
  "title": "The delay",
  "show": [
   "phone",
   "app",
   "chip-spell",
   "chip-say",
   "sandbox",
   "skill",
   "sayjs",
   "wav",
   "player",
   "a-phone-sandbox",
   "a-wav-phone"
  ],
  "cards": [
   "first reply in a chat: about 30 to 60 seconds",
   "set up the sandbox, install packages, load the model, make the sound"
  ],
  "steps": [
   {
    "t": "Each reply also takes time to prepare.",
    "hl": [
     "a-phone-sandbox",
     "a-wav-phone"
    ],
    "at": 0.567
   },
   {
    "t": "This clock shows the cost.",
    "hl": [
     "clock"
    ],
    "at": 3.433
   },
   {
    "t": "The first reply in a chat may take thirty seconds to one minute.",
    "hl": [
     "clock"
    ],
    "at": 5.812
   }
  ],
  "seconds": 10.499,
  "audio": "audio/06-delay.wav"
 },
 {
  "id": "rejected",
  "title": "Routes ruled out",
  "show": [
   "phone",
   "app",
   "chip-spell",
   "chip-say"
  ],
  "cards": [
   "Remote Control: the sound plays from the laptop ✗",
   "voice page in the phone browser: a web page ✗",
   "own voice chat: a web page, with its own bill ✗"
  ],
  "steps": [
   {
    "t": "I also looked at other routes, and these are the ones I ruled out.",
    "hl": [
     "cards"
    ],
    "at": 0.567
   },
   {
    "t": "This arrow is Remote Control, from the phone to your laptop.",
    "hl": [
     "a-phone-laptop",
     "laptop"
    ],
    "at": 4.4
   },
   {
    "t": "It works, but the sound plays from the laptop.",
    "hl": [
     "laptop",
     "x-laptop"
    ],
    "at": 8.192
   },
   {
    "t": "This box is your voice page, in the phone browser.",
    "hl": [
     "browser",
     "a-phone-browser"
    ],
    "at": 11.19
   },
   {
    "t": "It also works, but you asked for no web pages.",
    "hl": [
     "browser",
     "x-browser"
    ],
    "at": 14.612
   },
   {
    "t": "A separate voice chat of our own would also be a web page, with its own bill.",
    "hl": [
     "cards"
    ],
    "at": 17.933
   }
  ],
  "seconds": 23.156,
  "audio": "audio/07-rejected.wav"
 },
 {
  "id": "voicemode",
  "title": "Voice mode, later",
  "show": [
   "phone",
   "app",
   "chip-voice",
   "chip-spell",
   "chip-say"
  ],
  "cards": [
   "JamesDSP: effects on other apps' sound (Android)",
   "our effect as a Liveprog script",
   "unknown: can it reach Claude's voice?"
  ],
  "steps": [
   {
    "t": "Voice mode comes later.",
    "hl": [
     "chip-voice"
    ],
    "at": 0.567
   },
   {
    "t": "This box inside the phone is an Android sound effect app, called James D S P.",
    "hl": [
     "jdsp"
    ],
    "at": 2.644
   },
   {
    "t": "It can change the sound of other apps, on the way to this speaker.",
    "hl": [
     "jdsp",
     "speaker",
     "a-jdsp-speaker"
    ],
    "at": 8.297
   },
   {
    "t": "It could put the Adjutant effect on the Claude app's own voice.",
    "hl": [
     "chip-voice",
     "a-voice-jdsp",
     "jdsp"
    ],
    "at": 12.247
   },
   {
    "t": "So you would stay inside the app.",
    "hl": [
     "app"
    ],
    "at": 16.203
   },
   {
    "t": "It is not yet known whether it can reach Claude's voice.",
    "hl": [
     "jdsp",
     "cards"
    ],
    "at": 18.361
   }
  ],
  "seconds": 22.266,
  "audio": "audio/08-voicemode.wav"
 },
 {
  "id": "next",
  "title": "Next step: one test on the phone",
  "show": [
   "phone",
   "app",
   "chip-spell",
   "chip-say",
   "sandbox",
   "sayjs",
   "wav",
   "a-npm-say",
   "a-hf-say",
   "a-say-wav"
  ],
  "cards": [
   "☐ package site reachable",
   "☐ Hugging Face reachable",
   "☐ beep plays from a file",
   "☐ beep plays from a player in the reply",
   "☐ Skills under Settings → Capabilities"
  ],
  "steps": [
   {
    "t": "The next step is one test in the Claude app on your phone.",
    "hl": [
     "app"
    ],
    "at": 0.567
   },
   {
    "t": "The message to paste is in the chat on screen.",
    "hl": [
     "app"
    ],
    "at": 4.08
   },
   {
    "t": "It checks these two download sites.",
    "hl": [
     "npm",
     "hf"
    ],
    "at": 7.253
   },
   {
    "t": "Then it plays a short beep from a file, and from a player in the reply.",
    "hl": [
     "player",
     "artifact",
     "a-wav-phone"
    ],
    "at": 9.877
   },
   {
    "t": "These are the five checks, on the right.",
    "hl": [
     "cards"
    ],
    "at": 13.895
   },
   {
    "t": "Please also check whether skills appear in the app settings, under capabilities.",
    "hl": [
     "cards"
    ],
    "at": 16.341
   },
   {
    "t": "End of briefing.",
    "hl": [],
    "at": 21.682
   }
  ],
  "seconds": 23.975,
  "audio": "audio/09-next.wav"
 }
];
