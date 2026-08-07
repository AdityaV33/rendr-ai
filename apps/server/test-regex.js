const regex = /(?:import|export)(?:\s+type)?(?:\s+[^'"]+\s+from)?\s+['"](\.[^'"]+)['"]/g;

const text = `
import type { Foo } from "./foo";
export type { Bar } from "./bar";
import "./styles";
`;

let match;
while ((match = regex.exec(text)) !== null) {
  console.log("Matched:", match[1]);
}

