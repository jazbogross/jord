const fetch = require("node-fetch");
const base64 = require('base-64');
const jsonURL = "https://api.github.com/repos/jazbogross/jord/contents/static/words.json";
const secretKey = process.env.CAPTCHA_SECRET_KEY;

exports.handler = async function(event, context) {
  try {
    // Parse the incoming request body
    const body = JSON.parse(event.body);
    console.log(body);
    const wordBuffer = Buffer.from(body.word);
    const word = wordBuffer.toString('utf-8');
    const captcha = body['g-recaptcha-response'];
    const githubToken = process.env.GITHUB_TOKEN;

    // Step 1: CAPTCHA Verification
    let captchaResponse;
    try {
      // Verify the captcha response with Google's reCAPTCHA service
      captchaResponse = await fetch(`https://www.google.com/recaptcha/api/siteverify`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `secret=${secretKey}&response=${captcha}`
      });
      
      const captchaData = await captchaResponse.json();

      // If the captcha is invalid or has a low score, return an error
      if (!captchaData.success || captchaData.score <= 0.5) {
        return { statusCode: 400, body: JSON.stringify({ message: "Captcha verification failed" }) };
      }
    } catch (captchaError) {
      console.error("Captcha Error:", captchaError);
      return { statusCode: 400, body: "Captcha verification encountered an error" };
    }

    // Step 2: Fetch Existing Words
    // Fetch the current state of the JSON file from GitHub
    const repoContentResponse = await fetch(jsonURL, {
      headers: {
        'Authorization': `token ${githubToken}`
      }
    });
    const repoContentData = await repoContentResponse.json();
    const existingWordsBase64 = repoContentData.content;
    
    // Decode the Base64 content to a string and parse it to a JSON object
    const existingWordsStr = base64.decode(existingWordsBase64);
    let words = JSON.parse(existingWordsStr);

    // Step 3: Get local time
    const now = new Date();
    const timezoneOffsetMinutes = now.getTimezoneOffset();
    const localTimestamp = new Date(now.getTime() - timezoneOffsetMinutes * 60000).toISOString();

    // Check if the word already exists in the JSON data
    const existingWord = words.find(item => item.word === word);

    // If the word exists, update it; otherwise, add a new word
    if (existingWord) {
      existingWord.fontSize += 1;
      existingWord.date = localTimestamp;
    } else {
      words.push({ word, fontSize: 20, date: localTimestamp });
    }

    // Step 4: Commit Changes
    // Encode the updated JSON data back to Base64
    const updatedWordsBase64 = base64.encode(JSON.stringify(words));

    // Update the GitHub repository with the new content
    await fetch(jsonURL, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${githubToken}`
      },
      body: JSON.stringify({
        message: 'New word added [skip netlify]',
        content: updatedWordsBase64,
        sha: repoContentData.sha  // Important: Include the latest SHA to avoid conflicts
      })
    });

    // Return a success response
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Word successfully added or updated' })
    };
  
  } catch (generalError) {
    // Handle any unexpected errors
    console.error('General Error:', generalError);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'An unexpected error occurred' })
    };
  }
};
