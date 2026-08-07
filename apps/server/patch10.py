import re

with open('src/modules/ai/validator/validator.service.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix Missing Imported Symbols (line 369)
content = content.replace(
    '''                  file: "unknown",
repairStrategy: "modify-file",
type: "import",
                  severity: "error",
          owner: "AI",
                  message: `Imported symbol '${requestedSymbol}' does not exist in ${matchedTargetFile.path}`,''',
    '''                  file: normalizedPath,
                  repairStrategy: "modify-file",
                  type: "import",
                  severity: "error",
                  owner: "AI",
                  message: `Imported symbol '${requestedSymbol}' does not exist in ${matchedTargetFile.path}`,'''
)

with open('src/modules/ai/validator/validator.service.ts', 'w', encoding='utf-8') as f:
    f.write(content)
