const regex = /(?:import|export)(?:\s+type)?(?:\s+[^'"]+\s+from)?\s+['"](\.[^'"]+)['"]/g;

const cases = [
  { text: `import "./styles.css";`, shouldMatch: true },
  { text: `import React from "react";`, shouldMatch: false }, // "react" doesn't start with a dot
  { text: `import { Button } from "./Button";`, shouldMatch: true },
  { text: `import type { User } from "./types";`, shouldMatch: true },
  { text: `export * from "./utils";`, shouldMatch: true },
  { text: `export { Button } from "./Button";`, shouldMatch: true },
  { text: `export type { User } from "./types";`, shouldMatch: true },
  { text: `export default defineConfig({
  testDir: "./tests/e2e",
});`, shouldMatch: false },
  { text: `const path = "./foo";`, shouldMatch: false },
  { text: `const obj = {
  file: "./bar"
};`, shouldMatch: false },
  { text: `import {
  A,
  B
} from "./utils"`, shouldMatch: true }
];

cases.forEach((c, i) => {
  regex.lastIndex = 0;
  const match = regex.exec(c.text);
  const matched = match !== null;
  if (matched === c.shouldMatch) {
    console.log(`Case ${i} PASS`);
  } else {
    console.log(`Case ${i} FAIL: expected ${c.shouldMatch}, got ${matched}. Text: ${c.text.substring(0, 30)}...`);
  }
});

