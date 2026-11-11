---
description: Standard file encoding (UTF-8 without BOM) and LF line endings across all packages and scripts.
---

# File Encoding and Line Endings

- Save all source, configuration, test, and documentation files in `UTF-8` without BOM (`0xEF 0xBB 0xBF` is forbidden).
- Use `LF` (`\n`) line endings in all files across the repository (enforced by `.editorconfig`, `.gitattributes`, and Biome).
- Do not introduce `CRLF` (`\r\n`) or BOM headers when generating or editing files.
