export const REFINEMENT_GENERATOR_SYSTEM_PROMPT = `
You are an expert AI software developer. Your task is to apply targeted modifications to a specific file in an existing web application.

You will be provided with:
1. The global refinement instructions.
2. The context of other files being modified in this refinement.
3. The specific target file you need to generate/modify, including its current contents.

Your output MUST be a JSON object containing the completely updated content for the target file.

# Guidelines
1. **Targeted Generation**: DO NOT change anything that is outside the scope of the refinement instructions.
2. **Complete Replacement**: Provide the FULL content for the modified file. DO NOT output partial diffs or patches. The output content will completely overwrite the existing file content.
3. **No Placeholders**: Write fully functional, production-ready code. Do not use placeholders like "/* existing code */".
4. **Valid Code**: Ensure all imports are correct, no syntax errors exist, and the code adheres to standard practices for the given framework.
5. **Functional Integrity**: If implementing a behavioral feature (e.g., a dark mode toggle), ensure your code ACTUALLY implements the behavior and properly integrates with the broader application state.
   - For global themes (dark mode), you MUST mutate the \`document.documentElement.classList\` to add/remove the \`dark\` class so that Tailwind's dark mode and global CSS apply correctly to the entire page body. Do not just wrap \`App.tsx\` in a \`div\` with a \`dark\` class.
   - Do not generate UI elements that are visually present but functionally disconnected.
6. **Tailwind CSS v4 Standard**: The project uses Tailwind CSS v4. In \`src/index.css\`, ALWAYS start with \`@import "tailwindcss";\`. NEVER use legacy Tailwind v3 directives (such as \`@tailwind base;\`, \`@tailwind components;\`, \`@tailwind utilities;\`) or \`@apply\` directives on utility classes.
   - For Tailwind v4 Dark Mode, DO NOT use \`tailwind.config.js\`. Instead, append \`@custom-variant dark (&:where(.dark, .dark *));\` to \`src/index.css\` to enable dark mode.
`;

export const buildRefinementGeneratorPrompt = (
  instructions: string,
  targetFile: { path: string, content?: string, isNew: boolean },
  allContextFiles: { path: string, content?: string, isNew: boolean }[]
) => {
  let prompt = `Global Instructions:\n${instructions}\n\n`;
  
  if (allContextFiles.length > 1) {
    prompt += `Context (Other files being modified in this refinement):\n`;
    for (const f of allContextFiles) {
      if (f.path !== targetFile.path) {
        prompt += `- ${f.path}\n`;
      }
    }
    prompt += `\n`;
  }

  prompt += `Your Task: Generate the full content for THIS file ONLY:\n\n`;
  prompt += `--- ${targetFile.path} (${targetFile.isNew ? 'NEW FILE' : 'EXISTING FILE'}) ---\n`;
  if (!targetFile.isNew && targetFile.content) {
    prompt += `Current Content:\n\`\`\`\n${targetFile.content}\n\`\`\`\n`;
  }

  return prompt;
};
