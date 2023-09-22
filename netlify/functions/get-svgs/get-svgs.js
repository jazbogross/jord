const fs = require('fs');
const path = require('path');

exports.handler = async function(event, context) {
  try {
    // Replace this with the actual path to your SVG files
    const svgFolderPath = path.join(__dirname, 'svg'); 
    const files = fs.readdirSync(svgFolderPath);
    const svgFiles = files.filter(file => file.endsWith('.svg'));
    console.log("SVG files:", svgFiles);
    console.log("SVG folder path:", svgFolderPath);

    return {
      statusCode: 200,
      body: JSON.stringify({ svgFiles }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'An error occurred' }),
    };
  }
};
