const fetch = require("node-fetch");
const jsonURL = "https://api.github.com/repos/jazbogross/jord/contents/static/words.json";
const secretKey = process.env.CAPTCHA_SECRET_KEY;

exports.handler = async function(event, context) {
  try {
    // Parse the incoming request body
    const body = JSON.parse(event.body);
    const wordArray = Object.values(body.word);
    const wordBuffer = Buffer.from(wordArray);
    const wordsInput = wordBuffer.toString('utf-8').split(" "); // Split the user input by spaces
    const captcha = body['g-recaptcha-response'];
    const githubToken = process.env.GITHUB_TOKEN;

    // Step 1: CAPTCHA Verification
    let captchaResponse;
    try {
      captchaResponse = await fetch(`https://www.google.com/recaptcha/api/siteverify`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `secret=${secretKey}&response=${captcha}`
      });

      const captchaData = await captchaResponse.json();
      if (!captchaData.success || captchaData.score <= 0.5) {
        return { statusCode: 400, body: JSON.stringify({ message: "Captcha verification failed" }) };
      }
    } catch (captchaError) {
      console.error("Captcha Error:", captchaError);
      return { statusCode: 400, body: "Captcha verification encountered an error" };
    }

    // Step 2: Fetch Existing Words
    const repoContentResponse = await fetch(jsonURL, {
      headers: {
        'Authorization': `token ${githubToken}`
      }
    });
    const repoContentData = await repoContentResponse.json();
    const existingWordsBase64 = repoContentData.content;
    const existingWordsStr = Buffer.from(existingWordsBase64, 'base64').toString('utf-8');
    let words = JSON.parse(existingWordsStr);

    // Step 3: Get local time
    const now = new Date();
    const timezoneOffsetMinutes = now.getTimezoneOffset();
    const localTimestamp = new Date(now.getTime() - timezoneOffsetMinutes * 60000).toISOString();

    // Loop through the user input words
    for (const word of wordsInput) {
      const existingWord = words.find(item => item.word === word);

      if (existingWord) {
        existingWord.fontSize += 1;
        if (!existingWord.updated || !Array.isArray(existingWord.updated)) {
          existingWord.updated = [];
        }
        existingWord.updated.push(localTimestamp);
      } else {
        words.push({ word, fontSize: 20, date: localTimestamp, updated: [localTimestamp] });
      }
    }

    // Step 4: Commit Changes
    const updatedWordsBase64 = Buffer.from(JSON.stringify(words), 'utf-8').toString('base64');

    await fetch(jsonURL, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${githubToken}`
      },
      body: JSON.stringify({
        message: 'New word(s) added [skip netlify]',
        content: updatedWordsBase64,
        sha: repoContentData.sha // Important: Include the latest SHA to avoid conflicts
      })
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Word(s) successfully added or updated' })
    };

  } catch (generalError) {
    console.error('General Error:', generalError);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'An unexpected error occurred' })
    };
  }
};
