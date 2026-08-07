import re

with open('src/modules/ai/validator/validator.service.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Map all types
def repl_type(m):
    val = m.group(1)
    mapping = {
        'missing-generated-project': 'missing-file',
        'empty-project': 'missing-file',
        'missing-commands': 'contract',
        'duplicate-path': 'unexpected-file',
        'empty-file': 'contract',
        'invalid-structure': 'contract',
        'missing-root-file': 'missing-file',
        'invalid-root-component': 'contract',
        'missing-planned-file': 'missing-file',
        'unplanned-file': 'unexpected-file',
        'missing-export': 'export',
        'missing-import-target': 'import',
        'missing-imported-symbol': 'import'
    }
    new_type = mapping.get(val, val)
    return f'type: "{new_type}"'

content = re.sub(r'id:\s*"([^"]+)"', repl_type, content)
content = re.sub(r'type:\s*"([^"]+)"', repl_type, content)

# 2. Add owner: "AI" to all issues.push
content = re.sub(r'(severity:\s*"[^"]+",)', r'\1\n          owner: "AI",', content)

# 3. Fix missing imports
if 'workspaceService' not in content[:500]:
    content = 'import * as workspaceService from "../../runtime/workspace.service.js";\nimport * as filesystemService from "../../runtime/filesystem.service.js";\nimport * as path from "node:path";\nimport fs from "node:fs/promises";\n' + content

with open('src/modules/ai/validator/validator.service.ts', 'w', encoding='utf-8') as f:
    f.write(content)
