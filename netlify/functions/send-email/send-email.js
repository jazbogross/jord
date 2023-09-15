const process = require('process');
const { promisify } = require('util');
const fetch = require('node-fetch');
const sendMailLib = require('sendmail');
const { validateEmail, validateLength } = require('./validations.js');

const sendMail = promisify(sendMailLib());

const NAME_MIN_LENGTH = 3;
const NAME_MAX_LENGTH = 50;
const DETAILS_MIN_LENGTH = 10;
const DETAILS_MAX_LENGTH = 1e3;

const handler = async (event) => {
  console.log('Received event body:', event.body);

  if (!process.env.CONTACT_EMAIL) {
    return {
      statusCode: 500,
      body: 'process.env.CONTACT_EMAIL must be defined',
    };
  }

  if (!event.body || typeof event.body !== 'string') {
    return {
      statusCode: 400,
      body: 'Invalid request body',
    };
  }

  const body = JSON.parse(event.body);

  // Fetching data from the JSON file
  const response = await fetch('https://soft-crostata-20d468.netlify.app/words.json');
  const data = await response.json();

  // Validate the fetched data
  if (!Array.isArray(data)) {
    return {
      statusCode: 500,
      body: 'Fetched data is not an array',
    };
  }

  for (const item of data) {
    if (typeof item !== 'object' || !('word' in item) || !('fontSize' in item) || !('date' in item)) {
      return {
        statusCode: 500,
        body: 'Fetched data is not properly structured',
      };
    }
  }

  // Validation logic
  try {
    validateLength('body.name', body.name, NAME_MIN_LENGTH, NAME_MAX_LENGTH);
  } catch (error) {
    return {
      statusCode: 403,
      body: error.message,
    };
  }

  try {
    validateEmail('body.email', body.email);
  } catch (error) {
    return {
      statusCode: 403,
      body: error.message,
    };
  }

  try {
    validateLength('body.details', body.details, DETAILS_MIN_LENGTH, DETAILS_MAX_LENGTH);
  } catch (error) {
    return {
      statusCode: 403,
      body: error.message,
    };
  }

  // Prepare email descriptor
  const descriptor = {
    from: `"Automated Email" <no-reply@gql-modules.com>`,
    to: process.env.CONTACT_EMAIL,
    subject: 'Word Update',
    text: `Here is your daily info: ${JSON.stringify(data)}`,
  };

  // Send email
  try {
    await sendMail(descriptor);
    return { statusCode: 200, body: '' };
  } catch (error) {
    return { statusCode: 500, body: error.message };
  }
};

module.exports = { handler };

