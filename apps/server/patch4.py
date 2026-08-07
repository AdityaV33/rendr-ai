import re

with open('src/modules/ai/validator/validator.service.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add missing file and repairStrategy
content = content.replace(
    '''        issues: [{
          type: "missing-file",
          severity: "critical",
          owner: "AI",
          message: "No generated project was found in the state.",
        }],''',
    '''        issues: [{
          type: "missing-file",
          file: "project",
          repairStrategy: "regenerate-file",
          severity: "critical",
          owner: "AI",
          message: "No generated project was found in the state.",
        }],'''
)

content = content.replace(
    '''        issues: [{
          type: "missing-file",
          severity: "critical",
          owner: "AI",
          message: "The generated project contains no files.",
        }],''',
    '''        issues: [{
          type: "missing-file",
          file: "project",
          repairStrategy: "regenerate-file",
          severity: "critical",
          owner: "AI",
          message: "The generated project contains no files.",
        }],'''
)

content = content.replace(
    '''      issues.push({
        type: "contract",
        severity: "critical",
        owner: "AI",
        message: "Generated project is missing required commands (install, build, dev).",
      });''',
    '''      issues.push({
        type: "contract",
        file: "package.json",
        repairStrategy: "modify-file",
        severity: "critical",
        owner: "AI",
        message: "Generated project is missing required commands (install, build, dev).",
      });'''
)

content = content.replace(
    '''      issues.push({
        type: "contract",
        severity: "critical",
        owner: "AI",
        message: "React projects must have a root component named 'App' that is exported.",
      });''',
    '''      issues.push({
        type: "contract",
        file: "src/App.tsx",
        repairStrategy: "modify-file",
        severity: "critical",
        owner: "AI",
        message: "React projects must have a root component named 'App' that is exported.",
      });'''
)

# Remove affectedFiles
content = re.sub(r'affectedFiles:\s*\[[^\]]*\],?', '', content)

# Remove duplicate paths missing file and repairStrategy
content = re.sub(
    r'(type:\s*"(?:unexpected-file|missing-file|contract|import|export)",\s*severity:\s*"(?:error|critical|warning|info)",\s*owner:\s*"AI",\s*message:\s*`[^`]+`)',
    r'file: normalizedPath,\nrepairStrategy: "modify-file",\n\1',
    content
)

# Wait, some didn't use `normalizedPath` for file?
# In validator.service.ts, they usually have `message` as the last property. Let's just blindly add file: "unknown" and repairStrategy: "modify-file" to any issues.push that doesn't have it.
# Actually I will just replace all `issues.push({` with `issues.push({ file: normalizedPath || "unknown", repairStrategy: "modify-file", `
# Let's be careful.

with open('src/modules/ai/validator/validator.service.ts', 'w', encoding='utf-8') as f:
    f.write(content)
