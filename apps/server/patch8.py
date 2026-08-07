import re

with open('src/modules/ai/validator/validator.service.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Duplicate File Paths (line 109)
content = re.sub(
    r'(// Duplicate File Paths[\s\S]*?issues\.push\(\{\s*)file: "unknown"(,\s*repairStrategy: "modify-file",\s*type: "unexpected-file",\s*severity: "error",\s*owner: "AI",\s*message: `File path \'\$\{path\}\' was generated multiple times\.`,)',
    r'\1file: path\2',
    content
)

# Empty Files (line 125)
content = re.sub(
    r'(// Empty Files[\s\S]*?issues\.push\(\{\s*)file: "unknown"(,\s*repairStrategy: "modify-file",\s*type: "contract",\s*severity: "error",\s*owner: "AI",\s*message: `Generated file \'\$\{normalizedPath\}\' is empty\.`,)',
    r'\1file: normalizedPath\2',
    content
)

# Invalid Structure (line 144) -> this uses file: "unknown" but let's change to "src"
content = re.sub(
    r'(// Invalid Structure[\s\S]*?issues\.push\(\{\s*type: "contract",\s*severity: "critical",\s*owner: "AI",\s*message: "Project structure is invaltype: missing \'src\' directory\.",\s*)file: "unknown"',
    r'\1file: "src"',
    content
)

# Root Component Missing (line 155)
content = re.sub(
    r'(// Root Component Presence[\s\S]*?issues\.push\(\{\s*)file: "unknown"(,\s*repairStrategy: "modify-file",\s*type: "missing-file",\s*severity: "critical",\s*owner: "AI",\s*message: `Required root file \'\$\{root\}\' is missing\.`,)',
    r'\1file: root\2',
    content
)

# Root Component missing App export (line 173)
content = re.sub(
    r'(issues\.push\(\{\s*type: "contract",\s*severity: "error",\s*owner: "AI",\s*message: "src/App\.tsx does not appear to contain a valid exported \'App\' component\.",\s*)file: "unknown"',
    r'\1file: root',
    content
)

# Missing Planned Files (line 189)
content = re.sub(
    r'(// Missing Planned Files[\s\S]*?issues\.push\(\{\s*)file: "unknown"(,\s*repairStrategy: "modify-file",\s*type: "missing-file",\s*severity: "error",\s*owner: "AI",\s*message: `File \'\$\{path\}\' was declared in the architecture plan but not generated\.`,)',
    r'\1file: path\2',
    content
)

# Unplanned Files (line 205)
content = re.sub(
    r'(// Unplanned Files[\s\S]*?issues\.push\(\{\s*)file: "unknown"(,\s*repairStrategy: "modify-file",\s*type: "unexpected-file",\s*severity: "warning",\s*owner: "AI",\s*message: `File \'\$\{normalizedPath\}\' was generated but not declared in the architecture plan\.`,)',
    r'\1file: normalizedPath\2',
    content
)

# Missing Component Exports (line 227)
content = re.sub(
    r'(// Missing Component Exports[\s\S]*?issues\.push\(\{\s*)file: "unknown"(,\s*repairStrategy: "modify-file",\s*type: "export",\s*severity: "error",\s*owner: "AI",\s*message: `Component, hook, or context file \'\$\{normalizedPath\}\' does not export anything\.`,)',
    r'\1file: normalizedPath\2',
    content
)

with open('src/modules/ai/validator/validator.service.ts', 'w', encoding='utf-8') as f:
    f.write(content)
