const express = require('express');
const { v4:uuidv4 } = require('uuid');

const api = express();

api.use(express.json());

const customers = [];

// Middleware
function verifyIfExistisAccountCPF(request, response, next) {
  const { cpf } = request.headers;

  const customer = customers.find(customer => customer.cpf === cpf);

  if (!customer) {
    return response.status(400).json({error: "Customer not found!"})
  }

  request.customer = customer;

  return next();
}

function getBalance(statement) {
  const balance = statement.reduce((acc, operation) => { 
    return operation.type === 'credit' 
    ? acc + operation.amount 
    : acc - operation.amount} 
  , 0);

  return balance;
}

/**
 *  cpf - string
 *  name - string
 *  uuid - string
 *  statement - []
 */
api.post("/account", (request, response) => {
  const { cpf, name } = request.body;

  const customerAlreadyExists = customers.some(customer => customer.cpf === cpf);

  if (customerAlreadyExists) {
    return response.status(400).json({error: "Customer already exists!"})
  }

  customers.push({
    cpf,
    name,
    id: uuidv4(),
    statement: []
  })

  return response.status(201).send();
})

api.get("/statement", verifyIfExistisAccountCPF, (request, response) => {
  const { customer } = request;

  return response.json(customer.statement);
})

api.post("/deposit", verifyIfExistisAccountCPF, (request, response) => {
  const { description, amount } = request.body;
  const { customer } = request;  

  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: "credit",
  }

  customer.statement.push(statementOperation);

  return response.status(201).send();

})

api.post("/withdraw", verifyIfExistisAccountCPF, (request, response) => {
  const { amount } = request.body;
  const { customer } = request;  

  const balance = getBalance(customer.statement);
  
  if (amount > balance) {
    return response.status(400).json({error: "Insufficients funds!"})
  }

  const statementOperation = {
    amount,
    created_at: new Date(),
    type: "debit",
  }

  customer.statement.push(statementOperation);

  return response.status(201).send();

})

api.get("/statement/date", verifyIfExistisAccountCPF, (request, response) => {
  const { customer } = request;
  const { date } = request.query;

  const dateFormat = new Date(date + " 00:00");

  const statements = customer.statement.filter(statement => statement.created_at.toDateString() === dateFormat.toDateString());

  return response.json(statements);
})

api.put("/account", verifyIfExistisAccountCPF, (request, response) => {
  const { name } = request.body;
  const { customer } = request;

  customer.name = name;

  return response.status(201).send();
})

api.get("/account", verifyIfExistisAccountCPF, (request, response) => {
  const { customer } = request;

  return response.json(customer)
})

api.delete("/account", verifyIfExistisAccountCPF, (request, response) => {
  const { customer: { cpf } } = request;

  const customerIndex = customers.findIndex(customer => customer.cpf === cpf);

  customers.splice(customerIndex, 1);

  return response.status(200).json(customers);

})

api.get("/balance", verifyIfExistisAccountCPF, (request, response) => {
  const { customer } = request;

  const balance = getBalance(customer.statement);

  return response.json(balance);
})

api.listen(3333);