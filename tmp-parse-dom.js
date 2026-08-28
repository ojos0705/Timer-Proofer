const fs = require("fs");
const raw = fs.readFileSync("www/public/index.html", "utf8");

function stripComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, "");
}

const html = stripComments(raw);
const lines = html.split("\n");
const stack = [];
const events = [];

for (let i = 0; i < lines.length; i++) {
  const rawLine = raw.split("\n")[i] || "";
  const line = lines[i];
  const re = /<(\/?)div([^>]*)>/gi;
  let m;
  while ((m = re.exec(line))) {
    const close = m[1] === "/";
    const attrs = m[2] || "";
    if (close) {
      const popped = stack.pop();
      if (popped?.id && ["app-container", "recipe", "tips"].includes(popped.id)) {
        events.push(`CLOSE #${popped.id} at raw line ${i + 1}`);
      }
    } else {
      const id = (attrs.match(/id\s*=\s*["']([^"']+)["']/i) || [])[1];
      stack.push({ id, line: i + 1 });
      if (id && ["app-container", "recipe", "tips"].includes(id)) {
        events.push(`OPEN #${id} at raw line ${i + 1}`);
      }
    }
  }
}

console.log(events.join("\n"));

const tipsRawLine = raw.split("\n").findIndex((l) => /\bid\s*=\s*["']tips["']/.test(l)) + 1;
const stack2 = [];
for (let i = 0; i < lines.length; i++) {
  const re = /<(\/?)div([^>]*)>/gi;
  let m;
  while ((m = re.exec(lines[i]))) {
    const close = m[1] === "/";
    const attrs = m[2] || "";
    if (close) stack2.pop();
    else {
      const id = (attrs.match(/id\s*=\s*["']([^"']+)["']/i) || [])[1];
      stack2.push(id || "div");
      if (i + 1 === tipsRawLine || raw.split("\n")[i]?.includes('id="tips"')) {
        console.log(`\nTips raw line ${i + 1}, parents:`, stack2.slice(0, -1));
      }
    }
  }
}
