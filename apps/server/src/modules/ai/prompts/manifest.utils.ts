import type { ArchitecturePlan } from "../types/architecture-plan.types.js";
import type { ComponentContract } from "../context/context-builder.types.js";

export function buildArchitectureManifest(
  architecturePlan: ArchitecturePlan,
  allContracts: Record<string, Omit<ComponentContract, "description">>
): string {
  let manifest = `Available Architecture\n\n`;

  const files = architecturePlan.fileStructure.filter(f => f.type === "file");
  
  for (const file of files) {
    const parts = file.path.split('/');
    const fileName = parts[parts.length - 1];
    const name = fileName.replace(/\.[^/.]+$/, "");
    
    let type = "File";
    if (file.path.includes("/context/")) type = "Context";
    else if (file.path.includes("/hooks/")) type = "Hook";
    else if (file.path.includes("/components/")) type = "Component";
    else if (file.path.includes("/pages/") || file.path.includes("/views/")) type = "Page";
    else if (file.path.includes("/utils/") || file.path.includes("/lib/")) type = "Utility";
    else if (file.path.endsWith("App.tsx") || file.path.endsWith("main.tsx")) type = "Root";

    manifest += `${file.path}\n`;
    manifest += `Type: ${type}\n`;
    
    if (allContracts[name]) {
      const c = allContracts[name];
      if (c.importPath) {
        manifest += `Import: ${c.importPath}\n`;
      }
      const exportsList = c.exports && c.exports.length > 0
        ? c.exports.join(", ")
        : (c.exportType === "default" ? name : name);
      manifest += `Exports: ${exportsList} (${c.exportType})\n`;
      manifest += `Props: ${c.props.length > 0 ? c.props.map(p => p.name + (p.required ? "" : "?") + ": " + p.type).join(", ") : "None"}\n`;
      if (c.publicAPI && c.publicAPI.length > 0) {
        manifest += `Public API: ${c.publicAPI.join(", ")}\n`;
      }
    } else {
      manifest += `Exports: Unknown (infer from purpose)\n`;
    }

    manifest += `Purpose: ${file.purpose}\n`;

    if (file.allowedImports && file.allowedImports.length > 0) {
      manifest += `Allowed Imports: ${file.allowedImports.join(", ")}\n`;
    }



    manifest += `\n`;
  }

  const npmPackages = architecturePlan.dependencies.map(d => d.name);
  if (npmPackages.length > 0) {
    manifest += `Allowed npm packages:\n${npmPackages.join("\n")}\n\n`;
  }

  return manifest;
}
