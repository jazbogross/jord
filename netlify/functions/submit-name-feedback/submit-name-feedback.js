const fetch = require("node-fetch");

const feedbackJsonPath = "static/name-feedback.json";
const namesJsonPath = "static/names.json";
const feedbackJsonURL = `https://api.github.com/repos/jazbogross/jord/contents/${feedbackJsonPath}`;
const namesJsonURL = `https://api.github.com/repos/jazbogross/jord/contents/${namesJsonPath}`;
const secretKey = process.env.CAPTCHA_SECRET_KEY;
const WRITE_RETRY_LIMIT = 3;

exports.handler = async function(event) {
  const log = createLogger();

  log.info("Request received", {
    httpMethod: event?.httpMethod || "",
    hasBody: Boolean(event?.body)
  });

  try {
    const body = JSON.parse(event.body || "{}");
    const submittedName = normalizeSpacing(body.name);
    const sentiment = body.sentiment;
    const comment = normalizeSpacing(body.comment);
    const captcha = body["g-recaptcha-response"];
    const githubToken = process.env.GITHUB_TOKEN;

    log.info("Parsed request body", {
      submittedName,
      sentiment,
      hasComment: Boolean(comment),
      commentLength: comment.length,
      hasCaptcha: Boolean(captcha),
      hasGithubToken: Boolean(githubToken)
    });

    if (!submittedName || !["positive", "negative"].includes(sentiment)) {
      log.error("Validation failed", {
        submittedName,
        sentiment
      });
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
    const captchaData = await parseJsonResponse(captchaResponse, "captcha verification", log);

    log.info("Captcha response received", {
      success: Boolean(captchaData?.success),
      score: captchaData?.score
    });

    if (!captchaData.success || captchaData.score <= 0.5) {
      log.error("Captcha verification failed", captchaData);
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Captcha verification failed" })
      };
    }

    await persistNameFeedback({
      githubToken,
      submittedName,
      sentiment,
      comment,
      log
    });

    log.info("Request completed successfully", {
      submittedName,
      sentiment
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Feedback successfully added" })
    };
  } catch (error) {
    log.error("Unhandled error", {
      message: error.message,
      status: error.status,
      body: error.body,
      stack: error.stack
    });

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

function normalizeFeedbackStore(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizeNamesList(value) {
  return Array.isArray(value) ? value : [];
}

async function persistNameFeedback({ githubToken, submittedName, sentiment, comment, log }) {
  for (let attempt = 1; attempt <= WRITE_RETRY_LIMIT; attempt += 1) {
    log.info("Write attempt started", { attempt, submittedName, sentiment });

    const [feedbackRepoFile, namesRepoFile] = await Promise.all([
      fetchRepoJsonFile(feedbackJsonURL, githubToken, log, feedbackJsonPath),
      fetchRepoJsonFile(namesJsonURL, githubToken, log, namesJsonPath)
    ]);
    const feedbackByName = normalizeFeedbackStore(feedbackRepoFile.data);
    const names = normalizeNamesList(namesRepoFile.data);
    const localTimestamp = getLocalTimestamp();
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

    log.info("Prepared repo updates", {
      attempt,
      nameKey,
      likes: feedback.likes,
      dislikes: feedback.dislikes,
      positiveCommentCount: feedback.positiveComments.length,
      negativeCommentCount: feedback.negativeComments.length,
      namesCount: names.length
    });

    try {
      await updateRepoJsonFile(
        feedbackJsonURL,
        githubToken,
        feedbackRepoFile.sha,
        feedbackByName,
        "Garden name feedback added [skip netlify]",
        log,
        feedbackJsonPath
      );
      await updateRepoJsonFile(
        namesJsonURL,
        githubToken,
        namesRepoFile.sha,
        names,
        "Garden name metadata updated [skip netlify]",
        log,
        namesJsonPath
      );

      log.info("Write attempt succeeded", { attempt, submittedName, sentiment });
      return;
    } catch (error) {
      log.error("Write attempt failed", {
        attempt,
        status: error.status,
        message: error.message,
        body: error.body
      });

      if (!shouldRetryGitHubWrite(error) || attempt === WRITE_RETRY_LIMIT) {
        throw error;
      }

      await wait(attempt * 150);
    }
  }
}

function getLocalTimestamp() {
  const now = new Date();
  const timezoneOffsetMinutes = now.getTimezoneOffset();
  return new Date(now.getTime() - timezoneOffsetMinutes * 60000).toISOString();
}

function shouldRetryGitHubWrite(error) {
  return Boolean(error && (error.status === 409 || error.status === 422));
}

function wait(durationMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

async function fetchRepoJsonFile(url, githubToken, log, pathLabel) {
  log.info("Fetching repo file", { path: pathLabel });

  const response = await fetch(url, {
    headers: {
      Authorization: `token ${githubToken}`
    }
  });
  const responseText = await response.text();

  if (!response.ok) {
    log.error("GitHub fetch failed", {
      path: pathLabel,
      status: response.status,
      body: truncateForLog(responseText)
    });
    throw createHttpError(`GitHub fetch failed for ${pathLabel}`, response.status, responseText);
  }

  log.info("Fetched repo file", {
    path: pathLabel,
    status: response.status
  });

  const repoContentData = JSON.parse(responseText);
  const content = Buffer.from(repoContentData.content, "base64").toString("utf-8");

  return {
    sha: repoContentData.sha,
    data: JSON.parse(content)
  };
}

async function updateRepoJsonFile(url, githubToken, sha, data, message, log, pathLabel) {
  log.info("Updating repo file", {
    path: pathLabel,
    sha
  });

  const encodedContent = Buffer.from(JSON.stringify(data), "utf-8").toString("base64");
  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `token ${githubToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message,
      content: encodedContent,
      sha
    })
  });
  const responseText = await response.text();

  if (!response.ok) {
    log.error("GitHub update failed", {
      path: pathLabel,
      status: response.status,
      body: truncateForLog(responseText)
    });
    throw createHttpError(`GitHub update failed for ${pathLabel}`, response.status, responseText);
  }

  log.info("Updated repo file", {
    path: pathLabel,
    status: response.status
  });
}

async function parseJsonResponse(response, label, log) {
  const responseText = await response.text();

  try {
    return JSON.parse(responseText);
  } catch (error) {
    log.error("Failed to parse JSON response", {
      label,
      status: response.status,
      body: truncateForLog(responseText)
    });
    throw createHttpError(`Invalid JSON returned from ${label}`, response.status, responseText);
  }
}

function createHttpError(message, status, body) {
  const error = new Error(message);
  error.status = status;
  error.body = truncateForLog(body);
  return error;
}

function truncateForLog(value) {
  const stringValue = String(value || "");
  return stringValue.length > 600 ? `${stringValue.slice(0, 600)}...` : stringValue;
}

function createLogger() {
  const requestId = `submit-name-feedback:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;

  return {
    info(message, meta) {
      console.log(`[${requestId}] ${message}`, meta || {});
    },
    error(message, meta) {
      console.error(`[${requestId}] ${message}`, meta || {});
    }
  };
}

function generateDeterministicHexColor(value) {
  const normalizedValue = normalizeText(value);
  let hash = 0;

  for (let index = 0; index < normalizedValue.length; index += 1) {
    hash = (hash * 31 + normalizedValue.charCodeAt(index)) >>> 0;
  }

  return `#${(hash & 0xffffff).toString(16).padStart(6, "0")}`;
}
