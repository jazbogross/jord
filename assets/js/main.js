let container = document.getElementById('word-container');
let allWords = [];
let activeSpanElement = null; // Variable to store the active span
let activeCommentsDiv = null; // Variable to store the active comments div

fetch('words.json')
  .then(response => response.json())
  .then(data => {
    allWords = data;
    populateContainer(allWords, container);
  })
  .catch(error => console.log('There was an error:', error));

function populateContainer(data, container) {
  if (data && Array.isArray(data)) {
    data.forEach(item => {
      let randX = Math.floor(Math.random() * 100) + 10;
      let randY = Math.floor(Math.random() * 100) + 10;
      let wordElement = document.createElement('div');
      let spanElement = document.createElement('span');
      wordElement.appendChild(spanElement);
      wordElement.className = 'word';
      wordElement.style.position = 'relative';
      wordElement.style.paddingLeft = randX + 'px';
      wordElement.style.paddingTop = randY + 'px';
      wordElement.style.fontSize = `${item.fontSize}px`;
      spanElement.innerText = item.word;
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
      

      container.appendChild(wordElement);
    });
  } else {
    console.error("Data is undefined or not an array.");
  }
}

async function fetchComments(word, wordElement) {
  try {
    const response = await fetch('comments.json');
    const allComments = await response.json();
    
    let comments = allComments[word] || [];
    if (comments.length === 0) {
      comments = [
        { text: `Der er endnu ikke blevet kommenteret på ${word}. Du kan skrive den første kommentar.` },];
      showComments(comments, wordElement);
    } else {
    showComments(comments, wordElement); // Call showComments with fetched comments
    }
    
  } catch (error) {
    console.error("There was an error fetching comments:", error);
  }
}

function showComments(comments, wordElement) {
  const commentsDiv = document.createElement('div');
  commentsDiv.className = 'comments-div';
  
  // Fetch padding-top style from wordElement and apply to commentsDiv
  const paddingTop = window.getComputedStyle(wordElement, null).getPropertyValue('padding-top');
  commentsDiv.style.paddingTop = paddingTop;
  commentsDiv.style.width = 'auto'; // Set the width to auto
  commentsDiv.style.maxWidth = '300px'; // Set maximum width to 300px
  commentsDiv.style.display = 'flex';

  // Insert a form with one text input field under the wordElement

  const form = document.createElement('form');
  form.className = 'comment-form';
  wordElement.appendChild(form);

  const inputWord = document.createElement('input');
  inputWord.type = 'hidden';
  inputWord.name = 'commentWord';
  inputWord.value = wordElement.innerText;
  form.appendChild(inputWord);

  const input = document.createElement('input');
  input.type = 'text';
  input.name = 'comment';
  input.placeholder = 'Skriv din kommentar...';
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

// Event listener for scroll
container.addEventListener('scroll', () => {
  const { scrollTop, scrollHeight, clientHeight } = container;

  // Check if scrolled near bottom of the page
  if (scrollTop + clientHeight >= scrollHeight - 5) {
    populateContainer(allWords, container); // Re-run populateContainer
  }
});

// CODE FOR WORD FORM LOGIC
document.addEventListener('DOMContentLoaded', (event) => {
  const formContainer = document.getElementById('formContainer');
  const wordAgain = document.getElementById('wordAgain');
  const form = document.querySelector('form');

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    formContainer.style.display = 'none'; // Hide the form immediately
    wordAgain.addEventListener("click", function(){ 
    formContainer.style.display = 'flex'; // Display again if the user clicks the button to add another word
    });

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
});

});

// COMMENT FORM LOGIC ////////////////////////////////////////////////////////////////////
function initCommentForm() {
  const commentForm = document.querySelector('.comment-form');

  if (commentForm) {
    commentForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      const recaptchaToken = await grecaptcha.execute('6LcYAzUoAAAAAKnfXcLaFMzaqOJAkxgsKJmmRsPn', { action: 'submit' });

      const formData = new FormData(commentForm);
      const payload = {
        commentWord: formData.get('commentWord'), // Assumes your comment input has a name 'commentWord'
        comment: formData.get('comment'), // Assumes your comment input has a name 'text'
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
        form.innerHTML = 'Din kommentar er sendt til godkendelse og bliver vist imorgen';
      } else {
        const text = await response.text();
        console.log('Server Response:', text);
        form.innerHTML = 'Der er sket en fejl. Præv igen lidt senere.';
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