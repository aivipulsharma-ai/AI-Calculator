const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post('/calculate', (req, res) => {
  const { number1, number2, operation } = req.body || {};

  // Basic validation
  if (number1 === undefined || number2 === undefined || !operation) {
    return res.status(400).json({
      error: 'number1, number2 and operation are required',
    });
  }

  const n1 = Number(number1);
  const n2 = Number(number2);

  if (!Number.isFinite(n1) || !Number.isFinite(n2)) {
    return res.status(400).json({
      error: 'number1 and number2 must be valid numbers',
    });
  }

  let result;

  switch (operation) {
    case 'add':
      result = n1 + n2;
      break;
    case 'subtract':
      result = n1 - n2;
      break;
    case 'multiply':
      result = n1 * n2;
      break;
    case 'divide':
      if (n2 === 0) {
        return res.status(400).json({
          error: 'Division by zero is not allowed',
        });
      }
      result = n1 / n2;
      break;
    default:
      return res.status(400).json({
        error: 'operation must be one of: add, subtract, multiply, divide',
      });
  }

  return res.json({ result });
});

app.get('/', (req, res) => {
  res.json({ status: 'Calculator API is running' });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Calculator API listening on port ${PORT}`);
});
