# Log security

Recording is off by default. Masking rules apply only to `data`. You can specify keys and paths within it in the global settings and for individual packages. Do not log secrets, tokens, or personal data even with masking configured. In particular, rules for `data` do not protect top-level record fields such as `event`.

Choose a directory with appropriate access permissions. The file limit caps log size but does not replace access controls.

[Russian](Security.md)
