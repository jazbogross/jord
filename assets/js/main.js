const container = document.getElementById('word-container');
const wordAgain = document.getElementById('wordAgain');
const cancelBtn = document.getElementById('cancel');
const sendAWord = document.getElementById('sendAWord');
let wordElements = []; // Array to hold the 'word' div elements
let allWords = [];
let infiniteScrolls = 0;
let activeSpanElement = null; // Variable to store the active span
let activeCommentsDiv = null; // Variable to store the active comments div
let browserLanguage = getBrowserLanguage();
let isDanish = true;

function createNameSuggestForm() {
  const formContainer = document.createElement('div');
  formContainer.setAttribute('id', 'name-container');
  formContainer.innerHTML = `
  <div><h1>Har du et forslag til hvad haven kan hedde?</h1></div>
  <form id="nameSuggestForm" action="https://XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" method="POST">
    <input type="text" name="name" placeholder="Navn" required>

    <button type="submit">Send</button>
  </form>
  `;
  const randomIndex = Math.floor(Math.random() * wordElements.length); // Get a random index
  console.log(randomIndex);
  // Place the audio element before the randomly chosen word element
  container.insertBefore(formContainer, wordElements[randomIndex]);
}




fetch('words.json')
  .then(response => response.json())
  .then(data => {
    allWords = data;
    populateContainer(data, container);
  })
  .catch(error => console.log('There was an error:', error));

cancelBtn.addEventListener("click", function(){
  formContainer.style.display = 'none'; // Hide the form if the user clicks the button to cancel
  wordAgain.style.zIndex = "999";
  document.getElementById('wordForm').reset();

}) 

wordAgain.addEventListener("click", function(){ 
  formContainer.style.display = 'flex'; // Display again if the user clicks the button to add another word
  wordAgain.style.zIndex = "unset";
   document.getElementById('wordForm').reset();
});

if (browserLanguage.includes('da')) {
  isDanish = true;
} else {
  isDanish = false;
  wordAgain.innerText = "Send another word from the garden";
  cancelBtn.innerText = "Cancel";
  sendAWord.innerText = "Send a word from the garden";
}

function getBrowserLanguage() {
  const lang = navigator.language || navigator.userLanguage; 
  return lang;
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Fetch sound files
async function getSounds() {
  try {
    const response = await fetch("/lydfiler.json");
    const jsonData = await response.json();
    const filenames = jsonData.filenames;
    return filenames;
  } catch (error) {
    console.error("Error fetching JSON:", error);
    return [];
  }
}

// Fetch SVGs and return an array of clean filenames
async function getSvgs() {
  try {
    const response = await fetch("/svgs.json");
    const jsonData = await response.json();
    const filenames = jsonData.filenames;
    const cleanFilenames = filenames.map(filename => filename.replace(".svg", ""));
    return cleanFilenames;
  } catch (error) {
    console.error("Error fetching JSON:", error);
    return [];
  }
}

async function populateContainer(data, container) {
  let soundFilenames = [];


  getSounds().then(filenames => {
    soundFilenames = filenames;

    if (data && Array.isArray(data)) {
      getSvgs().then(cleanFilenames => {
        data.forEach(item => {
          let randX = Math.floor(Math.random() * 100) + 10;
          let randY = Math.floor(Math.random() * 100) + 10;
          let wordElement = document.createElement('div');
          let spanElement = document.createElement('span');
          let itemWord = item.word;
          let fontSize = item.fontSize;
          let capitalizedWord = capitalizeFirstLetter(itemWord);
          wordElement.className = 'word';
          wordElement.style.position = 'relative';
          wordElement.style.paddingLeft = randX + 'px';
          wordElement.style.paddingTop = randY + 'px';
          wordElement.style.fontSize = `${item.fontSize}px`;

          if (cleanFilenames.includes(item.word)) {
            const img = document.createElement("img");
            img.setAttribute("src", "/svg/" + item.word + ".svg");
            img.setAttribute("alt", 'A vector graphic in handwriting of the word ' + item.word);
            img.setAttribute("height", fontSize * 2);
            img.style.maxWidth = "95vw";
            spanElement.style.fontSize = fontSize * 2 + 'px';
            spanElement.appendChild(img);
            wordElement.appendChild(spanElement);
            container.appendChild(wordElement);
          } else {
            spanElement.innerText = capitalizedWord;
            wordElement.appendChild(spanElement);
            container.appendChild(wordElement);
          }

          // Append the 'word' div element to the wordElements array
          wordElements.push(wordElement);

      // Add the show-comments functionality as a click event to the span element which holds either the word or the svg representation of that word.
      spanElement.addEventListener('click', function() {
        // Remove any previous active span's background and comments
        if (activeSpanElement) {
          activeSpanElement.style.backgroundColor = '';
          
          // Remove comments
          if (activeCommentsDiv) {
            activeCommentsDiv.remove();
          }
          
          // Remove form if it exists
          const existingForm = activeSpanElement.closest('.word').querySelector('.comment-form');
          if (existingForm) {
            existingForm.remove();
          }
        }
      
        // If clicking the same span, just reset the active span
        if (activeSpanElement === spanElement) {
          activeSpanElement = null;
          return;
        }
      
        spanElement.style.backgroundColor = 'yellow'; // Highlight the span
        fetchComments(item.word, wordElement);
        
        activeSpanElement = spanElement; // Set the new active span
        });

        });

        // Insert the audio files randomly among the 'word' elements
        if (soundFilenames.length > 0) {
          soundFilenames.forEach(soundFilename => {
            const randomIndex = Math.floor(Math.random() * wordElements.length); // Get a random index
            let soundElement = document.createElement('audio');
            soundElement.setAttribute("src", "/lyd/" + soundFilename);
            soundElement.setAttribute("controls", "controls");

            // Place the audio element before the randomly chosen word element
            container.insertBefore(soundElement, wordElements[randomIndex]);
          });
        }
      });
    } else {
      console.error("Data is undefined or not an array.");
    }
  });
}

async function fetchComments(word, wordElement) {
  try {
    const response = await fetch('comments.json');
    const allComments = await response.json();
    
    let comments = allComments[word] || [];
    if (comments.length === 0) {
      if (isDanish == true) {
        comments = [
          { text: `Der er endnu ikke blevet kommenteret på "${word}". Du kan skrive den første kommentar.` },];
        showComments(comments, wordElement);
        } else {
          comments = [
            { text: `There are still no comments on "${word}". You can write the first comment` },];
          showComments(comments, wordElement);
        }
       } else {
    showComments(comments, wordElement); // Call showComments with fetched comments
    }
  } 
    catch (error) {
      console.error("There was an error fetching comments:", error);
  }

}

function showComments(comments, wordElement) {
  const commentsDiv = document.createElement('div');
  commentsDiv.className = 'comments-div';
  
  // Fetch padding-top style from wordElement and apply to commentsDiv
  const paddingTop = window.getComputedStyle(wordElement, null).getPropertyValue('padding-top');
  commentsDiv.style.paddingTop = paddingTop;


  // Insert a form with one text input field under the wordElement

  const form = document.createElement('form');
  form.className = 'comment-form';
  wordElement.appendChild(form);

  const inputWord = document.createElement('input');
  inputWord.type = 'hidden';
  inputWord.name = 'commentWord';
  inputWord.maxLength = "500";
  inputWord.value = wordElement.innerText.toLowerCase();
  form.appendChild(inputWord);

  const input = document.createElement('textarea');
  input.type = 'text';
  input.name = 'comment';
  if (isDanish == true) {
    input.placeholder = 'Skriv din kommentar...';
    } else {
    input.placeholder = 'Write your comment...';
    }
  form.appendChild(input);
  
  const button = document.createElement('button');
  button.type = 'submit';
  button.innerText = 'send';
  const buttonDiv = document.createElement('div');
  buttonDiv.className = 'button-div';
  buttonDiv.appendChild(button);
  form.appendChild(buttonDiv);
  form.appendChild(button);
  
  // Insert the comments div after the clicked word
  wordElement.insertAdjacentElement('afterend', commentsDiv);
  activeCommentsDiv = commentsDiv; // Set the new active comments div

  initCommentForm(); // Initialize the comment form
  
  let index = 0;
  const commentKeys = Object.keys(comments);

  async function appendNextComment() {
    if (index < commentKeys.length) {
      const key = commentKeys[index];
      const value = comments[key];
      
      const commentElement = document.createElement('div');
      commentElement.className = 'comment';
      commentElement.innerText = value.text;
      commentsDiv.appendChild(commentElement);
  
      const hr = document.createElement('hr');
      commentsDiv.appendChild(hr);
  
      index++;
      await new Promise(resolve => setTimeout(resolve, 300)); // Wait for 300 milliseconds before appending the next comment
      appendNextComment();
    }
  }
  appendNextComment();
}

async function flyElementAround(element) {

  // Get the initial position of the element
  const rect = element.getBoundingClientRect();
  const initialX = rect.left;
  const initialY = rect.top;

  // Set the initial position
  element.style.position = 'fixed';
  element.style.left = `${initialX}px`;
  element.style.top = `${initialY}px`;

    // Create the message div
    const messageDiv = document.createElement('div');
    if (isDanish == true) {
      messageDiv.textContent = 'Dit ord er sendt til godkendelse';
      } else {
        messageDiv.textContent = "Your word has been sent for approval";
      }
    messageDiv.style.fontSize = "12px";
    messageDiv.style.color = "green";
    messageDiv.style.bottom = '-25px'; // 20 pixels below the element
   // messageDiv.style.left = '0';
    messageDiv.style.opacity = '0'; // Start with opacity 0, so we can fade it in
  
    // Append the message to the same div as newFly
    element.appendChild(messageDiv);

  // Create a recursive function for animation
  function animateElement() {
    // Generate random coordinates
    const x = Math.random() * window.innerWidth / 4;
    const y = Math.random() * window.innerHeight / 4;

 // Bezier curve for smooth motion
    // Format: cubic-bezier(P1x, P1y, P2x, P2y)
    const bezierCurve = 'cubic-bezier(0.68, -0.55, 0.27, 1.55)';

    // Animate the element to the new coordinates
    element.style.transition = `all 1s ${bezierCurve}`;
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;

    // Call the function recursively to keep the element moving
    setTimeout(animateElement, 5000)
    
  }

  // Kick off the animation
  animateElement();

    // Display the message after 1 second
  setTimeout(() => {
    messageDiv.style.transition = 'opacity 0.5s ease';
    messageDiv.style.opacity = '1';
  }, 1000);


  // Set up removal after 5 seconds
  setTimeout(() => {
    element.style.left = '2000px';
    setTimeout(() => element.remove(), 500);
  }, 5000);
}

// Event listener for infinite scroll
window.addEventListener('scroll', () => {
  const scrollTop = window.scrollY; 
  const scrollHeight = document.documentElement.scrollHeight; 
  const clientHeight = window.innerHeight;
  
  // console.log(`scrollTop: ${scrollTop}, scrollHeight: ${scrollHeight}, clientHeight: ${clientHeight}`);
  
  if (scrollTop + clientHeight >= scrollHeight - 5) {
    infiniteScrolls ++;
//    console.log(infiniteScrolls);
    populateContainer(allWords, container);
//    if (infiniteScrolls == 16) {
//      const spacer = document.createElement('div');
//      spacer.style.height = "100vw";
//      spacer.style.width = "100vw";
//      container.appendChild(spacer);
//      populateContainer(allWords, container);
//    }
//    if (infiniteScrolls == 17) {
//      container.innerText = "";
//      const spacer = document.createElement('div');
//      spacer.style.height = "100vw";
//      spacer.style.width = "100vw";
//      container.appendChild(spacer);
//      // allWords = [];
//      infiniteScrolls = 0;
//      populateContainer(allWords, container);
//  } 
}
});

// WORD FORM LOGIC
document.addEventListener('DOMContentLoaded', (event) => {
  const formContainer = document.getElementById('formContainer');
  const form = document.querySelector('form');

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    const flyWord = document.getElementById('word');
    
    // Get the position and dimensions of the original word
    const rect = flyWord.getBoundingClientRect();

    // Create a new div that is a copy of the original word
    const newFly = document.createElement('div');
    newFly.id = 'flyWord';
    newFly.textContent = flyWord.value; // Or another way to copy the word

        // Copy all computed styles to the new element
        const computedStyle = window.getComputedStyle(flyWord);
        for (let i = 0; i < computedStyle.length; i++) {
          const key = computedStyle[i];
          const value = computedStyle.getPropertyValue(key);
          newFly.style[key] = value;
        }

    // Position the new div to exactly overlap the original word
    newFly.style.position = 'fixed';
    newFly.style.left = `${rect.left}px`;
    newFly.style.top = `${rect.top}px`;
    newFly.style.width = `${rect.width}px`;
    newFly.style.height = `${rect.height}px`;
    newFly.style.border = 'none';
    newFly.style.zIndex = "999";

    // Add the new div to the body
    document.body.appendChild(newFly);
    formContainer.style.display = 'none'; // Hide the form immediately
    flyElementAround(newFly);
    wordAgain.style.zIndex = "999"; 

    // Get the word from form data and make it lowercase
    const formData = new FormData(form);
   // console.log('formData:',formData);
    const originalWord = formData.get('word');
   // console.log('originalWord:',originalWord);
    const lowercaseWord = originalWord.toLowerCase();
   // console.log(lowercaseWord);

    // UTF-8 encode the word
    const encoder = new TextEncoder();
    const encodedWord = encoder.encode(lowercaseWord);

    // Execute reCAPTCHA and get the token
    const recaptchaToken = await grecaptcha.execute('6LcYAzUoAAAAAKnfXcLaFMzaqOJAkxgsKJmmRsPn', { action: 'submit' });

    const payload = {
      word: encodedWord, // Use the UTF-8 encoded word
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
     // form.reset();
    } else {
      // Log the text response from the server for debugging
      const text = await response.text();
      console.log('Server Response:', text);
    //  form.reset();

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
  });
});

// COMMENT FORM LOGIC ////////////////////////////////////////////////////////////////////
function initCommentForm() {
  const commentForm = document.querySelector('.comment-form');

  if (commentForm) {
    commentForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      document.querySelector('.comment-form').style.display = 'none'; // Hide the form immediately

      const recaptchaToken = await grecaptcha.execute('6LcYAzUoAAAAAKnfXcLaFMzaqOJAkxgsKJmmRsPn', { action: 'submit' });

      const formData = new FormData(commentForm);
      const payload = {
        commentWord: formData.get('commentWord'), // Assumes comment input has a name 'commentWord'
        comment: formData.get('comment'), // Assumes comment input has a name 'comment'
        'g-recaptcha-response': recaptchaToken
      };

      const response = await fetch('https://soft-crostata-20d468.netlify.app/.netlify/functions/submit-comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });      

      if (response.ok) {
        const data = await response.json();
        console.log('Success:', data);
        // remove the comment form and display a success message
        if (isDanish == true) {
          document.querySelector('.comment-form').innerText = 'Din kommentar er blevet sendt til godkendelse!';
        } else {
          document.querySelector('.comment-form').innerText = 'Your comment has been sent for approval!';
        }
        document.querySelector('.comment-form').style.display = 'block'; 
        document.querySelector('.comment-form').style.fontSize = '12px';
        document.querySelector('.comment-form').style.fontStyle = 'italic';
        document.querySelector('.comment-form').style.width = '100px';
        document.querySelector('.comment-form').style.wordBreak = 'normal';
        createNameSuggestForm();
      } else {
        const text = await response.text();
        console.log('Server Response:', text);
        if (isDanish == true) {
          document.querySelector('.comment-form').innerText = 'Der er sket en fejl.<br>Prøv igen senere.';
        } else {
          document.querySelector('.comment-form').innerText = 'An error has ocurred.<br>Try again later.';
        }
        document.querySelector('.comment-form').style.display = 'block'; 
        document.querySelector('.comment-form').style.fontSize = '12px';
        document.querySelector('.comment-form').style.fontStyle = 'italic';
        document.querySelector('.comment-form').style.width = '100px';
        try {
          if (text) {
            const data = JSON.parse(text);
            console.log('Parsed Error:', data);
          }
        } catch (e) {
          console.error('Parse Error:', e);
        }
      }
    });
  }
}

