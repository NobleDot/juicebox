//"Provide the utility functions that the rest of our application will use"

// import the pg module
const { Client } = require('pg');


// supply the db name and location of the database
const client = new Client('postgres://localhost:5432/juicebox-dev');

async function createUser({ username, password }) {
  try {
  // const result = await client.query(`
  const { rows } = await client.query(`
    INSERT INTO users(username, password)
    VALUES ($1, $2)
    ON CONFLICT (username) DO NOTHING
    RETURNING *;
  `, [username, password]);

  return rows;
  } catch (error) {
  throw error;
  }
}

// helper funcitons.
async function getAllUsers() {
    const { rows } = await client.query(
      `SELECT id, username 
      FROM users;
    `);
  
    return rows;
  }
module.exports = {
    client,
    getAllUsers,
    createUser
}