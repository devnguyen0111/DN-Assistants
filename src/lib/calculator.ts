export type Token =
  | { type: "number"; value: number }
  | { type: "op"; value: "+" | "-" | "*" | "/" | "%" }
  | { type: "paren"; value: "(" | ")" };

const PRECEDENCE: Record<string, number> = {
  "+": 1,
  "-": 1,
  "*": 2,
  "/": 2,
  "%": 2,
};

export function tokenize(expression: string): Token[] {
  const src = expression.replace(/×/g, "*").replace(/÷/g, "/").replace(/\s+/g, "");
  const tokens: Token[] = [];
  let i = 0;

  while (i < src.length) {
    const ch = src[i];
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

    if (ch === "+" || ch === "-" || ch === "*" || ch === "/" || ch === "%") {
      const unary =
        (ch === "+" || ch === "-") &&
        (tokens.length === 0 ||
          tokens[tokens.length - 1].type === "op" ||
          (tokens[tokens.length - 1].type === "paren" && tokens[tokens.length - 1].value === "("));
      if (unary) {
        let j = i + 1;
        while (j < src.length && ((src[j] >= "0" && src[j] <= "9") || src[j] === ".")) j += 1;
        if (j === i + 1) throw new Error("Invalid unary");
        const value = Number(src.slice(i, j));
        if (!Number.isFinite(value)) throw new Error("Invalid number");
        tokens.push({ type: "number", value });
        i = j;
        continue;
      }
      tokens.push({ type: "op", value: ch });
      i += 1;
      continue;
    }

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
    if (token.type === "op") {
      while (
        stack.length > 0 &&
        stack[stack.length - 1].type === "op" &&
        PRECEDENCE[(stack[stack.length - 1] as Extract<Token, { type: "op" }>).value] >=
          PRECEDENCE[token.value]
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
    while (
      stack.length > 0 &&
      !(stack[stack.length - 1].type === "paren" && stack[stack.length - 1].value === "(")
    ) {
      output.push(stack.pop()!);
    }
    if (stack.length === 0) throw new Error("Mismatched parentheses");
    stack.pop();
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
    if (token.type !== "op") throw new Error("Invalid expression");
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
      default:
        throw new Error("Unknown operator");
    }
    stack.push(result);
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
