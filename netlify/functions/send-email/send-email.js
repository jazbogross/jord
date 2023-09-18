const fetch = require('node-fetch');
const nodemailer = require('nodemailer');

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

    let subject, text;

    if (filteredData.length > 0) {
      const wordsOnly = filteredData.map(item => item.word).join('\n');
      subject = `Ord fra Haven (${nowFormatted})`;
      text = `Hej Monia,\n\nIdag er der blevet høstet følgende ord: \n\n${wordsOnly}\n\nHav en dejlig aften,\nHaven`;
    } else {
      subject = `Ingen Nye Ord fra Haven (${nowFormatted})`;
      text = `Hej Monia,\n\nIdag er der ikke blevet høstet nogen ord.\n\nHav en dejlig aften,\nHaven`;
    }

    // Create a Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Email options
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'jazbogross@gmail.com',
      subject,
      text
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
