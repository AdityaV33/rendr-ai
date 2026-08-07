import re

with open('src/modules/ai/validator/validator.service.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix listAllFiles to just not do deep recursive because we only generated paths at the root or just use a local function
content = content.replace(
    'const files = await filesystemService.listAllFiles(fullPath);',
    '''async function getFiles(dir: string): Promise<string[]> {
                const dirents = await fs.readdir(dir, { withFileTypes: true });
                const files = await Promise.all(dirents.map((dirent) => {
                  const res = path.resolve(dir, dirent.name);
                  return dirent.isDirectory() ? getFiles(res) : res;
                }));
                return Array.prototype.concat(...files);
              }
              const files = await getFiles(fullPath) as string[];'''
)

# Fix remaining TS issues
# Find issues.push that don't have repairStrategy
content = re.sub(
    r'(issues\.push\(\{\s*type:\s*"[^"]+",\s*severity:\s*"(?:error|critical|warning|info)",\s*owner:\s*"AI",\s*message:\s*[^}]*?)\s*\}\)',
    lambda m: m.group(1) + '}' if 'repairStrategy' in m.group(1) else m.group(1) + ',\nfile: "unknown",\nrepairStrategy: "modify-file"\n})',
    content
)

with open('src/modules/ai/validator/validator.service.ts', 'w', encoding='utf-8') as f:
    f.write(content)
