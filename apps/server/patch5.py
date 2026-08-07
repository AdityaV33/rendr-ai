import re

with open('src/modules/ai/validator/validator.service.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix imports
if 'import * as workspaceService' not in content[:500]:
    content = 'import * as workspaceService from "../../runtime/workspace.service.js";\nimport * as filesystemService from "../../runtime/filesystem.service.js";\nimport * as path from "node:path";\nimport fs from "node:fs/promises";\n' + content
elif 'import * as filesystemService' not in content[:500]:
    content = content.replace(
        'import * as workspaceService from "../../runtime/workspace.service.js";',
        'import * as workspaceService from "../../runtime/workspace.service.js";\nimport * as filesystemService from "../../runtime/filesystem.service.js";\nimport * as path from "node:path";\nimport fs from "node:fs/promises";'
    )

# Replace all incomplete issues.push objects
content = re.sub(
    r'(issues\.push\(\{\s*type:\s*"[^"]+",\s*severity:\s*"(?:error|critical|warning|info)",\s*owner:\s*"AI",\s*message:\s*`[^`]*?`\s*\}\))',
    lambda m: m.group(1).replace('type:', 'file: "unknown",\nrepairStrategy: "modify-file",\ntype:'),
    content
)
content = re.sub(
    r'(issues\.push\(\{\s*type:\s*"[^"]+",\s*severity:\s*"(?:error|critical|warning|info)",\s*owner:\s*"AI",\s*message:\s*"[^"]*?"\s*\}\))',
    lambda m: m.group(1).replace('type:', 'file: "unknown",\nrepairStrategy: "modify-file",\ntype:'),
    content
)

# Replace normalizedPath that is out of scope
content = content.replace('file: normalizedPath,', 'file: "unknown",')

with open('src/modules/ai/validator/validator.service.ts', 'w', encoding='utf-8') as f:
    f.write(content)
