export interface JSXTagInfo {
  tagString: string;
  props: string[];
  hasSpread: boolean;
}

/**
 * Extracts all JSX opening tags for a specific component from a file's content.
 * Correctly handles self-closing tags, non-self-closing tags, strings, and nested braces.
 */
export function extractJSXOpeningTags(
  content: string,
  componentName: string,
): JSXTagInfo[] {
  const tags: JSXTagInfo[] = [];
  const searchString = `<${componentName}`;
  let searchIndex = 0;

  while (true) {
    const startIndex = content.indexOf(searchString, searchIndex);
    if (startIndex === -1) break;

    // Ensure it's exactly the component name, not a prefix (e.g., <NotesListWrapper)
    const nextChar = content[startIndex + searchString.length];
    if (
      nextChar !== " " &&
      nextChar !== "\n" &&
      nextChar !== "\t" &&
      nextChar !== "\r" &&
      nextChar !== ">" &&
      nextChar !== "/"
    ) {
      searchIndex = startIndex + 1;
      continue;
    }

    let i = startIndex + searchString.length;
    let inString = false;
    let stringChar: string | null = null;
    let braceDepth = 0;
    let foundEnd = false;

    while (i < content.length) {
      const char = content[i];

      if (inString) {
        // Handle escaped quotes inside strings
        if (char === "\\" && i + 1 < content.length) {
          i++;
        } else if (char === stringChar) {
          inString = false;
          stringChar = null;
        }
      } else if (braceDepth > 0) {
        if (char === '"' || char === "'" || char === "`") {
          inString = true;
          stringChar = char;
        } else if (char === "{") {
          braceDepth++;
        } else if (char === "}") {
          braceDepth--;
        }
      } else {
        if (char === '"' || char === "'" || char === "`") {
          inString = true;
          stringChar = char;
        } else if (char === "{") {
          braceDepth++;
        } else if (char === ">") {
          foundEnd = true;
          const tagString = content.substring(startIndex, i + 1);
          tags.push(parseTagString(tagString, componentName));
          break;
        }
      }
      i++;
    }

    if (!foundEnd) {
      // Reached EOF without finding closing >
      break;
    }

    searchIndex = i;
  }

  return tags;
}

/**
 * Tokenizes the extracted JSX opening tag to find all explicit props and check for spreads.
 */
function parseTagString(
  tagString: string,
  componentName: string,
): JSXTagInfo {
  const props: string[] = [];
  let hasSpread = false;

  // Strip the leading <ComponentName
  let content = tagString.substring(componentName.length + 1);
  // Strip the trailing > or />
  if (content.endsWith("/>")) {
    content = content.substring(0, content.length - 2);
  } else if (content.endsWith(">")) {
    content = content.substring(0, content.length - 1);
  }

  let i = 0;

  function skipWhitespace() {
    while (
      i < content.length &&
      (content[i] === " " ||
        content[i] === "\n" ||
        content[i] === "\t" ||
        content[i] === "\r")
    ) {
      i++;
    }
  }

  function skipString(quote: string) {
    i++; // skip opening quote
    while (i < content.length) {
      if (content[i] === "\\" && i + 1 < content.length) {
        i += 2;
        continue;
      }
      if (content[i] === quote) {
        i++; // skip closing quote
        break;
      }
      i++;
    }
  }

  function skipBraces() {
    let depth = 0;
    while (i < content.length) {
      const char = content[i];
      if (char === "{") {
        depth++;
        i++;
      } else if (char === "}") {
        depth--;
        i++;
        if (depth === 0) break;
      } else if (char === '"' || char === "'" || char === "`") {
        skipString(char);
      } else {
        i++;
      }
    }
  }

  while (i < content.length) {
    skipWhitespace();
    if (i >= content.length) break;

    const char = content[i];

    if (char === "{") {
      // Could be a spread {...props}
      if (content.substring(i, i + 4) === "{...") {
        hasSpread = true;
      }
      skipBraces();
      continue;
    }

    // It's a prop name
    let propName = "";
    while (
      i < content.length &&
      content[i] !== "=" &&
      content[i] !== " " &&
      content[i] !== "\n" &&
      content[i] !== "\t" &&
      content[i] !== "\r" &&
      content[i] !== "/" &&
      content[i] !== ">"
    ) {
      propName += content[i];
      i++;
    }

    if (propName) {
      props.push(propName);
    }

    skipWhitespace();
    if (i >= content.length) break;

    if (content[i] === "=") {
      i++; // skip =
      skipWhitespace();
      if (i >= content.length) break;

      const valChar = content[i];
      if (valChar === '"' || valChar === "'" || valChar === "`") {
        skipString(valChar);
      } else if (valChar === "{") {
        skipBraces();
      } else {
        // Unquoted value (e.g. number or boolean)
        while (
          i < content.length &&
          content[i] !== " " &&
          content[i] !== "\n" &&
          content[i] !== "\t" &&
          content[i] !== "\r" &&
          content[i] !== "/" &&
          content[i] !== ">"
        ) {
          i++;
        }
      }
    }
  }

  return {
    tagString,
    props,
    hasSpread,
  };
}
