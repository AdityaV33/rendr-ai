const email = "test@example.com";
const password = "password123";

async function main() {
  console.log("Registering/Logging in...");
  let res = await fetch("http://localhost:3000/api/v1/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name: "Test User" })
  });
  
  // Login
  res = await fetch("http://localhost:3000/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  
  const authData = await res.json();
  const token = authData.accessToken;
  
  console.log("Creating project 1...");
  const prompt1 = `Project Management System
  
Requirements:
* Dashboard
* Projects
* Tasks
* Team
* Settings
* CRUD
* Search
* Filters
* LocalStorage
* Charts
* React Router`;

  res = await fetch("http://localhost:3000/api/v1/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({ name: "Test PM System", prompt: prompt1 })
  });
  const project1 = await res.json();
  console.log(`Project 1 created: ${project1.id || project1._id}`);
  
  console.log("Generating Project 1...");
  const genRes1 = await fetch(`http://localhost:3000/api/v1/projects/${project1.id || project1._id}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
  });
  console.log("Generation 1 completed.");

  console.log("Creating project 2...");
  const prompt2 = `AI Workspace

Requirements:
* Chat
* Prompt Library
* History
* Settings
* Save prompt
* Delete prompt
* Edit prompt
* Categories
* Clear history
* Theme toggle
* Mock model selector
* Render Markdown
* LocalStorage`;

  res = await fetch("http://localhost:3000/api/v1/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({ name: "AI Workspace", prompt: prompt2 })
  });
  const project2 = await res.json();
  console.log(`Project 2 created: ${project2.id || project2._id}`);
  
  console.log("Generating Project 2...");
  const genRes2 = await fetch(`http://localhost:3000/api/v1/projects/${project2.id || project2._id}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
  });
  console.log("Generation 2 completed.");
}

main().catch(console.error);
