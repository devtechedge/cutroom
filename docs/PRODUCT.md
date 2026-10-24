# Product notes

CUTROOM is a storyboard and visual narrative studio that runs entirely in the browser. This document records the product position, the audience, the signals we watch, and the commercial hypothesis. It is a working note, not a promise of future features.

## Position

> Storyboard the cut before you shoot it.

CUTROOM sits between a blank document and a production tool. It is more structured than drawing frames in a slide deck, and lighter than a full pre-production suite. The promise is a readable sequence: frame composition, shot rhythm, a playable preview, and a contact sheet someone else can follow.

Three properties define the product:

1. **Local first.** Boards and images live in the browser. There is no account and no telemetry.
2. **Portable output.** PNG, SVG, print/PDF and project JSON all come from one rendering source.
3. **Fast to a first board.** A template, a few objects and one export should fit in a single sitting.

## Audience

| Audience | Job to be done | What good looks like |
| --- | --- | --- |
| Filmmakers and directors | Block a scene before the scout or shoot | Shot type, hold and framing notes survive export |
| Product and marketing teams | Turn a launch brief into a social cut | Five readable beats exported without design tools |
| Teachers and explainers | Plan a lesson as a sequence | Captions double as the spoken script |
| Game and motion teams | Pitch a cinematic or UI beat | The team reviews the same board language |

The common thread is a person who needs to explain a sequence to someone else, not a person who needs a finished animation.

## Jobs and flow

1. Start from a template or a blank board.
2. Compose a frame with images, shapes, text and artwork.
3. Set hold, shot type and transition; reorder on the timeline.
4. Preview the cut.
5. Export a contact sheet, PDF, frame PNG or project JSON.
6. Back up the library and restore it when moving machines.

The critical activation moment is the first export that another person can read. Everything before export is setup.

## Success signals

CUTROOM does not collect telemetry today, so there is no dashboard of usage. Product decisions use:

- **Voluntary reports:** GitHub issues, feedback issues and security advisories.
- **Usability sessions:** five to eight observed sessions per release, with a first-board task and a share-the-sheet task.
- **Export completion:** in a session, whether the participant reaches a contact sheet or PDF without help.
- **Return signal:** whether a design partner opens the tool again for a second project within two weeks.
- **Restore confidence:** whether a participant can move a board to a second browser using backup and restore.

If opt-in analytics are added later, the proposed north-star metric is **boards exported per active editor per week**, with activation defined as **first export within ten minutes of first open**. That is a hypothesis, not current behavior.

## Pricing hypothesis

The local core stays free and MIT licensed. A paid plan should sell coordination, not composition.

| Plan | Hypothesis | Guardrail |
| --- | --- | --- |
| Local | Free forever: compose, preview, export, backup | No export paywall, no account required |
| Team sync | $6 to $10 per editor per month, 14-day trial | Local export remains possible without a subscription |
| Studio | Annual contract with SSO and shared brand assets | Only after sync and permissions are proven |

Willingness to pay should be tested with design partners before any billing code is written. The first paid feature should be shared review links with expiry, not storage quotas.

## Design partners

Target five partners for the next phase:

- Two film or commercial directors who already storyboard on paper or in slides.
- Two product or marketing teams who ship launch videos.
- One teacher or curriculum designer who plans visual lessons.

Session format: 30 minutes, screen share, participant drives. Ask them to bring a real brief. Observe the first board and one export. Do not demo every feature.

Success criteria for the partner phase:

- Three of five partners use CUTROOM on a second real project within two weeks.
- Four of five can explain the exported sheet without a call.
- At least two partners ask for a shared review link, which validates the roadmap order.

## Template library

The four starter boards are intentional templates, not sample data:

- **Night Shift:** a six-beat short film with a night exterior and a dissolve ending.
- **Fieldnote One:** a five-frame product launch for a social cut.
- **How Seeds Travel:** a lesson explainer with a class prompt.
- **Last Light:** a game cinematic with a single-frame flash.

Templates should teach a rhythm, not just fill a canvas. New templates need a distinct running time, aspect ratio or review context before they are added.

## Non-goals

- A full non-linear editor, VFX tool or animation runtime.
- A stock asset marketplace.
- A social network or public feed of boards.
- Default telemetry or an account wall in front of local composition.
