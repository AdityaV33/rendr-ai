import type { ArchitecturePlan } from "../types/architecture-plan.types.js";

export class ArchitectureValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArchitectureValidationError";
  }
}

export function validateArchitectureIntegrity(plan: ArchitecturePlan): void {
  const filePaths = new Set<string>();
  const dirPaths = new Set<string>();
  const componentNames = new Set<string>();

  // 1. Check for Duplicate Paths and categorize files vs dirs
  for (const item of plan.fileStructure) {
    // Normalize path to prevent easy bypasses (e.g., ./src vs src)
    let normalizedPath = item.path.trim();
    if (normalizedPath.startsWith("./")) {
      normalizedPath = normalizedPath.slice(2);
    }
    
    if (filePaths.has(normalizedPath) || dirPaths.has(normalizedPath)) {
      throw new ArchitectureValidationError(`Duplicate path found in fileStructure: '${item.path}'. Paths must be unique.`);
    }

    if (item.type === "directory") {
      dirPaths.add(normalizedPath);
    } else {
      filePaths.add(normalizedPath);
    }
  }

  // 2. Check for File/Directory Collisions
  // A file cannot be a prefix (directory) for another path.
  for (const filePath of filePaths) {
    for (const otherPath of filePaths) {
      if (otherPath !== filePath && otherPath.startsWith(filePath + "/")) {
        throw new ArchitectureValidationError(`File/Directory collision detected: '${filePath}' is defined as a file, but another file '${otherPath}' treats it as a directory. Ensure '${filePath}' is a directory if it contains children, or rename the file.`);
      }
    }
    for (const dirPath of dirPaths) {
      if (dirPath.startsWith(filePath + "/")) {
        throw new ArchitectureValidationError(`File/Directory collision detected: '${filePath}' is defined as a file, but a directory '${dirPath}' is nested inside it. Ensure '${filePath}' is a directory if it contains children, or rename the file.`);
      }
    }
  }

  // 3. Check for Duplicate Component Names & Orphaned Contracts in ComponentContracts
  for (const contract of plan.componentContracts) {
    if (componentNames.has(contract.name)) {
      throw new ArchitectureValidationError(`Duplicate component name found: '${contract.name}'. Component names must be unique.`);
    }
    componentNames.add(contract.name);

    let normalizedImport = contract.importPath.trim();
    if (normalizedImport.startsWith("./")) {
      normalizedImport = normalizedImport.slice(2);
    }
    
    // Convert import path (e.g. src/components/Button) to a file path (e.g. src/components/Button.tsx)
    // We just check if there is ANY file in fileStructure that starts with the import path.
    const fileExists = Array.from(filePaths).some(fp => {
      // Allow exact match (if they included extension in importPath) or match without extension
      return fp === normalizedImport || 
             fp.startsWith(`${normalizedImport}.`) || 
             fp === `${normalizedImport}/index.ts` || 
             fp === `${normalizedImport}/index.tsx` || 
             fp === `${normalizedImport}/index.js` ||
             // Also accept if the file path ENDS with the normalized import (canonicalization)
             fp.endsWith(`/${normalizedImport}.ts`) ||
             fp.endsWith(`/${normalizedImport}.tsx`) ||
             fp.endsWith(`/${normalizedImport}.js`) ||
             fp.endsWith(`/${normalizedImport}/index.ts`) ||
             fp.endsWith(`/${normalizedImport}/index.tsx`) ||
             fp.endsWith(`/${normalizedImport}/index.js`) ||
             fp.endsWith(`/${normalizedImport}`);
    });

    if (!fileExists) {
      throw new ArchitectureValidationError(`Orphaned component contract: component '${contract.name}' references importPath '${contract.importPath}', but no matching file exists in fileStructure.`);
    }
  }

  // 4. Check for Orphaned Contracts in BehavioralContracts
  for (const contract of plan.behavioralContracts) {
    let normalizedFile = contract.file.trim();
    if (normalizedFile.startsWith("./")) {
      normalizedFile = normalizedFile.slice(2);
    }

    if (!filePaths.has(normalizedFile)) {
      const fileExists = Array.from(filePaths).some(fp => {
        return fp === normalizedFile || fp.endsWith(`/${normalizedFile}`);
      });
      if (!fileExists) {
        throw new ArchitectureValidationError(`Orphaned behavioral contract: references file '${contract.file}', but this exact file path does not exist in fileStructure as a file.`);
      }
    }
  }
}

/**
 * Attempts to deterministically resolve integrity errors without LLM intervention.
 * 1. Deduplicates file paths and component names.
 * 2. Normalizes importPaths that correspond to unambiguously unique files in the fileStructure.
 * Returns a new cloned ArchitecturePlan.
 */
export function repairArchitectureIntegrity(plan: ArchitecturePlan): ArchitecturePlan {
  const repaired = JSON.parse(JSON.stringify(plan)) as ArchitecturePlan;
  
  // 1. Deduplicate fileStructure (keep first)
  const uniquePaths = new Set<string>();
  repaired.fileStructure = repaired.fileStructure.filter(item => {
    let p = item.path.trim();
    if (p.startsWith("./")) p = p.slice(2);
    if (uniquePaths.has(p)) return false;
    uniquePaths.add(p);
    return true;
  });

  const filePaths = new Set<string>();
  for (const item of repaired.fileStructure) {
    if (item.type !== "directory") {
      let p = item.path.trim();
      if (p.startsWith("./")) p = p.slice(2);
      filePaths.add(p);
    }
  }

  // 2. Deduplicate componentContracts (keep first)
  const uniqueComponents = new Set<string>();
  repaired.componentContracts = repaired.componentContracts.filter(contract => {
    if (uniqueComponents.has(contract.name)) return false;
    uniqueComponents.add(contract.name);
    return true;
  });

  // 3. Resolve Orphaned componentContracts via path normalization
  for (const contract of repaired.componentContracts) {
    let normalizedImport = contract.importPath.trim();
    if (normalizedImport.startsWith("./")) normalizedImport = normalizedImport.slice(2);
    
    const fileExists = Array.from(filePaths).some(fp => {
      // Allow exact match (if they included extension in importPath) or match without extension
      return fp === normalizedImport || 
             fp.startsWith(`${normalizedImport}.`) || 
             fp === `${normalizedImport}/index.ts` || 
             fp === `${normalizedImport}/index.tsx` || 
             fp === `${normalizedImport}/index.js` ||
             // Also accept if the file path ENDS with the normalized import (canonicalization)
             fp.endsWith(`/${normalizedImport}.ts`) ||
             fp.endsWith(`/${normalizedImport}.tsx`) ||
             fp.endsWith(`/${normalizedImport}.js`) ||
             fp.endsWith(`/${normalizedImport}/index.ts`) ||
             fp.endsWith(`/${normalizedImport}/index.tsx`) ||
             fp.endsWith(`/${normalizedImport}/index.js`) ||
             fp.endsWith(`/${normalizedImport}`);
    });

    if (!fileExists) {
      const matches = Array.from(filePaths).filter(fp => {
         return fp.endsWith(`/${normalizedImport}.ts`) ||
                fp.endsWith(`/${normalizedImport}.tsx`) ||
                fp.endsWith(`/${normalizedImport}.js`) ||
                fp === `${normalizedImport}.ts` ||
                fp === `${normalizedImport}.tsx` ||
                fp === `${normalizedImport}.js` ||
                fp.endsWith(`/${normalizedImport}/index.ts`) ||
                fp.endsWith(`/${normalizedImport}/index.tsx`) ||
                fp.endsWith(`/${normalizedImport}/index.js`) ||
                fp.endsWith(`/${normalizedImport}`);
      });

      if (matches.length === 1) {
        let newImport = matches[0];
        if (newImport.endsWith(".tsx")) newImport = newImport.slice(0, -4);
        else if (newImport.endsWith(".ts")) newImport = newImport.slice(0, -3);
        else if (newImport.endsWith(".js")) newImport = newImport.slice(0, -3);
        
        contract.importPath = newImport;
      }
    }
  }

  // 4. Resolve Orphaned behavioralContracts
  for (const contract of repaired.behavioralContracts) {
    let normalizedFile = contract.file.trim();
    if (normalizedFile.startsWith("./")) normalizedFile = normalizedFile.slice(2);
    
    if (!filePaths.has(normalizedFile)) {
       const matches = Array.from(filePaths).filter(fp => {
         return fp.endsWith(`/${normalizedFile}`) || fp === normalizedFile;
       });
       if (matches.length === 1) {
         contract.file = matches[0];
       }
    }
  }

  return repaired;
}
