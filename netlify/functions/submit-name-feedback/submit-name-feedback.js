const fetch = require("node-fetch");

const jsonURL = "https://api.github.com/repos/jazbogross/jord/contents/static/name-feedback.json";
const secretKey = process.env.CAPTCHA_SECRET_KEY;

exports.handler = async function(event) {
  try {
    const body = JSON.parse(event.body);
    const submittedName = normalizeSpacing(body.name);
    const sentiment = body.sentiment;
    const comment = normalizeSpacing(body.comment);
    const captcha = body["g-recaptcha-response"];
    const githubToken = process.env.GITHUB_TOKEN;

    if (!submittedName || !["positive", "negative"].includes(sentiment)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Name and sentiment are required" })
      };
    }

    const captchaResponse = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: `secret=${secretKey}&response=${captcha}`
    });

    const captchaData = await captchaResponse.json();
    if (!captchaData.success || captchaData.score <= 0.5) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Captcha verification failed" })
      };
    }

    const repoContentResponse = await fetch(jsonURL, {
      headers: {
        Authorization: `token ${githubToken}`
      }
    });
    const repoContentData = await repoContentResponse.json();
    const existingFeedbackBase64 = repoContentData.content;
    const existingFeedbackStr = Buffer.from(existingFeedbackBase64, "base64").toString("utf-8");
    const feedbackByName = JSON.parse(existingFeedbackStr);

    const now = new Date();
    const timezoneOffsetMinutes = now.getTimezoneOffset();
    const localTimestamp = new Date(now.getTime() - timezoneOffsetMinutes * 60000).toISOString();
    const nameKey = normalizeText(submittedName);

    if (!feedbackByName[nameKey]) {
      feedbackByName[nameKey] = {
        name: submittedName,
        likes: 0,
        dislikes: 0,
        positiveComments: [],
        negativeComments: []
      };
    }

    const feedback = feedbackByName[nameKey];
    feedback.name = feedback.name || submittedName;
    feedback.likes = Number(feedback.likes || 0);
    feedback.dislikes = Number(feedback.dislikes || 0);
    feedback.positiveComments = Array.isArray(feedback.positiveComments) ? feedback.positiveComments : [];
    feedback.negativeComments = Array.isArray(feedback.negativeComments) ? feedback.negativeComments : [];

    if (sentiment === "positive") {
      feedback.likes += 1;
      if (comment) {
        feedback.positiveComments.push({ text: comment, date: localTimestamp });
      }
    } else {
      feedback.dislikes += 1;
      if (comment) {
        feedback.negativeComments.push({ text: comment, date: localTimestamp });
      }
    }

    const updatedFeedbackBase64 = Buffer.from(JSON.stringify(feedbackByName), "utf-8").toString("base64");

    await fetch(jsonURL, {
      method: "PUT",
      headers: {
        Authorization: `token ${githubToken}`
      },
      body: JSON.stringify({
        message: "Garden name feedback added [skip netlify]",
        content: updatedFeedbackBase64,
        sha: repoContentData.sha
      })
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Feedback successfully added" })
    };
  } catch (error) {
    console.error("Name feedback submission error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "An unexpected error occurred" })
    };
  }
};

function normalizeSpacing(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeText(value) {
  return normalizeSpacing(value).toLowerCase();
}
