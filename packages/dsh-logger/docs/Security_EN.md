# Log security

Recording is off by default. Sanitization applies to `data`; keys and paths can be configured globally and per package. Do not log secrets, tokens, or personal data. In particular, keep them out of `event`, `phase`, and `operation`: those fields do not pass through the `data` sanitizer.

Choose a directory with appropriate access permissions. The file limit caps log size but does not replace access controls.

[Russian](Security.md)
