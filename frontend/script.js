const API_URL = 'http://localhost:3000/calculate';

const displayEl = document.getElementById('display');
const errorEl = document.getElementById('error');
const keypadEl = document.querySelector('.keypad');

let currentValue = '0';
let storedValue = null;
let currentOperation = null;
let isResultDisplayed = false;

function updateDisplay() {
  displayEl.textContent = currentValue;
}

function setError(message) {
  errorEl.textContent = message || '';
}

function clearAll() {
  currentValue = '0';
  storedValue = null;
  currentOperation = null;
  isResultDisplayed = false;
  setError('');
  updateDisplay();
}

function clearEntry() {
  if (isResultDisplayed) {
    clearAll();
    return;
  }

  if (currentValue.length <= 1) {
    currentValue = '0';
  } else {
    currentValue = currentValue.slice(0, -1);
  }
  updateDisplay();
}

function inputDigit(digit) {
  if (isResultDisplayed) {
    currentValue = digit;
    isResultDisplayed = false;
  } else if (currentValue === '0') {
    currentValue = digit;
  } else {
    currentValue += digit;
  }
  updateDisplay();
}

function inputDecimal() {
  if (isResultDisplayed) {
    currentValue = '0.';
    isResultDisplayed = false;
  } else if (!currentValue.includes('.')) {
    currentValue += '.';
  }
  updateDisplay();
}

function chooseOperation(operation) {
  if (currentOperation && !isResultDisplayed) {
    // Chain operations by calculating with existing storedValue and currentValue
    calculateWithBackend(currentOperation, storedValue, Number(currentValue), true);
    return;
  }
  storedValue = Number(currentValue);
  currentOperation = operation;
  // Reset the display so the next number starts fresh
  currentValue = '0';
  isResultDisplayed = true;
  updateDisplay();
  setError('');
}

async function calculateWithBackend(operation, n1, n2, chain = false) {
  try {
    setError('');
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number1: n1,
        number2: n2,
        operation,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error || 'Calculation failed');
      return;
    }

    currentValue = String(data.result);
    updateDisplay();

    storedValue = chain ? data.result : null;
    currentOperation = chain ? operation : null;
    isResultDisplayed = !chain;
  } catch (e) {
    setError('Unable to reach calculator API');
  }
}

function handleEquals() {
  if (currentOperation == null || storedValue == null) {
    return;
  }
  const n2 = Number(currentValue);
  calculateWithBackend(currentOperation, storedValue, n2, false);
}

if (keypadEl) {
  keypadEl.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;

    const digit = target.getAttribute('data-digit');
    const op = target.getAttribute('data-op');
    const decimal = target.getAttribute('data-decimal');
    const action = target.getAttribute('data-action');

    if (digit !== null) {
      inputDigit(digit);
    } else if (decimal !== null) {
      inputDecimal();
    } else if (op !== null) {
      chooseOperation(op);
    } else if (action === 'equals') {
      handleEquals();
    } else if (action === 'clear-all') {
      clearAll();
    } else if (action === 'clear-entry') {
      clearEntry();
    }
  });
}

// Initialize
updateDisplay();

