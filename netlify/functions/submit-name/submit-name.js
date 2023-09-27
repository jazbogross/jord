const fs = require('fs');
const path = require('path');

exports.handler = async function(event, context) {
  try {
    const payload = JSON.parse(event.body);

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

    // Step 2: Fetch Existing Comments and compare with incoming
    const nameSuggestion = payload.name;
    const currentDate = new Date().toISOString();

    const filePath = path.join(__dirname, './navne-forslag.json');
    let nameSuggestions = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const existingSuggestion = nameSuggestions.find(
      (entry) => entry.nameSuggestion.toLowerCase() === nameSuggestion.toLowerCase()
    );

    // Step 3: Push to json file based on whether the suggestion already exists or not
    if (existingSuggestion) {
      existingSuggestion.dates.push(currentDate);
    } else {
      nameSuggestions.push({
        nameSuggestion,
        dates: [currentDate],
      });
    }

    fs.writeFileSync(filePath, JSON.stringify(nameSuggestions, null, 2));

    return {
      statusCode: 200,
      body: JSON.stringify({ status: 'Name suggestion submitted' }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to submit name suggestion' }),
    };
  }
};
