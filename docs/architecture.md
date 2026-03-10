1. System Architecture
High-level view

Client (Browser)

Renders the calculator UI.
Handles user input (mouse/touch/keyboard).
Executes calculation logic locally in JavaScript/TypeScript.
Manages UI state (current operand, operator, result, error states).
Static Web Server / CDN

Serves static assets (HTML, CSS, JS, images).
Provides HTTPS termination.
Optionally provides observability (access logs) and uptime monitoring.
Analytics / Monitoring (optional)

Collects minimal anonymous usage metrics (page views, error rates, performance timings) aligned with PRD success metrics.
Key decision:

No application server or database is required for v1. All calculations happen client-side, aligning with NFR-8 (no persisted user data) and NFR-4 (works offline once loaded).
2. Components
2.1 Frontend Components (Logical)
App Shell / Layout

Bootstraps the calculator application.
Sets up global styles, theming, and root DOM container.
Display Component

Shows:
Current input (numbers the user is typing).
Current operator (optional small label, e.g., 12 +).
Result or error message.
Handles formatting (precision, truncation, error text).
Keypad Component

Organized into groups:
Digit keys: 0–9.
Decimal key: ..
Operator keys: +, -, ×, ÷.
Action keys: =, C/AC, CE (backspace).
Emits semantic events (e.g., onDigitPress(7), onOperatorPress('+')).
Keyboard Input Handler

Listens for keypress/keydown events (0–9, ., +, -, *, /, Enter, Backspace, Escape).
Normalizes keyboard events and forwards them to the same handlers used by Keypad.
Calculator State & Logic Module

Holds the current state:
currentValue (string/number being entered).
previousValue (stored operand).
currentOperator (+, -, *, /).
isResultDisplayed flag.
error state (e.g., divide by zero).
Exposes operations:
inputDigit(d), inputDecimal().
setOperator(op).
calculateResult().
clearAll(), clearEntry().
Responsible for FR-9/FR-10 sequential evaluation behavior.
Accessibility & Focus Manager

Manages focus order for buttons.
Applies ARIA attributes and accessible labels.
Ensures visible focus states and proper semantics.
Analytics Client (optional)

Sends anonymous events (e.g., “calculation completed”, “divide by zero error”) to an analytics endpoint/SAAS (e.g., Google Analytics, Plausible).
Only high-level, non-PII metrics.
3. API Design
For v1, you can keep all business logic client-side and treat “APIs” as internal module interfaces. If you later want a backend, this section doubles as a starting point.

3.1 Internal Frontend API (Module Interfaces)
Calculator Logic Service

CalculatorService (pure logic, testable):

inputDigit(digit: string): void
inputDecimal(): void
setOperator(operator: '+' | '-' | '*' | '/'): void
calculateResult(): void
clearAll(): void
clearEntry(): void
getState(): CalculatorState
CalculatorState:

type CalculatorState = {
  currentValue: string;      // current input
  previousValue: string;     // stored operand
  currentOperator: '+' | '-' | '*' | '/' | null;
  isResultDisplayed: boolean;
  error: string | null;      // e.g. "Cannot divide by zero"
};
UI Component Contracts

Display props:

value: string (current display text).
secondaryValue?: string (optional pending operation).
error?: string | null.
Keypad props:

onDigitPress(digit: string): void
onDecimalPress(): void
onOperatorPress(operator: '+' | '-' | '*' | '/'): void
onEqualsPress(): void
onClearAll(): void
onClearEntry(): void
3.2 Optional Backend API (Future Extension)
If you later decide to log metrics or offload calculations (for experimentation), a minimal REST API could be:

POST /api/calc

Request:

{
  "expression": "5+3*2",
  "mode": "sequential"  // or "algebraic" for future
}
Response:

{
  "result": 16,
  "error": null
}
POST /api/metrics

Request:

{
  "event": "calculation_completed",
  "timestamp": "2026-03-10T10:00:00Z",
  "metadata": {
    "operationsCount": 3,
    "deviceType": "mobile"
  }
}
For now, this is not required to fulfill the PRD.

4. Data Flow
4.1 Typical Calculation (Happy Path)
User input

User clicks 5 → Keypad calls onDigitPress('5').
Or presses key 5 → KeyboardHandler normalizes and calls inputDigit('5').
State update

CalculatorService.inputDigit('5') updates currentValue.
App subscribes to state changes and re-renders.
Operator selection

User presses + (Keypad or keyboard).
CalculatorService.setOperator('+') moves currentValue to previousValue, sets currentOperator.
Second operand input

User enters 3 → inputDigit('3').
Compute result

User presses = or Enter.
CalculatorService.calculateResult():
Parses numeric values.
Executes previousValue + currentValue.
Handles precision/rounding.
Updates currentValue with result, sets isResultDisplayed = true.
Display update

Display shows result (8), clears or adjusts secondary operation display.
Analytics (optional)

AnalyticsClient logs a calculation_completed event.
4.2 Error Flow (Division by Zero)
User inputs 5 ÷ 0 =.
CalculatorService.calculateResult() detects division by zero.
Sets error = "Cannot divide by zero" and freezes further operations until user clears.
Display shows error message; buttons remain active.
User presses C/AC → clearAll() resets all state.
4.3 Clear & Clear Entry
Clear Entry (CE/backspace):
Removes last character from currentValue, or resets currentValue to 0 if empty.
Clear All (C/AC):
Resets currentValue, previousValue, currentOperator, error, isResultDisplayed.
5. Technology Stack
Aligned with simplicity, performance, and maintainability.

Frontend

Language: TypeScript (preferred) or JavaScript (ES6+).
Framework:
Option A (simple): Vanilla JS/TS + minimal component structure.
Option B (structured): React or Vue for clearer stateful UI.
Styling:
CSS modules or Tailwind CSS for responsive layout.
Ensure WCAG-compliant color contrast and focus states.
Build & Tooling

Bundler: Vite, Webpack, or similar (Vite recommended for speed).
Testing:
Unit tests: Jest or Vitest for CalculatorService.
Component tests: React Testing Library / Vue Test Utils (if using framework).
Linting & Formatting:
ESLint, Prettier integrated into CI.
Hosting

Static hosting on:
GitHub Pages, Netlify, Vercel, or any static file server/CDN.
HTTPS enabled (NFR-9).
Analytics / Monitoring (optional)

Lightweight analytics: Plausible/Umami or Google Analytics.
Uptime monitoring: service like UptimeRobot or built-in from Netlify/Vercel.