export type Token =
  | { type: "number"; value: number }
  | { type: "op"; value: "+" | "-" | "*" | "/" | "%" | "^" }
  | { type: "fn"; value: "sin" | "cos" | "tan" | "log" | "ln" | "sqrt" | "abs" }
  | { type: "paren"; value: "(" | ")" };

const PRECEDENCE: Record<string, number> = {
  "+": 1,
  "-": 1,
  "*": 2,
  "/": 2,
  "%": 2,
  "^": 3,
};

const KNOWN_FUNCS = ["sin", "cos", "tan", "log", "ln", "sqrt", "abs"] as const;

export function tokenize(expression: string): Token[] {
  // Pre-process common symbols
  let src = expression
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/π/gi, String(Math.PI))
    .replace(/√/g, "sqrt")
    .replace(/\s+/g, "");

  // Replace isolated constant 'e' (not within a word like 'exp' or scientific notation like '1e5')
  src = src.replace(/(^|[^a-zA-Z0-9.])e([^a-zA-Z0-9.]|$)/g, `$1${Math.E}$2`);

  const tokens: Token[] = [];
  let i = 0;

  while (i < src.length) {
    const ch = src[i];

    // Numbers (including scientific decimals)
    if ((ch >= "0" && ch <= "9") || ch === ".") {
      let j = i + 1;
      while (j < src.length && ((src[j] >= "0" && src[j] <= "9") || src[j] === ".")) j += 1;
      const raw = src.slice(i, j);
      const value = Number(raw);
      if (!Number.isFinite(value)) throw new Error("Invalid number");
      tokens.push({ type: "number", value });
      i = j;
      continue;
    }

    // Alphabetic functions (sin, cos, tan, log, ln, sqrt, abs)
    if (ch >= "a" && ch <= "z") {
      let j = i + 1;
      while (j < src.length && src[j] >= "a" && src[j] <= "z") j += 1;
      const fnName = src.slice(i, j).toLowerCase();
      if (KNOWN_FUNCS.includes(fnName as (typeof KNOWN_FUNCS)[number])) {
        tokens.push({
          type: "fn",
          value: fnName as (typeof KNOWN_FUNCS)[number],
        });
        i = j;
        continue;
      }
      throw new Error(`Unknown function: ${fnName}`);
    }

    // Operators
    if (ch === "+" || ch === "-" || ch === "*" || ch === "/" || ch === "%" || ch === "^") {
      const isUnary =
        (ch === "+" || ch === "-") &&
        (tokens.length === 0 ||
          tokens[tokens.length - 1].type === "op" ||
          (tokens[tokens.length - 1].type === "paren" && tokens[tokens.length - 1].value === "(") ||
          tokens[tokens.length - 1].type === "fn");

      if (isUnary) {
        // Read the number following unary sign
        let j = i + 1;
        while (j < src.length && ((src[j] >= "0" && src[j] <= "9") || src[j] === ".")) j += 1;
        if (j > i + 1) {
          const raw = src.slice(i, j);
          const value = Number(raw);
          if (!Number.isFinite(value)) throw new Error("Invalid number");
          tokens.push({ type: "number", value });
          i = j;
          continue;
        }
        // If unary followed by function or parenthesis e.g. -(2), treat as 0 - (2)
        tokens.push({ type: "number", value: 0 });
        tokens.push({ type: "op", value: ch });
        i += 1;
        continue;
      }

      tokens.push({ type: "op", value: ch });
      i += 1;
      continue;
    }

    // Parentheses
    if (ch === "(" || ch === ")") {
      tokens.push({ type: "paren", value: ch });
      i += 1;
      continue;
    }

    throw new Error(`Unexpected character: ${ch}`);
  }

  return tokens;
}

function toRpn(tokens: Token[]): Token[] {
  const output: Token[] = [];
  const stack: Token[] = [];

  for (const token of tokens) {
    if (token.type === "number") {
      output.push(token);
      continue;
    }

    if (token.type === "fn") {
      stack.push(token);
      continue;
    }

    if (token.type === "op") {
      while (
        stack.length > 0 &&
        stack[stack.length - 1].type === "op" &&
        PRECEDENCE[(stack[stack.length - 1] as Extract<Token, { type: "op" }>).value] >=
          PRECEDENCE[token.value] &&
        token.value !== "^" // '^' is right-associative
      ) {
        output.push(stack.pop()!);
      }
      stack.push(token);
      continue;
    }

    if (token.value === "(") {
      stack.push(token);
      continue;
    }

    if (token.value === ")") {
      while (
        stack.length > 0 &&
        !(stack[stack.length - 1].type === "paren" && stack[stack.length - 1].value === "(")
      ) {
        output.push(stack.pop()!);
      }
      if (stack.length === 0) throw new Error("Mismatched parentheses");
      stack.pop(); // discard '('

      // If the token before '(' was a function, pop it to output
      if (stack.length > 0 && stack[stack.length - 1].type === "fn") {
        output.push(stack.pop()!);
      }
      continue;
    }
  }

  while (stack.length > 0) {
    const top = stack.pop()!;
    if (top.type === "paren") throw new Error("Mismatched parentheses");
    output.push(top);
  }

  return output;
}

function evalRpn(tokens: Token[]): number {
  const stack: number[] = [];

  for (const token of tokens) {
    if (token.type === "number") {
      stack.push(token.value);
      continue;
    }

    if (token.type === "fn") {
      const arg = stack.pop();
      if (arg === undefined) throw new Error("Missing argument for function");
      let res: number;
      switch (token.value) {
        case "sin":
          // degrees or radians? In standard desktop calculators, sin is commonly in degrees or radians. Let's do degrees if user expects standard or radians. In JS Math.sin is radians. Let's convert degrees to radians: (arg * Math.PI) / 180
          res = Math.sin((arg * Math.PI) / 180);
          break;
        case "cos":
          res = Math.cos((arg * Math.PI) / 180);
          break;
        case "tan": {
          const rad = (arg * Math.PI) / 180;
          res = Math.tan(rad);
          break;
        }
        case "log":
          if (arg <= 0) throw new Error("Log of non-positive number");
          res = Math.log10(arg);
          break;
        case "ln":
          if (arg <= 0) throw new Error("Ln of non-positive number");
          res = Math.log(arg);
          break;
        case "sqrt":
          if (arg < 0) throw new Error("Square root of negative number");
          res = Math.sqrt(arg);
          break;
        case "abs":
          res = Math.abs(arg);
          break;
        default:
          throw new Error("Unknown function");
      }
      stack.push(res);
      continue;
    }

    if (token.type === "op") {
      const b = stack.pop();
      const a = stack.pop();
      if (a === undefined || b === undefined) throw new Error("Invalid expression");
      let result: number;
      switch (token.value) {
        case "+":
          result = a + b;
          break;
        case "-":
          result = a - b;
          break;
        case "*":
          result = a * b;
          break;
        case "/":
          if (b === 0) throw new Error("Division by zero");
          result = a / b;
          break;
        case "%":
          result = a % b;
          break;
        case "^":
          result = Math.pow(a, b);
          break;
        default:
          throw new Error("Unknown operator");
      }
      stack.push(result);
      continue;
    }

    throw new Error("Invalid expression structure");
  }

  if (stack.length !== 1) throw new Error("Invalid expression");
  return stack[0];
}

export function evaluate(expression: string): number {
  const trimmed = expression.trim();
  if (!trimmed) throw new Error("Empty expression");
  return evalRpn(toRpn(tokenize(trimmed)));
}

export function formatResult(value: number): string {
  if (!Number.isFinite(value)) return "Error";
  const rounded = Math.round(value * 1e10) / 1e10;
  return String(rounded);
}
