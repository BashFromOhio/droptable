/* MiniPy: a small, beginner-friendly subset of Python 3 that runs in the browser with no eval.
   Covers: numbers (int/float), strings, f-strings, lists, tuples, dicts, if/elif/else, for, while,
   break/continue, def/return, lambda, comprehensions, slicing, and common built-ins and methods.
   Modules: math, statistics, datetime (date). pandas/sklearn are not available (use the Colab kit). */
(function (root) {
  "use strict";
  class F { constructor(v) { this.v = v; } }            // Python float
  class PyErr extends Error { constructor(kind, msg, line) { super(msg); this.kind = kind; this.line = line; } }
  const tup = a => { a.tup = true; return a; };
  const isNum = x => typeof x === "number" || x instanceof F || typeof x === "boolean";
  const nv = x => (x instanceof F ? x.v : x === true ? 1 : x === false ? 0 : x);
  const isFloat = x => x instanceof F;
  const mk = (v, float) => (float ? new F(v) : v);

  /* ---------------- tokenizer ---------------- */
  const OPS = ["**=", "//=", "...", "->", "**", "//", "==", "!=", "<=", ">=", "+=", "-=", "*=", "/=", "%=", "+", "-", "*", "/", "%", "<", ">", "=", "(", ")", "[", "]", "{", "}", ",", ":", ".", ";"];
  const KW = new Set(["def", "return", "if", "elif", "else", "for", "while", "in", "not", "and", "or", "is", "True", "False", "None", "break", "continue", "pass", "lambda", "import", "from", "as"]);
  function tokenize(src) {
    const toks = [], lines = src.replace(/\r\n?/g, "\n").replace(/\t/g, "    ").split("\n");
    const indents = [0]; let depth = 0;
    for (let ln = 0; ln < lines.length; ln++) {
      const line = lines[ln]; let i = 0;
      if (depth === 0) {
        const m = line.match(/^ */); const ind = m[0].length; const rest = line.slice(ind);
        if (!rest.trim() || rest.trim().startsWith("#")) continue;
        if (ind > indents[indents.length - 1]) { indents.push(ind); toks.push({ t: "indent", line: ln + 1 }); }
        else { while (ind < indents[indents.length - 1]) { indents.pop(); toks.push({ t: "dedent", line: ln + 1 }); }
          if (ind !== indents[indents.length - 1]) throw new PyErr("IndentationError", "unindent does not match any outer indentation level", ln + 1); }
        i = ind;
      }
      while (i < line.length) {
        const c = line[i];
        if (c === " ") { i++; continue; }
        if (c === "#") break;
        if (/[0-9]/.test(c) || (c === "." && /[0-9]/.test(line[i + 1]))) {
          const m = line.slice(i).match(/^(\d[\d_]*)?(\.\d*)?([eE][+-]?\d+)?/); const s = m[0].replace(/_/g, "");
          toks.push({ t: "num", v: /[.eE]/.test(s) ? new F(parseFloat(s)) : parseInt(s, 10), line: ln + 1 }); i += m[0].length; continue;
        }
        const sm = line.slice(i).match(/^([fFrR]{0,2})(['"])/);
        if (sm && (sm[1] === "" || /^[a-zA-Z]+$/.test(sm[1]))) {
          const pre = sm[1].toLowerCase(), q = sm[2]; let j = i + sm[0].length, out = "";
          const triple = line.slice(j - 1, j + 2) === q + q + q;
          if (triple) throw new PyErr("SyntaxError", "triple-quoted strings aren't supported here; use one line", ln + 1);
          while (j < line.length && line[j] !== q) {
            if (line[j] === "\\" && !pre.includes("r")) { const n = line[j + 1]; out += n === "n" ? "\n" : n === "t" ? "\t" : n; j += 2; }
            else out += line[j++];
          }
          if (j >= line.length) throw new PyErr("SyntaxError", "unterminated string literal", ln + 1);
          toks.push({ t: pre.includes("f") ? "fstr" : "str", v: out, line: ln + 1 }); i = j + 1; continue;
        }
        const nm = line.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/);
        if (nm) { toks.push({ t: KW.has(nm[0]) ? "kw" : "name", v: nm[0], line: ln + 1 }); i += nm[0].length; continue; }
        const op = OPS.find(o => line.startsWith(o, i));
        if (op) { if ("([{".includes(op)) depth++; if (")]}".includes(op)) depth = Math.max(0, depth - 1); toks.push({ t: "op", v: op, line: ln + 1 }); i += op.length; continue; }
        throw new PyErr("SyntaxError", `invalid character '${c}'`, ln + 1);
      }
      if (depth === 0 && toks.length && toks[toks.length - 1].t !== "nl" && toks[toks.length - 1].t !== "indent" && toks[toks.length - 1].t !== "dedent") toks.push({ t: "nl", line: ln + 1 });
    }
    toks.push({ t: "nl", line: lines.length });
    while (indents.length > 1) { indents.pop(); toks.push({ t: "dedent", line: lines.length }); }
    toks.push({ t: "eof", line: lines.length });
    return toks;
  }

  /* ---------------- parser ---------------- */
  function parse(src) {
    const T = tokenize(src); let p = 0;
    const peek = (o = 0) => T[p + o], next = () => T[p++];
    const is = (t, v) => peek().t === t && (v === undefined || peek().v === v);
    const isOp = v => is("op", v), isKw = v => is("kw", v);
    const expect = (t, v) => { if (!is(t, v)) { const k = peek(); const found = k.v !== undefined ? `'${k.v}'` : k.t === "nl" ? "the end of the line" : k.t === "indent" ? "an extra indent" : k.t === "eof" ? "the end of the code" : k.t; throw new PyErr("SyntaxError", `expected '${v === undefined ? (t === "nl" ? "end of line" : t === "indent" ? "an indented block" : t) : v}' but found ${found}`, k.line); } return next(); };
    function block() {
      expect("op", ":");
      if (!is("nl")) { const s = simple(); return [s]; }
      expect("nl"); expect("indent"); const body = [];
      while (!is("dedent") && !is("eof")) { if (is("nl")) { next(); continue; } body.push(statement()); }
      if (is("dedent")) next(); return body;
    }
    function simple() {
      const line = peek().line; let s;
      if (isKw("pass")) { next(); s = { k: "pass" }; }
      else if (isKw("break")) { next(); s = { k: "break" }; }
      else if (isKw("continue")) { next(); s = { k: "continue" }; }
      else if (isKw("return")) { next(); s = { k: "return", e: is("nl") ? null : exprList() }; }
      else if (isKw("import")) { next(); const names = []; do { if (isOp(",")) next(); let n = expect("name").v; while (isOp(".")) { next(); n += "." + expect("name").v; } let as = n; if (isKw("as")) { next(); as = expect("name").v; } names.push([n, as]); } while (isOp(",")); s = { k: "import", names }; }
      else if (isKw("from")) { next(); let mod = expect("name").v; while (isOp(".")) { next(); mod += "." + expect("name").v; } expect("kw", "import"); const names = []; do { if (isOp(",")) next(); const n = expect("name").v; let as = n; if (isKw("as")) { next(); as = expect("name").v; } names.push([n, as]); } while (isOp(",")); s = { k: "from", mod, names }; }
      else {
        const e = exprList();
        if (isOp("=")) { const targets = [e]; let val; while (isOp("=")) { next(); val = exprList(); targets.push(val); } targets.pop(); s = { k: "assign", targets, e: val }; }
        else if (["+=", "-=", "*=", "/=", "//=", "%=", "**="].some(isOp)) { const op = next().v.slice(0, -1); s = { k: "aug", t: e, op, e: exprList() }; }
        else s = { k: "expr", e };
      }
      s.line = line;
      if (isOp(";")) next();
      if (!is("eof") && !is("dedent")) expect("nl");
      return s;
    }
    function statement() {
      const line = peek().line;
      if (isKw("def")) { next(); const name = expect("name").v; expect("op", "("); const params = [];
        while (!isOp(")")) { const pn = expect("name").v; let def = null; if (isOp("=")) { next(); def = expr(); } params.push({ name: pn, def }); if (isOp(",")) next(); else break; }
        expect("op", ")"); if (isOp("->")) { next(); expr(); } return { k: "def", name, params, body: block(), line }; }
      if (isKw("if")) { next(); const branches = [[expr(), block()]]; let els = null;
        while (isKw("elif")) { next(); branches.push([expr(), block()]); }
        if (isKw("else")) { next(); els = block(); } return { k: "if", branches, els, line }; }
      if (isKw("for")) { next(); const target = targetList(); expect("kw", "in"); const it = exprList(); return { k: "for", target, it, body: block(), line }; }
      if (isKw("while")) { next(); const c = expr(); return { k: "while", c, body: block(), line }; }
      return simple();
    }
    function targetList() { const t = [postfix()]; while (isOp(",")) { next(); t.push(postfix()); } return t.length === 1 ? t[0] : { k: "tuple", items: t }; }
    function exprList() { const first = expr(); if (!isOp(",")) return first; const items = [first]; while (isOp(",")) { next(); if (is("nl") || isOp("=") || isOp(")")) break; items.push(expr()); } return { k: "tuple", items }; }
    function expr() {
      if (isKw("lambda")) { next(); const params = []; while (!isOp(":")) { params.push({ name: expect("name").v, def: null }); if (isOp(",")) next(); } next(); return { k: "lambda", params, body: expr() }; }
      const e = orE(); if (isKw("if") && peek(1)) { const save = p; next(); const c = orE(); if (isKw("else")) { next(); return { k: "ifx", c, a: e, b: expr() }; } p = save; } return e;
    }
    function orE() { let l = andE(); while (isKw("or")) { next(); l = { k: "or", l, r: andE() }; } return l; }
    function andE() { let l = notE(); while (isKw("and")) { next(); l = { k: "and", l, r: notE() }; } return l; }
    function notE() { if (isKw("not")) { next(); return { k: "not", e: notE() }; } return cmp(); }
    function cmp() {
      const first = add(); const ops = [], rest = [];
      for (;;) {
        let op = null;
        if (["==", "!=", "<", ">", "<=", ">="].some(isOp)) op = next().v;
        else if (isKw("in")) { next(); op = "in"; }
        else if (isKw("not") && peek(1).t === "kw" && peek(1).v === "in") { next(); next(); op = "not in"; }
        else if (isKw("is")) { next(); if (isKw("not")) { next(); op = "is not"; } else op = "is"; }
        if (!op) break; ops.push(op); rest.push(add());
      }
      return ops.length ? { k: "cmp", first, ops, rest } : first;
    }
    function add() { let l = mul(); while (isOp("+") || isOp("-")) { const op = next().v; l = { k: "bin", op, l, r: mul() }; } return l; }
    function mul() { let l = unary(); while (["*", "/", "//", "%"].some(isOp)) { const op = next().v; l = { k: "bin", op, l, r: unary() }; } return l; }
    function unary() { if (isOp("-")) { next(); return { k: "neg", e: unary() }; } if (isOp("+")) { next(); return unary(); } return pow(); }
    function pow() { const b = postfix(); if (isOp("**")) { next(); return { k: "bin", op: "**", l: b, r: unary() }; } return b; }
    function postfix() {
      let e = atom();
      for (;;) {
        if (isOp("(")) { next(); const args = [], kw = [];
          while (!isOp(")")) {
            if (is("name") && peek(1).t === "op" && peek(1).v === "=") { const n = next().v; next(); kw.push([n, expr()]); }
            else { const a = expr(); if (isKw("for")) { args.push(comp(a, "gen")); } else args.push(a); }
            if (isOp(",")) next(); else break;
          }
          expect("op", ")"); e = { k: "call", f: e, args, kw }; }
        else if (isOp("[")) { next(); let s;
          if (isOp(":") || true) {
            const parts = [null, null, null]; let idx = 0, isSlice = false;
            if (!isOp(":")) parts[0] = expr();
            while (isOp(":")) { next(); isSlice = true; idx++; if (!isOp(":") && !isOp("]")) parts[idx] = expr(); }
            s = isSlice ? { k: "slice", a: parts[0], b: parts[1], c: parts[2] } : parts[0];
          }
          expect("op", "]"); e = { k: "sub", o: e, i: s }; }
        else if (isOp(".")) { next(); e = { k: "attr", o: e, n: expect("name").v }; }
        else return e;
      }
    }
    function comp(elt, kind, val) {
      const fors = [];
      while (isKw("for")) { next(); const target = targetList(); expect("kw", "in"); const it = orE(); const ifs = []; while (isKw("if")) { next(); ifs.push(orE()); } fors.push({ target, it, ifs }); }
      return { k: "comp", kind, elt, val, fors };
    }
    function atom() {
      const t = peek();
      if (t.t === "num") { next(); return { k: "const", v: t.v }; }
      if (t.t === "str" || t.t === "fstr") { let parts = [];
        while (is("str") || is("fstr")) { const s = next(); parts.push(s.t === "fstr" ? fstring(s.v, s.line) : { k: "const", v: s.v }); }
        return parts.length === 1 ? parts[0] : { k: "concat", parts }; }
      if (t.t === "kw" && ["True", "False", "None"].includes(t.v)) { next(); return { k: "const", v: t.v === "True" ? true : t.v === "False" ? false : null }; }
      if (t.t === "name") { next(); return { k: "name", n: t.v, line: t.line }; }
      if (isOp("(")) { next(); if (isOp(")")) { next(); return { k: "tuple", items: [] }; }
        const e = expr(); if (isKw("for")) { const c = comp(e, "gen"); expect("op", ")"); return c; }
        if (isOp(",")) { const items = [e]; while (isOp(",")) { next(); if (isOp(")")) break; items.push(expr()); } expect("op", ")"); return { k: "tuple", items }; }
        expect("op", ")"); return e; }
      if (isOp("[")) { next(); const items = []; if (isOp("]")) { next(); return { k: "list", items }; }
        const e = expr(); if (isKw("for")) { const c = comp(e, "list"); expect("op", "]"); return c; }
        items.push(e); while (isOp(",")) { next(); if (isOp("]")) break; items.push(expr()); } expect("op", "]"); return { k: "list", items }; }
      if (isOp("{")) { next(); const pairs = []; if (isOp("}")) { next(); return { k: "dict", pairs }; }
        const k = expr(); expect("op", ":"); const v = expr(); if (isKw("for")) { const c = comp(k, "dict", v); expect("op", "}"); return c; }
        pairs.push([k, v]); while (isOp(",")) { next(); if (isOp("}")) break; const k2 = expr(); expect("op", ":"); pairs.push([k2, expr()]); } expect("op", "}"); return { k: "dict", pairs }; }
      throw new PyErr("SyntaxError", `invalid syntax near '${t.v !== undefined ? t.v : t.t === "nl" ? "end of line" : t.t}'`, t.line);
    }
    function fstring(s, line) {
      const parts = []; let i = 0, lit = "";
      while (i < s.length) {
        if (s[i] === "{" && s[i + 1] === "{") { lit += "{"; i += 2; continue; }
        if (s[i] === "}" && s[i + 1] === "}") { lit += "}"; i += 2; continue; }
        if (s[i] === "{") { if (lit) parts.push({ k: "const", v: lit }); lit = ""; let j = i + 1, d = 0, inner = "";
          while (j < s.length && !(s[j] === "}" && d === 0)) { if ("([{".includes(s[j])) d++; if (")]}".includes(s[j])) d--; inner += s[j++]; }
          let spec = ""; const ci = topColon(inner); if (ci >= 0) { spec = inner.slice(ci + 1); inner = inner.slice(0, ci); }
          const sub = parse(inner.trim()); parts.push({ k: "fmt", e: sub.body[0].e, spec }); i = j + 1; continue; }
        lit += s[i++];
      }
      if (lit) parts.push({ k: "const", v: lit });
      return { k: "concat", parts, line };
    }
    function topColon(s) { let d = 0, q = null; for (let i = 0; i < s.length; i++) { const c = s[i]; if (q) { if (c === q) q = null; continue; } if (c === "'" || c === '"') q = c; else if ("([{".includes(c)) d++; else if (")]}".includes(c)) d--; else if (c === ":" && d === 0) return i; } return -1; }
    const body = []; while (!is("eof")) { if (is("nl")) { next(); continue; } body.push(statement()); }
    return { body };
  }

  /* ---------------- values & printing ---------------- */
  function typeName(x) {
    if (x === null) return "NoneType"; if (typeof x === "boolean") return "bool"; if (typeof x === "number") return "int"; if (x instanceof F) return "float";
    if (typeof x === "string") return "str"; if (Array.isArray(x)) return x.tup ? "tuple" : "list"; if (x instanceof Map) return "dict";
    if (x && x.date) return "datetime.date"; if (x && x.td) return "datetime.timedelta"; if (x && (x.fn || typeof x === "function")) return "function"; if (x && x.mod) return "module"; return "object";
  }
  function fmtFloat(v) {
    if (Number.isNaN(v)) return "nan"; if (!Number.isFinite(v)) return v > 0 ? "inf" : "-inf";
    const av = Math.abs(v);
    if (Number.isInteger(v) && av < 1e16) return v.toFixed(1);
    let s = av >= 1e16 || (av < 1e-4 && av > 0) ? v.toExponential().replace(/\.?0*e/, "e") : String(v); if (/e/.test(s)) { s = s.replace(/e([+-])(\d)$/, "e$10$2"); } return s;
  }
  function repr(x) {
    if (typeof x === "string") return x.includes("'") && !x.includes('"') ? `"${x}"` : `'${x.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n")}'`;
    return str(x, true);
  }
  function str(x, inner) {
    if (x === null) return "None"; if (x === true) return "True"; if (x === false) return "False";
    if (typeof x === "number") return String(x); if (x instanceof F) return fmtFloat(x.v);
    if (typeof x === "string") return inner ? repr(x) : x;
    if (Array.isArray(x)) { const s = x.map(repr).join(", "); return x.tup ? (x.length === 1 ? `(${s},)` : `(${s})`) : `[${s}]`; }
    if (x instanceof Map) return `{${[...x.entries()].map(([k, v]) => repr(k) + ": " + repr(v)).join(", ")}}`;
    if (x && x.date) return inner ? `datetime.date(${x.y}, ${x.m}, ${x.d})` : `${x.y}-${String(x.m).padStart(2, "0")}-${String(x.d).padStart(2, "0")}`;
    if (x && x.td) return `${x.days} days, 0:00:00`;
    if (x && x.fn) return `<function ${x.name}>`; if (typeof x === "function") return `<built-in function ${x.pyname || "fn"}>`;
    if (x && x.mod) return `<module '${x.mod}'>`;
    return String(x);
  }
  function truthy(x) { if (x === null || x === false || x === 0 || x === "") return false; if (x instanceof F) return x.v !== 0; if (Array.isArray(x)) return x.length > 0; if (x instanceof Map) return x.size > 0; return true; }
  function eq(a, b) {
    if (isNum(a) && isNum(b)) return nv(a) === nv(b);
    if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && !!a.tup === !!b.tup && a.every((x, i) => eq(x, b[i]));
    if (a instanceof Map && b instanceof Map) return a.size === b.size && [...a].every(([k, v]) => b.has(k) && eq(v, b.get(k)));
    if (a && a.date && b && b.date) return a.t === b.t;
    return a === b;
  }
  const dkey = k => (k instanceof F ? (Number.isInteger(k.v) ? k.v : "f:" + k.v) : k === true ? 1 : k === false ? 0 : Array.isArray(k) ? "t:" + JSON.stringify(k.map(dkey)) : k);
  function cmpv(a, b, line) {
    if (isNum(a) && isNum(b)) return nv(a) < nv(b) ? -1 : nv(a) > nv(b) ? 1 : 0;
    if (typeof a === "string" && typeof b === "string") return a < b ? -1 : a > b ? 1 : 0;
    if (Array.isArray(a) && Array.isArray(b)) { for (let i = 0; i < Math.min(a.length, b.length); i++) { const c = cmpv(a[i], b[i], line); if (c) return c; } return a.length - b.length; }
    if (a && a.date && b && b.date) return a.t - b.t;
    throw new PyErr("TypeError", `'<' not supported between instances of '${typeName(a)}' and '${typeName(b)}'`, line);
  }
  function iter(x, line) {
    if (Array.isArray(x)) return x; if (typeof x === "string") return [...x]; if (x instanceof Map) return [...x.keys()];
    if (x && x.range) { const out = []; const [a, b, s] = x.range; if (s > 0) for (let i = a; i < b; i += s) out.push(i); else for (let i = a; i > b; i += s) out.push(i); if (out.length > 1e6) throw new PyErr("MemoryError", "range is too big", line); return out; }
    throw new PyErr("TypeError", `'${typeName(x)}' object is not iterable`, line);
  }
  function arith(op, a, b, line) {
    if (op === "+") {
      if (typeof a === "string" && typeof b === "string") return a + b;
      if (Array.isArray(a) && Array.isArray(b)) { const r = a.concat(b); return a.tup ? tup(r) : r; }
      if (a && a.date && b && b.td) return mkDate(new Date(a.t + b.days * 864e5));
    }
    if (op === "-" && a && a.date && b && b.date) return { td: true, days: Math.round((a.t - b.t) / 864e5) };
    if (op === "*") {
      if (typeof a === "string" && typeof b === "number") return a.repeat(Math.max(0, b));
      if (Array.isArray(a) && typeof b === "number") { let r = []; for (let i = 0; i < b; i++) r = r.concat(a); return r; }
    }
    if (op === "%" && typeof a === "string") return a.replace(/%[sd]/, str(b));
    if (!isNum(a) || !isNum(b)) {
      const sym = { "+": "+", "-": "-", "*": "*", "/": "/", "//": "//", "%": "%", "**": "** or pow()" }[op];
      if (op === "+" && (typeof a === "string" || typeof b === "string")) throw new PyErr("TypeError", `can only concatenate str (not "${typeName(typeof a === "string" ? b : a)}") to str. Tip: use str() or an f-string.`, line);
      throw new PyErr("TypeError", `unsupported operand type(s) for ${sym}: '${typeName(a)}' and '${typeName(b)}'`, line);
    }
    const x = nv(a), y = nv(b), fl = isFloat(a) || isFloat(b);
    switch (op) {
      case "+": return mk(x + y, fl); case "-": return mk(x - y, fl); case "*": return mk(x * y, fl);
      case "/": if (y === 0) throw new PyErr("ZeroDivisionError", "division by zero", line); return new F(x / y);
      case "//": if (y === 0) throw new PyErr("ZeroDivisionError", "integer division or modulo by zero", line); return mk(Math.floor(x / y), fl);
      case "%": if (y === 0) throw new PyErr("ZeroDivisionError", "integer division or modulo by zero", line); return mk(((x % y) + y) % y, fl);
      case "**": { const r = Math.pow(x, y); return mk(r, fl || y < 0); }
    }
  }
  function mkDate(d) { return { date: true, t: Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()), y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() }; }
  function formatSpec(v, spec, line) {
    if (!spec) return str(v);
    const m = spec.match(/^([<>^]?)(\d*)(,?)(?:\.(\d+))?([fd%]?)$/);
    if (!m) throw new PyErr("ValueError", `format spec '${spec}' isn't supported here (try .2f or ,)`, line);
    const [, align, width, comma, prec, type] = m; let s;
    if (type === "f" || (prec && type !== "%")) s = nv(v).toFixed(prec ? +prec : 6);
    else if (type === "%") s = (nv(v) * 100).toFixed(prec ? +prec : 6) + "%";
    else s = str(v);
    if (comma) { const [ip, dp] = s.split("."); s = ip.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (dp !== undefined ? "." + dp : ""); }
    if (width) { const w = +width; const al = align || (isNum(v) ? ">" : "<"); if (al === ">") s = s.padStart(w); else if (al === "^") { const pad = w - s.length; s = " ".repeat(Math.max(0, Math.floor(pad / 2))) + s + " ".repeat(Math.max(0, Math.ceil(pad / 2))); } else s = s.padEnd(w); }
    return s;
  }

  /* ---------------- interpreter ---------------- */
  class Env { constructor(parent) { this.vars = new Map(); this.parent = parent; }
    get(n, line) { let e = this; while (e) { if (e.vars.has(n)) return e.vars.get(n); e = e.parent; } throw new PyErr("NameError", `name '${n}' is not defined`, line); }
    set(n, v) { this.vars.set(n, v); } }
  const BREAK = { b: 1 }, CONT = { c: 1 };
  class Ret { constructor(v) { this.v = v; } }

  function run(src, opts = {}) {
    const out = []; let steps = 0; const MAX = opts.maxSteps || 3e6;
    const write = s => { out.push(s); if (opts.onOut) opts.onOut(s); };
    const g = new Env(null);
    const B = builtins(write);
    for (const [k, v] of Object.entries(B)) { v.pyname = k; g.set(k, v); }
    if (opts.globals) for (const [k, v] of Object.entries(opts.globals)) g.set(k, v);
    let line = 0;
    const tick = () => { if (++steps > MAX) throw new PyErr("TimeoutError", "your code ran too long (an endless loop?)", line); };

    function callv(f, args, kw, ln) {
      if (typeof f === "function") return f(args, kw || {}, ln);
      if (f && f.fn) {
        const env = new Env(f.closure); const ps = f.params;
        if (args.length > ps.length) throw new PyErr("TypeError", `${f.name}() takes ${ps.length} positional arguments but ${args.length} were given`, ln);
        ps.forEach((p, i) => {
          if (i < args.length) env.set(p.name, args[i]);
          else if (kw && p.name in kw) env.set(p.name, kw[p.name]);
          else if (p.def) env.set(p.name, p.defv);
          else throw new PyErr("TypeError", `${f.name}() missing required argument: '${p.name}'`, ln);
        });
        if (f.lambda) return ev(f.body, env);
        try { exec(f.body, env); } catch (e) { if (e instanceof Ret) return e.v; throw e; }
        return null;
      }
      throw new PyErr("TypeError", `'${typeName(f)}' object is not callable`, ln);
    }
    function assign(t, v, env) {
      if (t.k === "name") env.set(t.n, v);
      else if (t.k === "tuple" || t.k === "list") { const vals = iter(v, line); if (vals.length !== t.items.length) throw new PyErr("ValueError", `expected ${t.items.length} values to unpack, got ${vals.length}`, line); t.items.forEach((it, i) => assign(it, vals[i], env)); }
      else if (t.k === "sub") { const o = ev(t.o, env), i = ev(t.i, env);
        if (Array.isArray(o)) { if (o.tup) throw new PyErr("TypeError", "'tuple' object does not support item assignment", line); let ix = nv(i); if (ix < 0) ix += o.length; if (ix < 0 || ix >= o.length) throw new PyErr("IndexError", "list assignment index out of range", line); o[ix] = v; }
        else if (o instanceof Map) o.set(dkey(i), v); else throw new PyErr("TypeError", `'${typeName(o)}' object does not support item assignment`, line); }
      else throw new PyErr("SyntaxError", "cannot assign to that", line);
    }
    function exec(body, env) { for (const s of body) stmt(s, env); }
    function stmt(s, env) {
      tick(); line = s.line || line;
      switch (s.k) {
        case "expr": { const v = ev(s.e, env); if (opts.echo && v !== null && s === lastTop) write(repr(v)); return; }
        case "assign": { const v = ev(s.e, env); for (const t of s.targets) assign(t, v, env); return; }
        case "aug": { const cur = ev(s.t, env); assign(s.t, s.op === "+" && Array.isArray(cur) && !cur.tup ? (cur.push(...iter(ev(s.e, env), line)), cur) : arith(s.op, cur, ev(s.e, env), line), env); return; }
        case "pass": return; case "break": throw BREAK; case "continue": throw CONT;
        case "return": throw new Ret(s.e ? ev(s.e, env) : null);
        case "if": { for (const [c, b] of s.branches) if (truthy(ev(c, env))) return exec(b, env); if (s.els) exec(s.els, env); return; }
        case "while": { while (truthy(ev(s.c, env))) { tick(); try { exec(s.body, env); } catch (e) { if (e === BREAK) break; if (e === CONT) continue; throw e; } } return; }
        case "for": { for (const v of iter(ev(s.it, env), s.line)) { tick(); assign(s.target, v, env); try { exec(s.body, env); } catch (e) { if (e === BREAK) break; if (e === CONT) continue; throw e; } } return; }
        case "def": { const f = { fn: true, name: s.name, params: s.params.map(p => ({ ...p, defv: p.def ? ev(p.def, env) : undefined })), body: s.body, closure: env }; env.set(s.name, f); return; }
        case "import": for (const [n, as] of s.names) env.set(as, module(n, s.line)); return;
        case "from": { const m = module(s.mod, s.line); for (const [n, as] of s.names) { if (!(n in m)) throw new PyErr("ImportError", `cannot import name '${n}' from '${s.mod}'`, s.line); env.set(as, m[n]); } return; }
      }
    }
    function module(name, ln) {
      if (name === "math") return { mod: "math", sqrt: Object.assign(a => new F(Math.sqrt(nv(a[0]))), { pyname: "sqrt" }), floor: a => Math.floor(nv(a[0])), ceil: a => Math.ceil(nv(a[0])), pi: new F(Math.PI), e: new F(Math.E), exp: a => new F(Math.exp(nv(a[0]))), log: a => new F(Math.log(nv(a[0]))) };
      if (name === "statistics") return { mod: "statistics",
        mean: a => { const v = iter(a[0]).map(nv); if (!v.length) throw new PyErr("StatisticsError", "mean requires at least one data point", ln); return new F(v.reduce((s, x) => s + x, 0) / v.length); },
        median: a => { const v = iter(a[0]).map(nv).sort((x, y) => x - y), n = v.length; if (!n) throw new PyErr("StatisticsError", "no median for empty data", ln); return n % 2 ? mk(v[(n - 1) / 2], iter(a[0]).some(isFloat)) : new F((v[n / 2 - 1] + v[n / 2]) / 2); },
        stdev: a => { const v = iter(a[0]).map(nv), m = v.reduce((s, x) => s + x, 0) / v.length; return new F(Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1))); } };
      if (name === "datetime") { const date = (a) => mkDate(new Date(Date.UTC(nv(a[0]), nv(a[1]) - 1, nv(a[2])))); date.today = () => mkDate(new Date()); date.fromisoformat = a => { const [y, m, d] = String(a[0]).split("-").map(Number); return mkDate(new Date(Date.UTC(y, m - 1, d))); }; return { mod: "datetime", date, timedelta: (a, kw) => ({ td: true, days: nv(kw.days !== undefined ? kw.days : a[0] || 0) }) }; }
      if (name === "random") { let seed = 42; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }; return { mod: "random", random: () => new F(rnd()), randint: a => nv(a[0]) + Math.floor(rnd() * (nv(a[1]) - nv(a[0]) + 1)), choice: a => { const v = iter(a[0]); return v[Math.floor(rnd() * v.length)]; }, seed: a => { seed = nv(a[0]) || 1; return null; } }; }
      if (["pandas", "numpy", "sklearn", "matplotlib"].includes(name.split(".")[0])) throw new PyErr("ModuleNotFoundError", `'${name}' isn't available in the browser playground. Open the notebook kit in Google Colab to use ${name.split(".")[0]}.`, ln);
      throw new PyErr("ModuleNotFoundError", `No module named '${name}' (available here: math, statistics, datetime, random)`, ln);
    }
    function getattr(o, n, ln) {
      if (o && o.mod) { if (n in o) return o[n]; throw new PyErr("AttributeError", `module '${o.mod}' has no attribute '${n}'`, ln); }
      if (typeof o === "function" && n in o) return o[n];
      if (o && o.td && n === "days") return o.days;
      if (o && o.date) { if (n === "year") return o.y; if (n === "month") return o.m; if (n === "day") return o.d; if (n === "weekday") return () => (new Date(o.t).getUTCDay() + 6) % 7; if (n === "isoformat") return () => str(o); }
      const M = methods(o, ln); if (M && n in M) { const f = M[n]; f.pyname = n; return f; }
      throw new PyErr("AttributeError", `'${typeName(o)}' object has no attribute '${n}'`, ln);
    }
    function methods(o, ln) {
      if (typeof o === "string") return {
        upper: () => o.toUpperCase(), lower: () => o.toLowerCase(), title: () => o.replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase()),
        strip: a => (a[0] ? o.replace(new RegExp(`^[${a[0]}]+|[${a[0]}]+$`, "g"), "") : o.trim()), lstrip: () => o.trimStart(), rstrip: () => o.trimEnd(),
        split: a => (a[0] === undefined || a[0] === null ? o.trim().split(/\s+/).filter(Boolean) : o.split(a[0])), join: a => iter(a[0], ln).map(x => { if (typeof x !== "string") throw new PyErr("TypeError", `sequence item: expected str instance, ${typeName(x)} found`, ln); return x; }).join(o),
        replace: a => o.split(a[0]).join(a[1]), startswith: a => o.startsWith(a[0]), endswith: a => o.endsWith(a[0]), count: a => (a[0] === "" ? o.length + 1 : o.split(a[0]).length - 1),
        find: a => o.indexOf(a[0]), isdigit: () => /^\d+$/.test(o), isalpha: () => /^[A-Za-z]+$/.test(o), zfill: a => o.padStart(nv(a[0]), "0"), format: a => { let i = 0; return o.replace(/\{\}/g, () => str(a[i++])); } };
      if (Array.isArray(o)) return {
        append: a => { if (o.tup) throw new PyErr("AttributeError", "'tuple' object has no attribute 'append'", ln); o.push(a[0]); return null; }, extend: a => { o.push(...iter(a[0], ln)); return null; },
        insert: a => { o.splice(nv(a[0]), 0, a[1]); return null; }, pop: a => { if (!o.length) throw new PyErr("IndexError", "pop from empty list", ln); if (a.length) { let i = nv(a[0]); if (i < 0) i += o.length; return o.splice(i, 1)[0]; } return o.pop(); },
        remove: a => { const i = o.findIndex(x => eq(x, a[0])); if (i < 0) throw new PyErr("ValueError", "list.remove(x): x not in list", ln); o.splice(i, 1); return null; },
        count: a => o.filter(x => eq(x, a[0])).length, index: a => { const i = o.findIndex(x => eq(x, a[0])); if (i < 0) throw new PyErr("ValueError", `${repr(a[0])} is not in list`, ln); return i; },
        sort: (a, kw) => { const key = kw.key; const k = x => (key ? callv(key, [x], {}, ln) : x); o.sort((x, y) => cmpv(k(x), k(y), ln)); if (truthy(kw.reverse || false)) o.reverse(); return null; },
        reverse: () => { o.reverse(); return null; }, copy: () => o.slice() };
      if (o instanceof Map) return {
        get: a => (o.has(dkey(a[0])) ? o.get(dkey(a[0])) : a.length > 1 ? a[1] : null), keys: () => [...o.keys()], values: () => [...o.values()], items: () => [...o.entries()].map(e => tup(e)),
        update: a => { for (const [k, v] of a[0]) o.set(k, v); return null; }, pop: a => { const k = dkey(a[0]); if (!o.has(k)) { if (a.length > 1) return a[1]; throw new PyErr("KeyError", repr(a[0]), ln); } const v = o.get(k); o.delete(k); return v; }, copy: () => new Map(o) };
      return null;
    }
    function compRun(c, env, emit) {
      const loop = (i, scope) => {
        if (i === c.fors.length) return emit(scope);
        const f = c.fors[i];
        for (const v of iter(ev(f.it, scope), line)) { tick(); assign(f.target, v, scope); if (f.ifs.every(cond => truthy(ev(cond, scope)))) loop(i + 1, scope); }
      };
      loop(0, new Env(env));
    }
    function ev(e, env) {
      switch (e.k) {
        case "const": return e.v;
        case "name": return env.get(e.n, e.line || line);
        case "concat": return e.parts.map(p => (p.k === "fmt" ? formatSpec(ev(p.e, env), p.spec, line) : ev(p, env))).join("");
        case "tuple": return tup(e.items.map(x => ev(x, env)));
        case "list": return e.items.map(x => ev(x, env));
        case "dict": { const m = new Map(); for (const [k, v] of e.pairs) m.set(dkey(ev(k, env)), ev(v, env)); return m; }
        case "comp": { if (e.kind === "dict") { const m = new Map(); compRun(e, env, s => m.set(dkey(ev(e.elt, s)), ev(e.val, s))); return m; } const out = []; compRun(e, env, s => out.push(ev(e.elt, s))); return out; }
        case "or": { const l = ev(e.l, env); return truthy(l) ? l : ev(e.r, env); }
        case "and": { const l = ev(e.l, env); return truthy(l) ? ev(e.r, env) : l; }
        case "not": return !truthy(ev(e.e, env));
        case "ifx": return truthy(ev(e.c, env)) ? ev(e.a, env) : ev(e.b, env);
        case "neg": { const v = ev(e.e, env); if (!isNum(v)) throw new PyErr("TypeError", `bad operand type for unary -: '${typeName(v)}'`, line); return mk(-nv(v), isFloat(v)); }
        case "bin": return arith(e.op, ev(e.l, env), ev(e.r, env), line);
        case "cmp": {
          let a = ev(e.first, env);
          for (let i = 0; i < e.ops.length; i++) {
            const b = ev(e.rest[i], env), op = e.ops[i]; let r;
            if (op === "==") r = eq(a, b); else if (op === "!=") r = !eq(a, b);
            else if (op === "in" || op === "not in") { let has; if (typeof b === "string") { if (typeof a !== "string") throw new PyErr("TypeError", "'in <string>' requires string as left operand", line); has = b.includes(a); } else if (b instanceof Map) has = b.has(dkey(a)); else has = iter(b, line).some(x => eq(x, a)); r = op === "in" ? has : !has; }
            else if (op === "is") r = a === b || (a === null && b === null); else if (op === "is not") r = !(a === b);
            else { const c = cmpv(a, b, line); r = op === "<" ? c < 0 : op === ">" ? c > 0 : op === "<=" ? c <= 0 : c >= 0; }
            if (!r) return false; a = b;
          }
          return true;
        }
        case "call": {
          const f = ev(e.f, env), args = e.args.map(a => ev(a, env)), kw = {};
          for (const [n, v] of e.kw) kw[n] = ev(v, env);
          return callv(f, args, kw, line);
        }
        case "attr": return getattr(ev(e.o, env), e.n, line);
        case "sub": {
          const o = ev(e.o, env);
          if (e.i && e.i.k === "slice") {
            if (!Array.isArray(o) && typeof o !== "string") throw new PyErr("TypeError", `'${typeName(o)}' object is not subscriptable`, line);
            const n = o.length, st = e.i.c ? nv(ev(e.i.c, env)) : 1;
            const norm = (v, d) => { if (v === null || v === undefined) return d; let x = nv(v); if (x < 0) x += n; return Math.max(st > 0 ? 0 : -1, Math.min(x, st > 0 ? n : n - 1)); };
            const a = norm(e.i.a ? ev(e.i.a, env) : null, st > 0 ? 0 : n - 1), b = norm(e.i.b ? ev(e.i.b, env) : null, st > 0 ? n : -1);
            const res = []; if (st > 0) for (let i = a; i < b; i += st) res.push(o[i]); else for (let i = a; i > b; i += st) res.push(o[i]);
            return typeof o === "string" ? res.join("") : o.tup ? tup(res) : res;
          }
          const i = ev(e.i, env);
          if (Array.isArray(o) || typeof o === "string") { if (!isNum(i) || isFloat(i)) throw new PyErr("TypeError", "indices must be integers", line); let ix = nv(i); if (ix < 0) ix += o.length; if (ix < 0 || ix >= o.length) throw new PyErr("IndexError", `${typeof o === "string" ? "string" : Array.isArray(o) && o.tup ? "tuple" : "list"} index out of range`, line); return o[ix]; }
          if (o instanceof Map) { const k = dkey(i); if (!o.has(k)) throw new PyErr("KeyError", repr(i), line); return o.get(k); }
          throw new PyErr("TypeError", `'${typeName(o)}' object is not subscriptable`, line);
        }
        case "lambda": return { fn: true, lambda: true, name: "<lambda>", params: e.params, body: e.body, closure: env };
      }
      throw new PyErr("SyntaxError", "unsupported expression", line);
    }
    function builtins(write) {
      const mm = (pick) => (a, kw, ln) => { let v = a.length === 1 ? iter(a[0], ln) : a; if (!v.length) { if ("default" in kw) return kw.default; throw new PyErr("ValueError", `${pick > 0 ? "max" : "min"}() arg is an empty sequence`, ln); } const key = kw.key; let best = v[0], bk = key ? callv(key, [best], {}, ln) : best; for (const x of v.slice(1)) { const k = key ? callv(key, [x], {}, ln) : x; if (cmpv(k, bk, ln) * pick > 0) { best = x; bk = k; } } return best; };
      return {
        print: (a, kw) => { write(a.map(x => str(x)).join(kw.sep !== undefined ? kw.sep : " ") + (kw.end !== undefined ? kw.end : "\n")); return null; },
        len: (a, kw, ln) => { const x = a[0]; if (typeof x === "string" || Array.isArray(x)) return x.length; if (x instanceof Map) return x.size; throw new PyErr("TypeError", `object of type '${typeName(x)}' has no len()`, ln); },
        sum: (a, kw, ln) => { let t = a.length > 1 ? a[1] : 0; for (const x of iter(a[0], ln)) t = arith("+", t, x, ln); return t; },
        min: mm(-1), max: mm(1), abs: a => mk(Math.abs(nv(a[0])), isFloat(a[0])),
        round: (a) => { const x = nv(a[0]); if (a.length < 2 || a[1] === null) { const r = Math.round(x); return Math.abs(x % 1) === 0.5 ? (r % 2 === 0 ? r : r - 1) : r; } const p = Math.pow(10, nv(a[1])); let v = Math.round((x + Number.EPSILON * Math.sign(x)) * p) / p; return isFloat(a[0]) || !Number.isInteger(x) ? new F(v) : v; },
        range: (a) => { const n = a.map(nv); return { range: n.length === 1 ? [0, n[0], 1] : [n[0], n[1], n[2] || 1] }; },
        sorted: (a, kw, ln) => { const v = iter(a[0], ln).slice(); const k = x => (kw.key ? callv(kw.key, [x], {}, ln) : x); v.sort((x, y) => cmpv(k(x), k(y), ln)); if (truthy(kw.reverse || false)) v.reverse(); return v; },
        reversed: (a, kw, ln) => iter(a[0], ln).slice().reverse(),
        int: (a, kw, ln) => { const x = a[0]; if (typeof x === "string") { if (!/^\s*[+-]?\d+\s*$/.test(x)) throw new PyErr("ValueError", `invalid literal for int() with base 10: ${repr(x)}`, ln); return parseInt(x, 10); } return Math.trunc(nv(x || 0)); },
        float: (a, kw, ln) => { const x = a[0]; if (typeof x === "string") { const v = parseFloat(x); if (Number.isNaN(v)) throw new PyErr("ValueError", `could not convert string to float: ${repr(x)}`, ln); return new F(v); } return new F(nv(x || 0)); },
        str: a => (a.length ? str(a[0]) : ""), bool: a => truthy(a[0]), list: (a, kw, ln) => (a.length ? iter(a[0], ln).slice() : []), tuple: (a, kw, ln) => tup(a.length ? iter(a[0], ln).slice() : []),
        dict: (a, kw) => { const m = new Map(); if (a[0]) for (const [k, v] of (a[0] instanceof Map ? a[0].entries() : iter(a[0]))) m.set(dkey(k), v); for (const [k, v] of Object.entries(kw)) m.set(k, v); return m; },
        set: (a, kw, ln) => { const out = []; for (const x of iter(a[0] || [], ln)) if (!out.some(y => eq(x, y))) out.push(x); return out; },
        zip: (a, kw, ln) => { const ls = a.map(x => iter(x, ln)); const n = Math.min(...ls.map(l => l.length)); const out = []; for (let i = 0; i < n; i++) out.push(tup(ls.map(l => l[i]))); return out; },
        enumerate: (a, kw, ln) => iter(a[0], ln).map((x, i) => tup([i + nv(a[1] || kw.start || 0), x])),
        type: a => ({ __type: true, toString: () => `<class '${typeName(a[0])}'>` }) && `<class '${typeName(a[0])}'>`,
        isinstance: () => { throw new PyErr("NotImplementedError", "isinstance() isn't supported here; try type(x)"); },
        input: () => { throw new PyErr("NotImplementedError", "input() can't ask questions in this playground; set a variable instead"); },
        any: (a, kw, ln) => iter(a[0], ln).some(truthy), all: (a, kw, ln) => iter(a[0], ln).every(truthy)
      };
    }
    let lastTop = null;
    try {
      const prog = parse(src);
      lastTop = prog.body[prog.body.length - 1];
      exec(prog.body, g);
      return { ok: true, out: out.join("") };
    } catch (e) {
      if (e === BREAK || e === CONT) e = new PyErr("SyntaxError", "'break' or 'continue' outside loop", line);
      if (e instanceof Ret) e = new PyErr("SyntaxError", "'return' outside function", line);
      if (!(e instanceof PyErr)) e = new PyErr("Error", e && e.message ? e.message : String(e), line);
      return { ok: false, out: out.join(""), error: `${e.kind}: ${e.message}`, line: e.line || line };
    }
  }
  const toPy = v => (v === null || v === undefined ? null : typeof v === "number" ? (Number.isInteger(v) ? v : new F(v)) : Array.isArray(v) ? v.map(toPy) : typeof v === "object" ? new Map(Object.entries(v).map(([k, x]) => [k, toPy(x)])) : v);
  root.MiniPy = { run, toPy };
})(typeof window !== "undefined" ? window : globalThis);
