## Low-Level Design: Calculator API

### 1. Overview

This document specifies the low-level design for a simple, stateless **Calculator API** that exposes basic arithmetic operations (addition, subtraction, multiplication, division) over HTTP.  
The API is designed to:
- Be easy to integrate with any client (web, mobile, CLI).
- Be stateless and idempotent for the same input.
- Be extensible to new operations in future versions.

All examples assume a base URL of `/api/v1`.

---

### 2. API Endpoints

- **POST `/api/v1/calculate`**  
  Single, general-purpose endpoint that performs basic arithmetic on a list of operands.

- **(Optional / Future) POST `/api/v1/calculate/{operation}`**  
  Operation-specific endpoints (`addition`, `subtraction`, `multiplication`, `division`) built on the same internal logic:
  - `/api/v1/calculate/addition`
  - `/api/v1/calculate/subtraction`
  - `/api/v1/calculate/multiplication`
  - `/api/v1/calculate/division`

For v1, only **`POST /api/v1/calculate`** is required; operation-specific endpoints are an optional extension.

---

### 3. Request & Response Schemas

#### 3.1 Common Types

```json
// Operation enum
"operation": "add" | "subtract" | "multiply" | "divide"
```

```json
// Error object
{
  "code": "string",        // machine-readable error code, e.g. "VALIDATION_ERROR"
  "message": "string",     // human-readable summary
  "details": "string|null" // optional additional info for debugging
}
```

#### 3.2 POST `/api/v1/calculate`

**Description**: Perform a basic arithmetic operation on one or more operands using sequential evaluation (left-to-right), aligning with the PRD (no algebraic precedence in v1).

**Request Body (JSON)**

```json
{
  "operation": "add",
  "operands": [5, 3],
  "precision": 10
}
```

- **operation** (required, string):
  - One of: `"add"`, `"subtract"`, `"multiply"`, `"divide"`.
- **operands** (required, array of number):
  - Minimum length:
    - For `"add"` and `"multiply"`: 2 or more.
    - For `"subtract"` and `"divide"`: 2 or more (left-to-right evaluation).
  - Each value must be a finite number within allowed numeric bounds (see validation).
- **precision** (optional, integer):
  - Number of decimal places to round the result to.
  - Default: `10` (aligns with PRD requirement of at least 10 digits precision).
  - Min: `0`, Max: `15` (or configured upper bound).

**Successful Response (200 OK)**

```json
{
  "result": 8,
  "operation": "add",
  "operands": [5, 3],
  "precision": 10,
  "meta": {
    "evaluatedSequentially": true,
    "durationMs": 1
  }
}
```

- **result** (number):
  - The computed result after performing the operation sequentially on all operands.
- **operation**, **operands**, **precision**:
  - Echoed from the request (after validation / normalization).
- **meta** (object):
  - **evaluatedSequentially** (boolean): Always `true` for v1.
  - **durationMs** (number): Optional timing metadata for observability.

**Error Responses**

- **400 Bad Request** – Validation or user input errors.
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Invalid request body.",
      "details": "Field 'operation' must be one of: add, subtract, multiply, divide."
    }
  }
  ```

- **422 Unprocessable Entity** – Semantically invalid operation (e.g., division by zero).
  ```json
  {
    "error": {
      "code": "DIVISION_BY_ZERO",
      "message": "Division by zero is not allowed.",
      "details": "Operand at index 1 is zero."
    }
  }
  ```

- **500 Internal Server Error** – Unexpected server error.
  ```json
  {
    "error": {
      "code": "INTERNAL_SERVER_ERROR",
      "message": "An unexpected error occurred.",
      "details": null
    }
  }
  ```

---

### 4. Validation Rules

Validation is performed in three layers: **transport-level**, **schema-level**, and **business rules**.

#### 4.1 Transport-Level Validation

- **Content-Type**:
  - Requests must specify `Content-Type: application/json`.
  - If missing or incorrect, return **415 Unsupported Media Type**.
- **Body Parsing**:
  - If the JSON body cannot be parsed, return **400 Bad Request** with:
    - `code: "INVALID_JSON"`.

#### 4.2 Schema-Level Validation

On `POST /api/v1/calculate`, validate:

- **operation**:
  - Required.
  - Type: string.
  - Allowed values: `"add"`, `"subtract"`, `"multiply"`, `"divide"`.
  - Case-sensitive; if supporting case-insensitivity, normalize to lowercase.

- **operands**:
  - Required.
  - Type: array.
  - Must not be empty.
  - Length:
    - `"add"`: at least 2 operands.
    - `"multiply"`: at least 2 operands.
    - `"subtract"`: at least 2 operands.
    - `"divide"`: at least 2 operands.
  - Each operand:
    - Type: number (no strings).
    - Must be finite: reject `NaN`, `Infinity`, `-Infinity`.
    - Should be within numeric bounds to avoid overflow, e.g.:
      - Min: `-1e12`, Max: `1e12` (configurable).

- **precision**:
  - Optional.
  - Type: integer.
  - Min: `0`, Max: `15`.
  - If omitted, default to `10`.

If any schema validation fails:
- Return **400 Bad Request**.
- Use `code: "VALIDATION_ERROR"`.
- Include a clear `details` message (e.g., `"Field 'operands' must contain at least 2 numbers for operation 'add'."`).

#### 4.3 Business Rules Validation

- **Division by zero**:
  - If `operation === "divide"` and any divisor in the sequential operation is `0`, reject the request:
    - Return **422 Unprocessable Entity**.
    - `code: "DIVISION_BY_ZERO"`.
    - Include index of offending operand in `details` where applicable.

- **Numeric overflow / underflow**:
  - If during computation the intermediate or final value exceeds defined bounds:
    - Return **422 Unprocessable Entity**.
    - `code: "NUMERIC_OVERFLOW"`.
    - Provide a generic message, avoid leaking internal numeric limits.

- **Precision handling**:
  - All operations are performed using double-precision floats.
  - After computation, result is rounded to `precision` decimal places.
  - Trailing zeros after the decimal may be trimmed for presentation, but internal computation respects `precision`.

---

### 5. Error Handling Strategy

#### 5.1 Error Response Envelope

All error responses follow a consistent JSON structure:

```json
{
  "error": {
    "code": "STRING_CODE",
    "message": "Human readable message.",
    "details": "Optional extra info or null."
  }
}
```

- **code**:
  - Machine-readable, UPPER_SNAKE_CASE.
  - Examples: `"VALIDATION_ERROR"`, `"DIVISION_BY_ZERO"`, `"NUMERIC_OVERFLOW"`, `"INVALID_JSON"`, `"INTERNAL_SERVER_ERROR"`.
- **message**:
  - Short, human-readable description safe for end users.
- **details**:
  - Optional deep-dive information (e.g., which field failed validation).
  - Should not include sensitive server internals.

#### 5.2 HTTP Status Codes

- **200 OK**
  - Successful calculation.

- **400 Bad Request**
  - Invalid JSON.
  - Schema validation failures (missing fields, wrong types, invalid enum values, invalid precision, operands array too short).

- **401 Unauthorized / 403 Forbidden** (optional for secured environments)
  - If authentication/authorization is added later.

- **415 Unsupported Media Type**
  - Missing or incorrect `Content-Type` (not `application/json`).

- **422 Unprocessable Entity**
  - Business rule violations:
    - Division by zero.
    - Numeric overflow/underflow.

- **429 Too Many Requests** (optional)
  - If rate limiting is introduced.

- **500 Internal Server Error**
  - Unexpected unhandled errors.
  - Always includes `code: "INTERNAL_SERVER_ERROR"`.

#### 5.3 Logging & Observability

- Log all **4xx** and **5xx** responses on the server with:
  - Correlation/request ID (if available).
  - Operation, operand count, execution duration.
  - Error code and details.
- Do not log full operand arrays if they might contain sensitive data (for this calculator, operands are generally safe, but the design allows future constraints).
- Expose basic metrics:
  - Total requests.
  - Error rate per error code.
  - Average latency.

---

### 6. Extensibility Considerations

- Adding new operations (e.g., percentage, square root, exponentiation) should be done by:
  - Extending the `operation` enum with new values.
  - Implementing a corresponding handler in the calculation module.
  - Optionally exposing new `POST /api/v1/calculate/{operation}` endpoints that delegate to the same core logic.
- Versioning:
  - Major backward-incompatible changes (e.g., introduction of algebraic precedence, change in request schema) should be exposed via a new base path, e.g., `/api/v2`.

This low-level design ensures a small, consistent, and easily testable Calculator API that aligns with the PRD and can support future feature growth.

