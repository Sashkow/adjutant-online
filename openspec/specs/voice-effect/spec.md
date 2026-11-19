# voice-effect Specification

## Purpose
The Adjutant voice effect: a parameterised effect chain with a default preset and bounds, live parameter changes, offline rendering that matches playback, safe output level, pitch shift and intro tone, with no game audio.

## Requirements
### Requirement: Parameterised effect chain
The system SHALL process speech audio through an effect chain comprising band-limiting, tone shaping, metallic doubling, echo, room reverb, radio link, comb resonance, ring modulation, compression and grit, each controlled by named numeric parameters.

#### Scenario: Chain applied to speech
- **WHEN** speech audio is played through the effect chain with the default preset
- **THEN** the output is audibly processed and differs from the input

#### Scenario: Stage disabled by its parameter
- **WHEN** a stage's amount parameter is set to zero
- **THEN** that stage has no audible effect on the output

### Requirement: Default preset
The system SHALL provide one default preset, stored as data, that defines a value for every effect parameter.

#### Scenario: Default applied on first use
- **WHEN** the visitor has changed no settings
- **THEN** the effect chain uses the default preset values

#### Scenario: Preset is complete
- **WHEN** the default preset is loaded
- **THEN** every parameter the chain accepts has a value within that parameter's allowed range

### Requirement: Parameter bounds
The system SHALL define a minimum and maximum for every parameter and SHALL clamp out-of-range values to those bounds.

#### Scenario: Out-of-range value
- **WHEN** a parameter is set above its maximum
- **THEN** the chain uses the maximum value

### Requirement: Live parameter changes
The system SHALL apply parameter changes to audio that is currently playing, without restarting playback.

#### Scenario: Slider moved during playback
- **WHEN** a parameter is changed while speech is playing
- **THEN** the change is audible in the remainder of that playback

### Requirement: Offline rendering matches playback
The system SHALL be able to render the processed audio to a buffer faster than real time, using the same chain and parameters as live playback.

#### Scenario: Rendered output matches what was heard
- **WHEN** the same speech and parameters are played live and rendered offline
- **THEN** the rendered audio sounds the same as the live playback

#### Scenario: Effect tail is preserved
- **WHEN** speech is rendered offline
- **THEN** the rendered buffer is long enough to include the decay of delay-based stages after the speech ends

### Requirement: Output level safety
The system SHALL keep the processed output from clipping across the full allowed range of every parameter.

#### Scenario: Extreme settings
- **WHEN** all parameters are set to their maximum values
- **THEN** the output does not exceed full scale

### Requirement: Pitch shift
The system SHALL be able to shift the pitch of the speech by a configurable number of semitones without changing its duration and without shifting its vocal-tract resonances, so the voice keeps its adult character.

#### Scenario: Pitch raised
- **WHEN** the pitch parameter is raised
- **THEN** the speech sounds higher and its duration is unchanged within a few percent

#### Scenario: Voice character kept
- **WHEN** the pitch parameter is raised and the voice-size parameter is zero
- **THEN** the spectral envelope of the speech is not shifted along the frequency axis

### Requirement: Intro tone
The system SHALL be able to place a short synthesised tone before the speech at a configurable level, and SHALL generate that tone from code, not from a recording.

#### Scenario: Intro enabled
- **WHEN** the intro level is above zero
- **THEN** playback and the downloaded file begin with the tone, followed by a brief silence, followed by the speech

#### Scenario: Intro disabled
- **WHEN** the intro level is zero
- **THEN** playback begins directly with the speech

### Requirement: No game audio
The system SHALL NOT include, bundle or serve any audio from the game.

#### Scenario: Built site contents
- **WHEN** the built site is inspected
- **THEN** it contains no game audio files
