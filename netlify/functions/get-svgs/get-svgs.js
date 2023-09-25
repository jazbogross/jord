const fetch = require("node-fetch");
const fs = require('fs');
const os = require('os');
const path = require('path');

exports.handler = async function(event, context) {
  // Check if the request is a POST request and contains binary data
  if (event.httpMethod !== 'POST' || !event.isBase64Encoded) {
    return { statusCode: 400, body: 'Invalid request' };
  }

  // Decode and parse the incoming request
  const buffer = Buffer.from(event.body, 'base64');

  // Here we're simplifying and assuming the file is in the first part of the multipart data.
  // Find the first occurrence of the file boundary
  const boundary = `--${event.headers['content-type'].split('=')[1]}`;
  const start = buffer.indexOf(boundary) + boundary.length + 2;
  const end = buffer.indexOf(boundary, start);

  // Extract the file content between the boundaries
  const fileContent = buffer.slice(start, end);

  // Convert the file content to Base64 for GitHub
  const fileBase64 = fileContent.toString('base64');

  // Now, you'd upload this file to your GitHub repository.
  const fileUploadResponse = await fetch(`https://api.github.com/repos/jazbogross/jord/static/svg`, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${process.env.GITHUB_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: 'Upload new file',
      content: fileBase64
    })
  });

  const fileUploadData = await fileUploadResponse.json();

  // Here, you'd update svgs.json with the new filename and filepath
  const svgJsonURL = "https://api.github.com/repos/jazbogross/jord/static/svgs.json";
  const existingSvgResponse = await fetch(svgJsonURL, {
    headers: {
      'Authorization': `token ${process.env.GITHUB_TOKEN}`
    }
  });
  const existingSvgData = await existingSvgResponse.json();

  const existingSvgBase64 = existingSvgData.content;
  const existingSvgStr = Buffer.from(existingSvgBase64, 'base64').toString('utf-8');
  const svgs = JSON.parse(existingSvgStr);

  // Add new entry
  svgs.push({
    filename: fileUploadData.name,
    filepath: fileUploadData.path
  });

  const updatedSvgBase64 = Buffer.from(JSON.stringify(svgs)).toString('base64');

  // Update svgs.json in GitHub
  const svgUpdateResponse = await fetch(svgJsonURL, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${process.env.GITHUB_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: 'Update svgs.json',
      content: updatedSvgBase64
    })
  });

  // ... Your existing code to return a response
};
