import sys

file_path = "src/modules/ai/validator/validator.service.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add devServerManager import
content = content.replace(
    'import { installDependenciesInWorkspace } from "../../runtime/install.service.js";',
    'import { installDependenciesInWorkspace } from "../../runtime/install.service.js";\nimport { devServerManager } from "../../runtime/dev-server.manager.js";'
)

# Add start server and timing
content = content.replace(
    'await execAsync("pnpm exec playwright test --reporter=json", { cwd: workspacePath });',
    '''
            // Start the dev server and record timing
            let viteStartupMs = 0;
            try {
              const serverResult = await devServerManager.startServer(projectId, workspacePath);
              viteStartupMs = serverResult.startupMs;
            } catch (err) {
              console.error("[Validator] DevServer failed to start:", err);
            }

            const startPlaywrightExecution = performance.now();
            await execAsync("pnpm exec playwright test --reporter=json", { cwd: workspacePath });
            // Add custom metric so we can print it
            (metrics as any).viteStartupMs = viteStartupMs;
            (metrics as any).playwrightExecutionMs = performance.now() - startPlaywrightExecution;'''
)

# Add error classification
content = content.replace(
    '''                for (const failure of failures) {
                  issues.push({
                    file: normalizePath(failure.file),
                    type: "e2e-test",
                    severity: "error",
                    message: `E2E Test Failed: ${failure.title}\\n${failure.error}`,
                    repairStrategy: "modify-file",
                    owner: "AI"
                  });
                }''',
    '''                for (const failure of failures) {
                  let owner: "AI" | "Runtime" | "Template" = "AI";
                  
                  if (failure.error?.includes('running "beforeEach" hook') || 
                      failure.error?.includes('page.goto') ||
                      failure.error?.includes('ERR_CONNECTION_REFUSED') ||
                      failure.error?.includes('browser type launch')) {
                    owner = "Runtime";
                  }
                  
                  issues.push({
                    file: normalizePath(failure.file),
                    type: "e2e-test",
                    severity: "error",
                    message: `E2E Test Failed: ${failure.title}\\n${failure.error}`,
                    repairStrategy: owner === "Runtime" ? "regenerate-file" : "modify-file",
                    owner
                  });
                }'''
)

# Add metrics in fallback and outside Playwright
content = content.replace(
    '''              } catch (parseError) {
                console.error("Raw Playwright stdout:", stdout);
                console.error("Raw Playwright stderr:", error.stderr);
                console.error("[Validator] Failed to parse Playwright JSON output", parseError);
                // Fallback
                issues.push({
                  file: "playwright.config.ts",
                  type: "e2e-test",
                  severity: "error",
                  message: "Playwright tests failed, but output could not be parsed.",
                  repairStrategy: "modify-file",
                  owner: "AI"
                });
              }
            }
          }
        }
        
        metrics.playwrightMs = performance.now() - startPlaywright;
      }
    }

    const passed = !issues.some(i => i.severity === "error" || i.severity === "critical");
    metrics.totalMs = performance.now() - startTotal;

    console.log(`\\n[Validator Timing Breakdown]
Workspace Sync:    ${metrics.workspaceCreateMs.toFixed(0)}ms
Dependency Check:  ${metrics.installMs.toFixed(0)}ms
TypeScript:        ${metrics.typecheckMs.toFixed(0)}ms
Playwright:        ${metrics.playwrightMs.toFixed(0)}ms
Total:             ${metrics.totalMs.toFixed(0)}ms\\n`);

    return {
      passed,
      issues,
      metrics,
    };
  }
}''',
    '''              } catch (parseError) {
                console.error("Raw Playwright stdout:", stdout);
                console.error("Raw Playwright stderr:", error.stderr);
                console.error("[Validator] Failed to parse Playwright JSON output", parseError);
                // Fallback
                issues.push({
                  file: "playwright.config.ts",
                  type: "e2e-test",
                  severity: "error",
                  message: "Playwright tests failed, but output could not be parsed.",
                  repairStrategy: "modify-file",
                  owner: "AI"
                });
              }
            }
            
            // Add custom metric so we can print it
            (metrics as any).viteStartupMs = (metrics as any).viteStartupMs || 0;
            (metrics as any).playwrightExecutionMs = performance.now() - startPlaywrightExecution;
          }
        }
        
        metrics.playwrightMs = performance.now() - startPlaywright;
      }
      
    metrics.totalMs = performance.now() - startTotal;

    console.log(`\\n[Validator Timing Breakdown]`);
    console.log(`Workspace Sync:    ${metrics.workspaceCreateMs.toFixed(0)}ms`);
    console.log(`Dependency Check:  ${metrics.installMs.toFixed(0)}ms`);
    console.log(`TypeScript:        ${metrics.typecheckMs.toFixed(0)}ms`);
    if ((metrics as any).viteStartupMs !== undefined) {
      console.log(`Vite Startup:      ${(metrics as any).viteStartupMs.toFixed(0)}ms`);
      console.log(`Playwright Tests:  ${(metrics as any).playwrightExecutionMs.toFixed(0)}ms`);
    }
    console.log(`Total Playwright:  ${metrics.playwrightMs.toFixed(0)}ms`);
    console.log(`Total Validation:  ${metrics.totalMs.toFixed(0)}ms\\n`);

    return {
      passed: issues.filter(i => i.severity === "error" || i.severity === "critical").length === 0,
      issues,
      metrics
    };
  }
}'''
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
