const fs = require('fs');
const html = fs.readFileSync('c:/xampp/htdocs/proofing-donat/www/index.html', 'utf8');
const scripts = [...html.matchAll(/<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/gi)];
const js = scripts.map((m, i) => ({ i, content: m[1], start: m.index })).pop();
if (!js) {
  console.log('no inline script');
  process.exit(1);
}

function scan(code) {
  let depth = 0;
  let i = 0;
  let line = 1;
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let inLineComment = false;
  let inBlockComment = false;
  let escape = false;
  const stack = [];

  while (i < code.length) {
    const c = code[i];
    const n = code[i + 1];

    if (inLineComment) {
      if (c === '\n') {
        inLineComment = false;
        line++;
      }
      i++;
      continue;
    }
    if (inBlockComment) {
      if (c === '*' && n === '/') {
        inBlockComment = false;
        i += 2;
        continue;
      }
      if (c === '\n') line++;
      i++;
      continue;
    }
    if (!inSingle && !inDouble && !inTemplate) {
      if (c === '/' && n === '/') {
        inLineComment = true;
        i += 2;
        continue;
      }
      if (c === '/' && n === '*') {
        inBlockComment = true;
        i += 2;
        continue;
      }
    }
    if (inSingle) {
      if (!escape && c === "'") inSingle = false;
      escape = !escape && c === '\\';
      if (c === '\n') line++;
      i++;
      continue;
    }
    if (inDouble) {
      if (!escape && c === '"') inDouble = false;
      escape = !escape && c === '\\';
      if (c === '\n') line++;
      i++;
      continue;
    }
    if (inTemplate) {
      if (!escape && c === '`') inTemplate = false;
      escape = !escape && c === '\\';
      if (c === '\n') line++;
      i++;
      continue;
    }

    if (c === "'") {
      inSingle = true;
      escape = false;
      i++;
      continue;
    }
    if (c === '"') {
      inDouble = true;
      escape = false;
      i++;
      continue;
    }
    if (c === '`') {
      inTemplate = true;
      escape = false;
      i++;
      continue;
    }

    if (c === '{') {
      depth++;
      stack.push(line);
    }
    if (c === '}') {
      depth--;
      stack.pop();
      if (depth < 0) console.log('extra } at line', line);
    }
    if (c === '\n') line++;
    i++;
  }

  console.log('final depth:', depth);
  if (depth > 0) {
    console.log('unclosed { count:', depth);
    console.log('unclosed at lines:', stack.slice(-20));
  }
}

scan(js.content);
