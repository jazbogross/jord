const fetch = require("node-fetch");
const base64 = require('base-64');
const jsonURL = "https://api.github.com/repos/jazbogross/jord/contents/static/comments.json";
const secretKey = process.env.CAPTCHA_SECRET_KEY;

exports.handler = async function(event, context) {
  try {
    // Parse the incoming request body
    const body = JSON.parse(event.body);
    const commentText = body.comment;
    const word = body.word;
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

    // Step 2: Fetch Existing Comments
    const repoContentResponse = await fetch(jsonURL, {
      headers: {
        'Authorization': `token ${githubToken}`
      }
    });
    const repoContentData = await repoContentResponse.json();
    const existingCommentsBase64 = repoContentData.content;

    const existingCommentsStr = base64.decode(existingCommentsBase64);
    let allComments = JSON.parse(existingCommentsStr);

    // Step 3: Add New Comment
    const now = new Date();
    const timestamp = now.toISOString();

    const newCommentId = `comment${Date.now()}`; // Create a unique comment ID based on the current timestamp
    const newComment = {
      text: commentText,
      date: timestamp
    };

    if (!allComments[word]) {
      allComments[word] = {};
    }
    allComments[word][newCommentId] = newComment;

    // Step 4: Commit Changes
    const updatedCommentsBase64 = base64.encode(JSON.stringify(allComments));

    await fetch(jsonURL, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${githubToken}`
      },
      body: JSON.stringify({
        message: 'New comment added [skip netlify]',
        content: updatedCommentsBase64,
        sha: repoContentData.sha
      })
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Comment successfully added' })
    };
  
  } catch (generalError) {
    console.error('General Error:', generalError);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'An unexpected error occurred' })
    };
  }
};

