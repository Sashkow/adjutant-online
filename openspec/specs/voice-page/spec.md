# voice-page Specification

## Purpose
The single page where a visitor types text and hears it in the Adjutant voice: speak and stop, status, limits, canned lines, advanced settings, WAV download, shareable links, errors, fan-tool identity and a desktop-first layout.

## Requirements
### Requirement: Type and speak
The page SHALL provide a text field and a speak control that plays the entered text in the processed voice.

#### Scenario: Speak typed text
- **WHEN** the visitor types text and activates the speak control
- **THEN** the text is synthesised and played through the effect chain

#### Scenario: Keyboard shortcut
- **WHEN** the text field is focused and the visitor presses Ctrl+Enter (Cmd+Enter on macOS)
- **THEN** the page behaves as if the speak control was activated

#### Scenario: Nothing to say
- **WHEN** the text field is empty or whitespace-only
- **THEN** the speak control is disabled

### Requirement: Stop and restart
The page SHALL let the visitor stop playback, and SHALL stop any current playback before starting a new one.

#### Scenario: Stop
- **WHEN** the visitor activates the stop control during playback
- **THEN** audio stops promptly

#### Scenario: Speak while already speaking
- **WHEN** the visitor requests speech while earlier speech is still playing
- **THEN** the earlier playback stops and only the new speech is heard

### Requirement: Status display
The page SHALL show what it is doing: model download progress, synthesising, playing, or idle.

#### Scenario: First-use download
- **WHEN** the model is downloading
- **THEN** the page shows a progress indicator with the fraction completed

#### Scenario: Synthesising
- **WHEN** synthesis is in progress
- **THEN** the page shows a busy state until audio starts

### Requirement: Character limit feedback
The page SHALL show the current character count against the 1,000-character limit and SHALL prevent speaking text over the limit.

#### Scenario: Over the limit
- **WHEN** the text exceeds 1,000 characters
- **THEN** the count is shown as over the limit and the speak control is disabled

### Requirement: Canned lines
The page SHALL offer several pre-written lines. They are original text, except for one short quotation from the game's opening briefing included at the owner's request.

#### Scenario: Choose a canned line
- **WHEN** the visitor selects a canned line
- **THEN** the text field is filled with that line and it is spoken

### Requirement: Advanced settings drawer
The page SHALL provide a drawer, closed by default, with a labelled control for each effect and delivery parameter and a reset control.

#### Scenario: Drawer closed by default
- **WHEN** the page is opened without settings in the URL
- **THEN** the advanced drawer is closed and the default preset is in use

#### Scenario: Adjust a parameter
- **WHEN** the visitor changes a control in the drawer
- **THEN** the new value is used for current and subsequent playback

#### Scenario: Reset
- **WHEN** the visitor activates the reset control
- **THEN** all parameters return to the default preset

### Requirement: WAV download
The page SHALL let the visitor download the processed speech for the current text and settings as a WAV file.

#### Scenario: Download
- **WHEN** the visitor activates the download control with valid text
- **THEN** the browser saves a WAV file containing the processed speech for the current text and settings

#### Scenario: Download without prior playback
- **WHEN** the visitor activates the download control before ever pressing speak
- **THEN** the page synthesises the text and then provides the file

### Requirement: Shareable link
The page SHALL keep the current text and any non-default settings in the URL fragment, and SHALL restore them when a link is opened.

#### Scenario: URL reflects state
- **WHEN** the visitor edits the text or changes a setting
- **THEN** the URL fragment is updated to represent the text and the settings that differ from the default preset

#### Scenario: Open a shared link
- **WHEN** a link containing text and settings is opened
- **THEN** the text field and settings are restored from the link
- **AND** audio does not play until the visitor activates the speak control

#### Scenario: Malformed link
- **WHEN** the URL fragment cannot be parsed
- **THEN** the page loads with empty text and the default preset, without an error

### Requirement: Error display
The page SHALL show a readable message when the model cannot be loaded, synthesis fails, or the browser lacks a required feature.

#### Scenario: Unsupported browser
- **WHEN** the browser lacks WebAssembly, Web Workers or Web Audio
- **THEN** the page shows a message saying it cannot run in this browser and disables the speak control

#### Scenario: Recoverable failure
- **WHEN** model loading or synthesis fails
- **THEN** the page shows the failure and the visitor can try again

### Requirement: Fan-tool identity
The page SHALL state that it is an unofficial fan tool not affiliated with the game's publisher, and SHALL NOT use the publisher's artwork or logos.

#### Scenario: Notice visible
- **WHEN** the page is viewed
- **THEN** a non-affiliation notice is present on the page

### Requirement: Desktop-first layout
The page SHALL be fully usable in current desktop Chrome, Firefox and Safari, and SHALL remain readable without horizontal scrolling on a phone-width screen.

#### Scenario: Narrow screen
- **WHEN** the page is viewed at 375 px width
- **THEN** all controls are reachable and the page does not scroll horizontally
