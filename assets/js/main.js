let container = document.getElementById('word-container');
let allWords = [];

let date = Date();
console.log(date);

fetch('words.json')
  .then(response => response.json())
  .then(data => {
    allWords = data; // Store fetched data for later use
    populateContainer(allWords, container);
    console.log(allWords);
  })
  .catch(error => console.log('There was an error:', error));

function populateContainer(data, container) {
  if (data && Array.isArray(data)) {
    data.forEach(item => {
      let randX = (Math.floor(Math.random() * 100) + 10);
      let randY = (Math.floor(Math.random() * 100) + 10);
      let wordElement = document.createElement('div');
      wordElement.className = 'word';
      wordElement.style.position = 'relative';
      wordElement.style.paddingLeft = randX + 'px';
      wordElement.style.paddingTop = randY + 'px';
      wordElement.style.fontSize = `${item.fontSize}` + 'px';
      wordElement.innerText = `${item.word}`;
      container.appendChild(wordElement);
    });
  } else {
    console.error("Data is undefined or not an array.");
  }
}

// Event listener for scroll
container.addEventListener('scroll', () => {
  const { scrollTop, scrollHeight, clientHeight } = container;

  // Check if scrolled near bottom of the page
  if (scrollTop + clientHeight >= scrollHeight - 5) {
    populateContainer(allWords, container); // Re-run populateContainer
  }
});