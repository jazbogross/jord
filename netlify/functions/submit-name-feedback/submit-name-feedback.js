const fetch = require("node-fetch");

const feedbackJsonURL = "https://api.github.com/repos/jazbogross/jord/contents/static/name-feedback.json";
const namesJsonURL = "https://api.github.com/repos/jazbogross/jord/contents/static/names.json";
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

    const [feedbackRepoFile, namesRepoFile] = await Promise.all([
      fetchRepoJsonFile(feedbackJsonURL, githubToken),
      fetchRepoJsonFile(namesJsonURL, githubToken)
    ]);
    const feedbackByName = feedbackRepoFile.data;
    const names = namesRepoFile.data;

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

    touchGardenNameRecord(names, submittedName, localTimestamp);

    await Promise.all([
      updateRepoJsonFile(
        feedbackJsonURL,
        githubToken,
        feedbackRepoFile.sha,
        feedbackByName,
        "Garden name feedback added [skip netlify]"
      ),
      updateRepoJsonFile(
        namesJsonURL,
        githubToken,
        namesRepoFile.sha,
        names,
        "Garden name metadata updated [skip netlify]"
      )
    ]);

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

function touchGardenNameRecord(names, submittedName, timestamp) {
  const nameKey = normalizeText(submittedName);
  let existingName = names.find((item) => normalizeText(item.name) === nameKey);

  if (!existingName) {
    existingName = {
      name: submittedName,
      color: generateDeterministicHexColor(submittedName),
      date: timestamp,
      lastUpdated: timestamp
    };
    names.push(existingName);
    return existingName;
  }

  existingName.name = existingName.name || submittedName;
  existingName.date = existingName.date || timestamp;
  existingName.lastUpdated = timestamp;
  delete existingName.updated;
  delete existingName.fontSize;

  return existingName;
}

async function fetchRepoJsonFile(url, githubToken) {
  const response = await fetch(url, {
    headers: {
      Authorization: `token ${githubToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub fetch failed for ${url}: ${response.status}`);
  }

  const repoContentData = await response.json();
  const content = Buffer.from(repoContentData.content, "base64").toString("utf-8");

  return {
    sha: repoContentData.sha,
    data: JSON.parse(content)
  };
}

async function updateRepoJsonFile(url, githubToken, sha, data, message) {
  const encodedContent = Buffer.from(JSON.stringify(data), "utf-8").toString("base64");
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `token ${githubToken}`
    },
    body: JSON.stringify({
      message,
      content: encodedContent,
      sha
    })
  });

  if (!response.ok) {
    throw new Error(`GitHub update failed for ${url}: ${response.status}`);
  }
}

function generateDeterministicHexColor(value) {
  const normalizedValue = normalizeText(value);
  let hash = 0;

  for (let index = 0; index < normalizedValue.length; index += 1) {
    hash = (hash * 31 + normalizedValue.charCodeAt(index)) >>> 0;
  }

  return `#${(hash & 0xffffff).toString(16).padStart(6, "0")}`;
}
