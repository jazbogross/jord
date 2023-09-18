const fetch = require('node-fetch');
const nodemailer = require('nodemailer');
const { schedule } = require('@netlify/functions')

exports.handler = async (event, context) => {
  try {
    // Fetch JSON data from URL
    const response = await fetch('https://soft-crostata-20d468.netlify.app/words.json');
    const data = await response.json();

    // Get the current date and time
    const now = new Date();
    const nowFormatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;


    // Filter out words that were not submitted in the last 24 hours
    const filteredData = data.filter(item => {
      const itemDate = new Date(item.date);
      return (now - itemDate) < 86400000; // Less than 24 hours (in milliseconds)
    });

    // Extract only the 'word' values and join them with new lines
    const wordsOnly = filteredData.map(item => item.word).join('\n');

    // Create a Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail', // Replace with your email service
      auth: {
        user: 'theatrebuilding2@gmail.com', // Replace with your email
        pass: 'fehphgpaxakdrsyo' // Replace with your email password
      }
    });

    // Email options
    const mailOptions = {
      from: 'theatrebuilding2@gmail.com',
      to: 'jazbogross@gmail.com',
      subject: `Ord fra Jorden (${nowFormatted})`,
      text: `Hej Monia,\n\nFolk har lagt mærke til de her ord: \n\n${wordsOnly}\n\nHav en dejlig dag,\nJorden`
    };

    // Send the email
    const emailResponse = await transporter.sendMail(mailOptions);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Successfully fetched data and sent email', emailResponse })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to fetch data or send email' })
    };
  }
};
