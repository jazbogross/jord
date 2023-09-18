const fetch = require("node-fetch");
const base64 = require('base-64');
const jsonURL = "https://api.github.com/repos/jazbogross/jord/static/words.json";
const secretKey = process.env.CAPTCHA_SECRET_KEY;

exports.handler = async function(event, context) {
  try {
    const body = JSON.parse(event.body);
    const word = body.word;
    const captcha = body['g-recaptcha-response'];
    const githubToken = process.env.GITHUB_TOKEN;

    // CAPTCHA Verification
    let captchaResponse;
    try {
      captchaResponse = await fetch(`https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captcha}`, {
        method: "POST",
      });
      const captchaData = await captchaResponse.json();
  
      if (!captchaData.success || captchaData.score <= 0.5) {
        return { statusCode: 400, body: "Captcha verification failed" };
      }
    } catch (captchaError) {
      console.error("Captcha Error:", captchaError);
      return { statusCode: 400, body: "Captcha verification encountered an error" };
    }

    // Fetch existing words
    const repoContentResponse = await fetch(jsonURL, {
      headers: {
        'Authorization': `token ${githubToken}`
      }
    });
    const repoContentData = await repoContentResponse.json();
    const existingWordsBase64 = repoContentData.content;
    const existingWordsStr = base64.decode(existingWordsBase64);
    let words = JSON.parse(existingWordsStr);

    const now = new Date();
    const timestamp = now.toISOString();
    const existingWord = words.find(item => item.word === word);

    if (existingWord) {
      existingWord.fontSize += 1;
      existingWord.date = timestamp;
    } else {
      words.push({ word, fontSize: 20, date: timestamp });
    }

    // Convert updated words back to Base64 for GitHub
    const updatedWordsBase64 = base64.encode(JSON.stringify(words));

    // Commit changes to GitHub
    await fetch(jsonURL, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${githubToken}`
      },
      body: JSON.stringify({
        message: 'Updated words.json',
        content: updatedWordsBase64,
        sha: repoContentData.sha  // Important: Include the latest SHA to avoid conflicts
      })
    });

    return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Word successfully added or updated' })
      };
  
    } catch (generalError) {
      console.error('General Error:', generalError);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: 'An unexpected error occurred' })
      };
    }
  };
