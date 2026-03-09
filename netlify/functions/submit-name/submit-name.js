const fetch = require("node-fetch");

const jsonURL = "https://api.github.com/repos/jazbogross/jord/contents/static/names.json";
const secretKey = process.env.CAPTCHA_SECRET_KEY;

exports.handler = async function(event) {
  try {
    const body = JSON.parse(event.body);
    const nameArray = Object.values(body.name || {});
    const nameBuffer = Buffer.from(nameArray);
    const submittedName = normalizeSpacing(nameBuffer.toString("utf-8"));
    const captcha = body["g-recaptcha-response"];
    const githubToken = process.env.GITHUB_TOKEN;

    if (!submittedName) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Name is required" })
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
    const existingNamesBase64 = repoContentData.content;
    const existingNamesStr = Buffer.from(existingNamesBase64, "base64").toString("utf-8");
    const names = JSON.parse(existingNamesStr);

    const now = new Date();
    const timezoneOffsetMinutes = now.getTimezoneOffset();
    const localTimestamp = new Date(now.getTime() - timezoneOffsetMinutes * 60000).toISOString();
    const normalizedName = normalizeText(submittedName);

    const existingName = names.find((item) => normalizeText(item.name) === normalizedName);

    if (existingName) {
      existingName.lastUpdated = localTimestamp;
      delete existingName.updated;
      delete existingName.fontSize;
    } else {
      names.push({
        name: submittedName,
        color: generateRandomHexColor(),
        date: localTimestamp,
        lastUpdated: localTimestamp
      });
    }

    const updatedNamesBase64 = Buffer.from(JSON.stringify(names), "utf-8").toString("base64");

    await fetch(jsonURL, {
      method: "PUT",
      headers: {
        Authorization: `token ${githubToken}`
      },
      body: JSON.stringify({
        message: "New garden name added [skip netlify]",
        content: updatedNamesBase64,
        sha: repoContentData.sha
      })
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Name successfully added or updated" })
    };
  } catch (error) {
    console.error("Name submission error:", error);
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

function generateRandomHexColor() {
  return `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")}`;
}
