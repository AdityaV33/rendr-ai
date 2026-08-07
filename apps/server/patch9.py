import re

with open('src/modules/ai/validator/validator.service.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix Missing Imported Files (line 296)
content = content.replace(
    '''              message: "Imported file does not exist.",
file: "unknown",
repairStrategy: "modify-file"
});''',
    '''              message: `Imported file '${targetPath}' does not exist (in '${normalizedPath}').`,
              file: normalizedPath,
              repairStrategy: "modify-file"
            });'''
)

# Wait, let's also fix the imported symbol error if it was mangled
# Let's search for any remaining 'file: "unknown"'
if 'file: "unknown"' in content:
    # Let's see what is left
    pass

# We will just write the file out and then grep for "unknown"
with open('src/modules/ai/validator/validator.service.ts', 'w', encoding='utf-8') as f:
    f.write(content)
