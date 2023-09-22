const fetch = require('node-fetch');
const nodemailer = require('nodemailer');

exports.handler = async (event, context) => {
  try {
    // Fetch JSON data from WORDS
    const response = await fetch('https://soft-crostata-20d468.netlify.app/words.json');
    const data = await response.json();

    // Fetch JSON data from COMMENTS and log to ensure data is fetched
    const commentsResponse = await fetch('https://soft-crostata-20d468.netlify.app/comments.json');
    const commentsData = await commentsResponse.json();
    console.log("Fetched comments data:", commentsData);

    // Get the current date and time
    const now = new Date();
    const nowFormatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Filter out words that were not submitted in the last 24 hours
    const filteredData = data.filter(item => {
      const itemDate = new Date(item.date);
      return (now - itemDate) < 86400000; // Less than 24 hours (in milliseconds)
    });

    // Filter comments based on last 24 hours
    let recentComments = {};
    for (let word in commentsData) {
      for (let commentId in commentsData[word]) {
        let commentDate = new Date(commentsData[word][commentId].date);
        if ((now - commentDate) < 86400000) {  // Less than 24 hours
          if (!recentComments[word]) recentComments[word] = [];
          recentComments[word].push(commentsData[word][commentId].text);
        }
      }
    }

    let subject, text;

    if (filteredData.length > 0) {
      const wordsOnly = filteredData.map(item => item.word).join('\n');
      subject = `Ord fra Haven (${nowFormatted})`;
      text = `Hej Monia,\n\nIdag er der blevet høstet følgende ord: \n\n${wordsOnly}`;
    } else {
      subject = `Ingen Nye Ord fra Haven (${nowFormatted})`;
      text = `Hej Monia,\n\nIdag er der ikke blevet høstet nogen ord.`;
    }

    // Add recent comments to the email text
    if (Object.keys(recentComments).length > 0) {  // Check if the object has keys
      text += '\n\nFølgende kommentarer er lavet idag:';
      for (let word in recentComments) {
        text += `\n\n${word}:\n  - ${recentComments[word].join('\n  - ')}`;
      }
    } else {
      text += '\n\nOg der er ikke blevet kommenteret idag.';
    }

    text += '\n\nHav en dejlig aften,\nHaven';


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
      to: process.env.EMAIL_TO,
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
