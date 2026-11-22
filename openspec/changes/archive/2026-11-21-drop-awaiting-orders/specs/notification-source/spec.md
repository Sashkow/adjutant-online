## ADDED Requirements

### Requirement: A notification gets no closing phrase about orders
The rewording of a notification SHALL NOT add "Awaiting orders.", and SHALL NOT add another stock phrase in its place. When the original message says that the owner must decide or act, the reworded notification SHALL still say so in plain words.

#### Scenario: A statement that the owner must decide
- **WHEN** a notification's text is "There are two possible designs and I need you to choose."
- **THEN** the spoken notification says that there are two possible designs and that the owner needs to choose one, and does not contain "Awaiting orders."

#### Scenario: A notification that ends with a question
- **WHEN** a notification's text ends with a question for the owner
- **THEN** the question is the last thing spoken
