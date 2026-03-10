const fetch = require("node-fetch");

const repoApiBaseURL = "https://api.github.com/repos/jazbogross/jord";
const feedbackJsonPath = "static/name-feedback.json";
const namesJsonPath = "static/names.json";
const feedbackJsonURL = `${repoApiBaseURL}/contents/${feedbackJsonPath}`;
const namesJsonURL = `${repoApiBaseURL}/contents/${namesJsonPath}`;
const gitRefURL = `${repoApiBaseURL}/git/ref/heads/main`;
const secretKey = process.env.CAPTCHA_SECRET_KEY;
const WRITE_RETRY_LIMIT = 3;

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

    await persistNameFeedback({
      githubToken,
      submittedName,
      sentiment,
      comment
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

async function persistNameFeedback({ githubToken, submittedName, sentiment, comment }) {
  for (let attempt = 1; attempt <= WRITE_RETRY_LIMIT; attempt += 1) {
    const [feedbackRepoFile, namesRepoFile] = await Promise.all([
      fetchRepoJsonFile(feedbackJsonURL, githubToken),
      fetchRepoJsonFile(namesJsonURL, githubToken)
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

    try {
      await commitRepoJsonFiles(
        githubToken,
        [
          {
            path: feedbackJsonPath,
            content: JSON.stringify(feedbackByName)
          },
          {
            path: namesJsonPath,
            content: JSON.stringify(names)
          }
        ],
        "Garden name feedback added [skip netlify]"
      );
      return;
    } catch (error) {
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

async function fetchRepoJsonFile(url, githubToken) {
  const response = await fetch(url, {
    headers: {
      Authorization: `token ${githubToken}`
    }
  });

  if (!response.ok) {
    throw createGitHubError(`GitHub fetch failed for ${url}: ${response.status}`, response.status);
  }

  const repoContentData = await response.json();
  const content = Buffer.from(repoContentData.content, "base64").toString("utf-8");

  return {
    sha: repoContentData.sha,
    data: JSON.parse(content)
  };
}

async function commitRepoJsonFiles(githubToken, files, message) {
  const refResponse = await fetch(gitRefURL, {
    headers: {
      Authorization: `token ${githubToken}`
    }
  });

  if (!refResponse.ok) {
    throw createGitHubError(`GitHub ref fetch failed: ${refResponse.status}`, refResponse.status);
  }

  const refData = await refResponse.json();
  const parentCommitSha = refData.object?.sha;

  if (!parentCommitSha) {
    throw new Error("GitHub ref response did not include a commit SHA");
  }

  const commitResponse = await fetch(`${repoApiBaseURL}/git/commits/${parentCommitSha}`, {
    headers: {
      Authorization: `token ${githubToken}`
    }
  });

  if (!commitResponse.ok) {
    throw createGitHubError(`GitHub commit fetch failed: ${commitResponse.status}`, commitResponse.status);
  }

  const commitData = await commitResponse.json();
  const baseTreeSha = commitData.tree?.sha;

  if (!baseTreeSha) {
    throw new Error("GitHub commit response did not include a tree SHA");
  }

  const treeResponse = await fetch(`${repoApiBaseURL}/git/trees`, {
    method: "POST",
    headers: {
      Authorization: `token ${githubToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: files.map((file) => ({
        path: file.path,
        mode: "100644",
        type: "blob",
        content: file.content
      }))
    })
  });

  if (!treeResponse.ok) {
    throw createGitHubError(`GitHub tree creation failed: ${treeResponse.status}`, treeResponse.status);
  }

  const treeData = await treeResponse.json();
  const nextTreeSha = treeData.sha;

  if (!nextTreeSha) {
    throw new Error("GitHub tree response did not include a tree SHA");
  }

  const newCommitResponse = await fetch(`${repoApiBaseURL}/git/commits`, {
    method: "POST",
    headers: {
      Authorization: `token ${githubToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message,
      tree: nextTreeSha,
      parents: [parentCommitSha]
    })
  });

  if (!newCommitResponse.ok) {
    throw createGitHubError(`GitHub commit creation failed: ${newCommitResponse.status}`, newCommitResponse.status);
  }

  const newCommitData = await newCommitResponse.json();
  const nextCommitSha = newCommitData.sha;

  if (!nextCommitSha) {
    throw new Error("GitHub commit response did not include a commit SHA");
  }

  const updateRefResponse = await fetch(gitRefURL, {
    method: "PATCH",
    headers: {
      Authorization: `token ${githubToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      sha: nextCommitSha,
      force: false
    })
  });

  if (!updateRefResponse.ok) {
    throw createGitHubError(`GitHub ref update failed: ${updateRefResponse.status}`, updateRefResponse.status);
  }
}

function createGitHubError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function generateDeterministicHexColor(value) {
  const normalizedValue = normalizeText(value);
  let hash = 0;

  for (let index = 0; index < normalizedValue.length; index += 1) {
    hash = (hash * 31 + normalizedValue.charCodeAt(index)) >>> 0;
  }

  return `#${(hash & 0xffffff).toString(16).padStart(6, "0")}`;
}
