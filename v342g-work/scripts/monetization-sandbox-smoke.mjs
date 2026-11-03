/** [AI-GENERATED][QA][V342-J] Read-only live check; never creates or charges a transaction. */
import { runMonetizationSandboxSmoke } from './monetization-sandbox-smoke-utils.mjs';

try {
  const result = await runMonetizationSandboxSmoke();
  console.log('MIDTRANS SANDBOX SMOKE: PASS');
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(`MIDTRANS SANDBOX SMOKE: BLOCKED — ${error.message}`);
  process.exitCode = 2;
}
