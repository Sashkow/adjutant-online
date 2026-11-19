## ADDED Requirements

### Requirement: In-browser synthesis
The system SHALL convert typed text into speech audio entirely within the visitor's browser, without sending the text to any server.

#### Scenario: Text is synthesised locally
- **WHEN** the visitor requests speech for non-empty text and the voice model is loaded
- **THEN** the system produces mono speech audio samples and their sample rate for that text
- **AND** no network request containing the text is made

### Requirement: Synthesis off the main thread
The system SHALL perform synthesis in a background worker so the page stays responsive.

#### Scenario: Page remains usable during synthesis
- **WHEN** synthesis is in progress
- **THEN** the visitor can still scroll, edit the text and operate controls

### Requirement: Deferred model loading with progress
The system SHALL NOT download the voice model until the visitor first requests speech, and SHALL report download progress while it loads.

#### Scenario: Page load does not fetch the model
- **WHEN** the page is opened and no speech has been requested
- **THEN** the voice model has not been downloaded

#### Scenario: Progress is reported on first use
- **WHEN** the visitor requests speech for the first time
- **THEN** the system reports model download progress until the model is ready
- **AND** then synthesises the requested text without a second request from the visitor

### Requirement: Model caching
The system SHALL cache the voice model in the browser so later visits do not download it again.

#### Scenario: Return visit
- **WHEN** a visitor who previously loaded the model requests speech on a later visit
- **THEN** the model is loaded from the browser cache without re-downloading it

### Requirement: Delivery shaping
The system SHALL synthesise text sentence by sentence and join the results with a configurable silence gap, and SHALL apply a configurable speaking rate.

#### Scenario: Pause between sentences
- **WHEN** text containing two sentences is synthesised with a sentence gap of 400 ms
- **THEN** the output contains 400 ms of silence between the two sentences

#### Scenario: Speaking rate
- **WHEN** the same text is synthesised at a lower speaking rate
- **THEN** the resulting speech is longer in duration

### Requirement: Input limits
The system SHALL reject empty or whitespace-only text and SHALL reject text longer than 1,000 characters.

#### Scenario: Empty text
- **WHEN** speech is requested for empty or whitespace-only text
- **THEN** no synthesis is started

#### Scenario: Over-long text
- **WHEN** speech is requested for text longer than 1,000 characters
- **THEN** no synthesis is started and the limit is reported

### Requirement: Failure reporting
The system SHALL report model loading and synthesis failures to the caller instead of failing silently.

#### Scenario: Model download fails
- **WHEN** the model download fails
- **THEN** the system reports an error and a later request retries the download

### Requirement: Stock voice only
The system SHALL use only a publicly distributed stock voice and SHALL NOT use a voice derived from recordings of the game or its voice actress.

#### Scenario: Voice provenance
- **WHEN** the shipped voice model is inspected
- **THEN** it is an unmodified, publicly distributed stock voice for the chosen engine
