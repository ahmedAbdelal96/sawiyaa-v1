# Arabic Copy Policy

This project treats Arabic copy as source content, not terminal output.

Rules:
- Always write Arabic as UTF-8 text in files.
- Never trust terminal rendering for Arabic validation.
- Never use `?`, `??`, or emoji as placeholders in Arabic copy.
- Never use mojibake as a fallback.
- If text is corrupted, repair the source file directly.
- If a string cannot be recovered automatically, rewrite it manually.
- Validate translation files by reading the JSON source, not by reading console output.

Recommended workflow:
1. Edit Arabic files with UTF-8-safe writes.
2. Run the Arabic copy repair script for mojibake recovery.
3. Run i18n validation against all namespaces.
4. Re-read the source file or parse it from disk to confirm the final text.

