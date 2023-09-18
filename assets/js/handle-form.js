document.addEventListener('DOMContentLoaded', (event) => {
    const formContainer = document.querySelector('#form-container');
    const form = document.querySelector('form');
  
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
  
      // Execute reCAPTCHA and get the token
      const recaptchaToken = await grecaptcha.execute('6LcYAzUoAAAAAKnfXcLaFMzaqOJAkxgsKJmmRsPn', { action: 'submit' });
  
      const formData = new FormData(form);
      const payload = {
        word: formData.get('word'),
        'g-recaptcha-response': recaptchaToken // Include the reCAPTCHA token
      };
  
      const response = await fetch('https://soft-crostata-20d468.netlify.app/.netlify/functions/submit-word', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

    // Check if the response is okay (status code in the range 200-299)
    if (response.ok) {
      const data = await response.json();
      console.log('Success:', data);
    } else {
      // Log the text response from the server for debugging
      const text = await response.text();
      console.log('Server Response:', text);

      try {
        // Try parsing the server response into JSON
        if (text) {
          const data = JSON.parse(text);
          console.log('Parsed Error:', data);
        }
      } catch (e) {
        // Log any parsing errors
        console.error('Parse Error:', e);
      }
    }
    formContainer.remove();
  });
  
});