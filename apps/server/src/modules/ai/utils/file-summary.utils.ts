export function generateFileSummary(path: string, content: string): string {
  if (!content) return `${path} (EMPTY)`;

  const lines = content.split(/\r?\n/);
  const size = lines.length;
  
  const imports: string[] = [];
  const exports: string[] = [];
  const functions: string[] = [];
  const classes: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Naive import matching
    if (line.startsWith("import ")) {
      imports.push(line);
      continue;
    }
    
    // Exports
    if (line.startsWith("export default ")) {
      exports.push(line);
      continue;
    }
    const exportMatch = line.match(/^export\s+(const|function|class|interface|type)\s+([a-zA-Z0-9_]+)/);
    if (exportMatch) {
      exports.push(`export ${exportMatch[1]} ${exportMatch[2]}`);
    } else if (line.startsWith("export {") || line.startsWith("export {")) {
        // Just note it has named exports block
        exports.push("export { ... }");
    }

    // Top-level functions (non-exported)
    const funcMatch = line.match(/^function\s+([a-zA-Z0-9_]+)/);
    if (funcMatch) {
      functions.push(`function ${funcMatch[1]}`);
    }
    
    // Top-level classes (non-exported)
    const classMatch = line.match(/^class\s+([a-zA-Z0-9_]+)/);
    if (classMatch) {
      classes.push(`class ${classMatch[1]}`);
    }
  }

  let summary = `### ${path} (${size} lines)\n`;
  
  if (imports.length > 0) {
    // Only show first 5 imports to keep it small
    const displayImports = imports.slice(0, 5);
    summary += `Imports:\n${displayImports.map(i => `  - ${i}`).join('\n')}\n`;
    if (imports.length > 5) summary += `  - ... (${imports.length - 5} more)\n`;
  }
  
  if (exports.length > 0) {
    summary += `Exports:\n${exports.map(e => `  - ${e}`).join('\n')}\n`;
  }
  
  if (functions.length > 0) {
    const displayFuncs = functions.slice(0, 5);
    summary += `Functions:\n${displayFuncs.map(f => `  - ${f}`).join('\n')}\n`;
    if (functions.length > 5) summary += `  - ... (${functions.length - 5} more)\n`;
  }
  
  if (classes.length > 0) {
    summary += `Classes:\n${classes.map(c => `  - ${c}`).join('\n')}\n`;
  }
  
  if (imports.length === 0 && exports.length === 0 && functions.length === 0 && classes.length === 0) {
    summary += `(No identifiable imports/exports/functions)\n`;
  }

  return summary;
}
