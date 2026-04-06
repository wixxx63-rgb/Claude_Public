Narrative Flow v2.0.1 — Windows Portable Build
================================================

The ZIP file has been split into 3 parts due to GitHub file size limits.
Reassemble before extracting:

  Windows (Command Prompt):
    copy /b NarrativeFlow-v2.0.1-win.zip.partaa + NarrativeFlow-v2.0.1-win.zip.partab + NarrativeFlow-v2.0.1-win.zip.partac NarrativeFlow-v2.0.1-win.zip

  Linux / macOS:
    cat NarrativeFlow-v2.0.1-win.zip.part* > NarrativeFlow-v2.0.1-win.zip

Then extract the ZIP and run:
    Narrative Flow.exe

No installation required — fully portable.

What's new in v2.0.1:
  - Fixed CharacterManager blank rendering (CSS class conflict fully resolved)
  - Defensive normalization for old project files (missing fields no longer crash)
  - Set or change POV character on ANY existing scene from the detail panel
  - Remove POV designation from a scene
  - Remove incoming links (✕ button on incoming edges, same as outgoing)

What's new in v2.0.0:
  - POV (Point-of-View) node system
  - POV canvas filter per character
  - Play mode perspective selector
