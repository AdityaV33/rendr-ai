import re

with open('src/modules/ai/validator/validator.service.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix commas
content = content.replace(',,', ',')
content = content.replace('",\nfile: "unknown"', '",\nfile: "unknown"')
content = content.replace('`,\nfile: "unknown"', '`,\nfile: "unknown"')
content = content.replace('),\nfile: "unknown"', ',\nfile: "unknown"')
content = content.replace('}\n,\nfile: "unknown"', ',\nfile: "unknown"')
content = content.replace('",\nfile: "unknown"', '",\nfile: "unknown"')

# Wait, if there was `message: "...",\nfile: "unknown"` it's fine.
# But what about `message: "..."\n,\nfile:` ?
# Let's just fix the syntax error directly by running a regex to ensure valid object syntax.
# The errors are at 93, 143, 172, 296
content = re.sub(r'message:\s*("[^"]*"),\s*,', r'message: \1,', content)
content = re.sub(r'message:\s*(`[^`]*`),\s*,', r'message: \1,', content)
content = re.sub(r'message:\s*("[^"]*")\s*,\nfile: "unknown"', r'message: \1,\nfile: "unknown"', content)
content = re.sub(r'message:\s*(`[^`]*`)\s*,\nfile: "unknown"', r'message: \1,\nfile: "unknown"', content)

with open('src/modules/ai/validator/validator.service.ts', 'w', encoding='utf-8') as f:
    f.write(content)
