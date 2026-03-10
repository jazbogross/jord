const FUNCTION_BASE_URL = '/.netlify/functions';
const RECAPTCHA_SITE_KEY = '6LcYAzUoAAAAAKnfXcLaFMzaqOJAkxgsKJmmRsPn';
const INFINITE_SCROLL_PREFETCH_MARGIN_PX = 1200;
const NAME_FEEDBACK_VOTE_LIMIT = 3;
const NAME_FEEDBACK_VOTE_COOKIE = 'jord_name_feedback_votes';
const NAME_FEEDBACK_VOTE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const DEFAULT_GARDEN_NAME_FONT_SIZE_PX = 20;
const MIN_GARDEN_NAME_FONT_SIZE_PX = 10;
const MAX_GARDEN_NAME_FONT_SIZE_PX = 72;

const state = {
  isDanish: true,
  words: [],
  names: [],
  nameFeedbackByName: {},
  soundFiles: [],
  svgWords: [],
  activeWordSpan: null,
  activeCommentsDiv: null,
  activeCommentForm: null,
  activeNameItem: null,
  isAppendingGardenBatch: false
};

let elements = {};
let gardenScrollObserver = null;
let gardenNameMotionObserver = null;
let isGardenScrollFallbackBound = false;

document.addEventListener('DOMContentLoaded', init);

function init() {
  elements = {
    container: document.getElementById('word-container'),
    introContainer: document.getElementById('introContainer'),
    introTitle: document.getElementById('introTitle'),
    introText: document.getElementById('introText'),
    enterGarden: document.getElementById('enterGarden'),
    wordAgain: document.getElementById('wordAgain'),
    suggestName: document.getElementById('suggestName'),
    formContainer: document.getElementById('formContainer'),
    wordForm: document.getElementById('wordForm'),
    wordInput: document.getElementById('word'),
    sendAWord: document.getElementById('sendAWord'),
    cancelWord: document.getElementById('cancel'),
    formContainerName: document.getElementById('formContainerName'),
    nameForm: document.getElementById('nameForm'),
    nameInput: document.getElementById('gardenName'),
    sendAName: document.getElementById('sendAName'),
    cancelName: document.getElementById('cancelName'),
    nameFeedbackContainer: document.getElementById('nameFeedbackContainer'),
    nameFeedbackDialog: document.getElementById('nameFeedbackDialog'),
    closeNameFeedback: document.getElementById('closeNameFeedback'),
    nameFeedbackForm: document.getElementById('nameFeedbackForm'),
    nameFeedbackTitle: document.getElementById('nameFeedbackTitle'),
    nameFeedbackPrompt: document.getElementById('nameFeedbackPrompt'),
    feedbackName: document.getElementById('feedbackName'),
    nameFeedbackComment: document.getElementById('nameFeedbackComment'),
    nameFeedbackStatus: document.getElementById('nameFeedbackStatus'),
    nameFeedbackColumnsToggle: document.getElementById('nameFeedbackColumnsToggle'),
    nameFeedbackColumnsTitle: document.getElementById('nameFeedbackColumnsTitle'),
    nameFeedbackColumns: document.getElementById('nameFeedbackColumns'),
    nameFeedbackList: document.getElementById('nameFeedbackList'),
    nameFeedbackPositiveButton: document.querySelector('.sentimentButton[data-sentiment="positive"]'),
    nameFeedbackNegativeButton: document.querySelector('.sentimentButton[data-sentiment="negative"]'),
    sentimentButtons: Array.from(document.querySelectorAll('.sentimentButton'))
  };

  if (!elements.container) {
    return;
  }

  state.isDanish = getBrowserLanguage().includes('da');

  applyCopy();
  bindUi();
  loadGardenContent();
}

function applyCopy() {
  const copy = getCopy();

  if (elements.wordAgain) {
    elements.wordAgain.textContent = copy.wordAgain;
  }

  if (elements.sendAWord) {
    elements.sendAWord.textContent = copy.sendAWord;
  }

  if (elements.cancelWord) {
    elements.cancelWord.textContent = copy.cancel;
  }

  if (elements.sendAName) {
    elements.sendAName.textContent = copy.sendAName;
  }

  if (elements.cancelName) {
    elements.cancelName.textContent = copy.cancel;
  }

  if (elements.introTitle) {
    elements.introTitle.textContent = copy.introTitle;
  }

  if (elements.introText) {
    elements.introText.textContent = copy.introText;
  }

  if (elements.wordInput) {
    elements.wordInput.placeholder = copy.wordInputPlaceholder;
  }

  if (elements.nameInput) {
    elements.nameInput.placeholder = copy.nameInputPlaceholder;
  }

  if (elements.nameFeedbackPrompt) {
    elements.nameFeedbackPrompt.textContent = copy.nameFeedbackPrompt;
  }

  if (elements.nameFeedbackComment) {
    elements.nameFeedbackComment.placeholder = copy.nameCommentPlaceholder;
  }

  if (elements.nameFeedbackColumnsTitle) {
    elements.nameFeedbackColumnsTitle.textContent = copy.nameFeedbackColumnsTitle;
  }

  if (elements.nameFeedbackPositiveButton) {
    elements.nameFeedbackPositiveButton.textContent = copy.nameFeedbackPositiveButton;
  }

  if (elements.nameFeedbackNegativeButton) {
    elements.nameFeedbackNegativeButton.textContent = copy.nameFeedbackNegativeButton;
  }
}

function bindUi() {
  if (elements.enterGarden) {
    elements.enterGarden.addEventListener('click', closeIntro);
  }

  if (elements.wordAgain) {
    elements.wordAgain.addEventListener('click', openWordForm);
  }

  if (elements.suggestName) {
    elements.suggestName.addEventListener('click', openNameForm);
  }

  if (elements.cancelWord) {
    elements.cancelWord.addEventListener('click', closeWordForm);
  }

  if (elements.cancelName) {
    elements.cancelName.addEventListener('click', closeNameForm);
  }

  if (elements.closeNameFeedback) {
    elements.closeNameFeedback.addEventListener('click', closeNameFeedbackDialog);
  }

  if (elements.nameFeedbackContainer) {
    elements.nameFeedbackContainer.addEventListener('click', (event) => {
      if (event.target === elements.nameFeedbackContainer) {
        closeNameFeedbackDialog();
      }
    });
  }

  if (elements.wordForm) {
    elements.wordForm.addEventListener('submit', submitWord);
  }

  if (elements.nameForm) {
    elements.nameForm.addEventListener('submit', submitName);
  }

  if (elements.nameFeedbackForm) {
    elements.nameFeedbackForm.addEventListener('submit', submitNameFeedback);
  }

  if (elements.nameFeedbackComment) {
    elements.nameFeedbackComment.addEventListener('input', autoResizeTextarea);
  }

  if (elements.nameFeedbackColumnsToggle) {
    elements.nameFeedbackColumnsToggle.addEventListener('click', toggleNameFeedbackColumns);
  }

  window.addEventListener('resize', ensureGardenHasScrollableContent);
}

async function loadGardenContent() {
  const [words, names, soundManifest, svgManifest, nameFeedbackByName] = await Promise.all([
    fetchStaticJson('words.json', []),
    fetchStaticJson('names.json', []),
    fetchStaticJson('lydfiler.json', { filenames: [] }),
    fetchStaticJson('svgs.json', { filenames: [] }),
    fetchStaticJson('name-feedback.json', {})
  ]);

  state.words = Array.isArray(words) ? words : [];
  state.names = Array.isArray(names) ? names : [];
  state.nameFeedbackByName = normalizeNameFeedbackByName(nameFeedbackByName);
  state.soundFiles = Array.isArray(soundManifest.filenames) ? soundManifest.filenames : [];
  state.svgWords = Array.isArray(svgManifest.filenames)
    ? svgManifest.filenames.map((filename) => filename.replace('.svg', ''))
    : [];

  renderGarden();
}

function renderGarden() {
  elements.container.innerHTML = '';
  disconnectGardenInfiniteScroll();
  disconnectGardenNameMotionObserver();
  elements.scrollSentinel = null;

  appendGardenBatch();
  ensureGardenScrollSentinel();
  setupGardenInfiniteScroll();
  ensureGardenHasScrollableContent();
}

function createMatrixItem(item) {
  const wrapper = document.createElement('div');
  const span = document.createElement('span');
  const randomX = Math.floor(Math.random() * 100) + 10;
  const randomY = Math.floor(Math.random() * 100) + 10;
  const fontSize = getGardenItemFontSize(item);

  wrapper.className = item.type === 'name' ? 'word garden-name' : 'word';
  wrapper.style.paddingLeft = `${randomX}px`;
  wrapper.style.paddingTop = `${randomY}px`;
  wrapper.style.fontSize = `${fontSize}px`;

  if (item.type === 'name') {
    wrapper.dataset.nameKey = getGardenNameKey(item.name);
  }

  if (item.type === 'word' && state.svgWords.includes(item.word)) {
    const img = document.createElement('img');
    img.setAttribute('src', `/svg/${item.word}.svg`);
    img.setAttribute('alt', `A vector graphic in handwriting of the word ${item.word}`);
    img.setAttribute('height', fontSize * 2);
    img.style.maxWidth = '95vw';
    span.style.fontSize = `${fontSize * 2}px`;
    span.appendChild(img);
  } else {
    span.textContent = item.type === 'word'
      ? capitalizeFirstLetter(item.word)
      : formatGardenNameForDisplay(item.name);
  }

  if (item.type === 'name') {
    span.style.color = getGardenNameColor(item);
    decorateGardenNameMotion(span);
    span.addEventListener('click', () => openNameFeedbackDialog(item));
  } else {
    span.addEventListener('click', () => toggleWordComments(item.word, wrapper, span));
  }

  wrapper.appendChild(span);

  if (item.type === 'name') {
    registerGardenNameMotion(span);
  }

  return wrapper;
}

function insertAudioElements(renderedElements) {
  if (!state.soundFiles.length || !renderedElements.length) {
    return;
  }

  state.soundFiles.forEach((filename) => {
    const randomIndex = Math.floor(Math.random() * renderedElements.length);
    const audioElement = document.createElement('audio');
    audioElement.setAttribute('src', `/lyd/${filename}`);
    audioElement.setAttribute('controls', 'controls');
    elements.container.insertBefore(audioElement, renderedElements[randomIndex] || null);
  });
}

function appendGardenBatch() {
  if (!elements.container || !hasGardenItems() || state.isAppendingGardenBatch) {
    return false;
  }

  state.isAppendingGardenBatch = true;

  const renderItems = buildGardenRenderItems();
  const fragment = document.createDocumentFragment();
  const renderedElements = [];
  const insertionPoint = elements.scrollSentinel || null;

  renderItems.forEach((item) => {
    const matrixItem = createMatrixItem(item);
    renderedElements.push(matrixItem);
    fragment.appendChild(matrixItem);
  });

  elements.container.insertBefore(fragment, insertionPoint);
  insertAudioElements(renderedElements);
  state.isAppendingGardenBatch = false;

  return renderedElements.length > 0;
}

function buildGardenRenderItems() {
  return shuffleItems([
    ...state.words.map((item) => ({ ...item, type: 'word' })),
    ...state.names.map((item) => ({ ...item, type: 'name' }))
  ]);
}

function hasGardenItems() {
  return state.words.length > 0 || state.names.length > 0;
}

function ensureGardenScrollSentinel() {
  if (!elements.container) {
    return;
  }

  if (!elements.scrollSentinel) {
    elements.scrollSentinel = document.createElement('div');
    elements.scrollSentinel.className = 'scrollSentinel';
    elements.scrollSentinel.setAttribute('aria-hidden', 'true');
  }

  if (elements.scrollSentinel.parentNode !== elements.container) {
    elements.container.appendChild(elements.scrollSentinel);
  } else if (elements.container.lastElementChild !== elements.scrollSentinel) {
    elements.container.appendChild(elements.scrollSentinel);
  }
}

function setupGardenInfiniteScroll() {
  if (!elements.scrollSentinel) {
    return;
  }

  if ('IntersectionObserver' in window) {
    gardenScrollObserver = new IntersectionObserver(handleGardenScrollIntersection, {
      root: null,
      rootMargin: `${INFINITE_SCROLL_PREFETCH_MARGIN_PX}px 0px`,
      threshold: 0
    });
    gardenScrollObserver.observe(elements.scrollSentinel);
    return;
  }

  bindGardenScrollFallback();
}

function disconnectGardenInfiniteScroll() {
  if (gardenScrollObserver) {
    gardenScrollObserver.disconnect();
    gardenScrollObserver = null;
  }
}

function ensureGardenNameMotionObserver() {
  if (gardenNameMotionObserver || !('IntersectionObserver' in window)) {
    return;
  }

  gardenNameMotionObserver = new IntersectionObserver(handleGardenNameMotionIntersection, {
    root: null,
    threshold: 0.01
  });
}

function disconnectGardenNameMotionObserver() {
  if (gardenNameMotionObserver) {
    gardenNameMotionObserver.disconnect();
    gardenNameMotionObserver = null;
  }
}

function registerGardenNameMotion(element) {
  if (!element) {
    return;
  }

  if (!('IntersectionObserver' in window)) {
    element.classList.add('is-drifting');
    return;
  }

  ensureGardenNameMotionObserver();
  gardenNameMotionObserver.observe(element);
}

function handleGardenNameMotionIntersection(entries) {
  entries.forEach((entry) => {
    entry.target.classList.toggle('is-drifting', entry.isIntersecting);
  });
}

function handleGardenScrollIntersection(entries) {
  const isSentinelVisible = entries.some((entry) => entry.isIntersecting);
  if (!isSentinelVisible) {
    return;
  }

  ensureGardenHasScrollableContent();
}

function bindGardenScrollFallback() {
  if (isGardenScrollFallbackBound) {
    return;
  }

  window.addEventListener('scroll', maybeAppendGardenBatchOnScroll, { passive: true });
  isGardenScrollFallbackBound = true;
}

function maybeAppendGardenBatchOnScroll() {
  ensureGardenHasScrollableContent();
}

function ensureGardenHasScrollableContent() {
  if (!hasGardenItems() || state.isAppendingGardenBatch) {
    return;
  }

  let previousScrollHeight = -1;

  while (getDistanceToBottom() <= INFINITE_SCROLL_PREFETCH_MARGIN_PX) {
    const currentScrollHeight = document.documentElement.scrollHeight;
    if (currentScrollHeight === previousScrollHeight) {
      break;
    }

    previousScrollHeight = currentScrollHeight;
    const didAppend = appendGardenBatch();
    if (!didAppend) {
      break;
    }
  }
}

function getDistanceToBottom() {
  return document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
}

async function toggleWordComments(word, wordElement, spanElement) {
  closeNameFeedbackDialog();

  if (state.activeWordSpan === spanElement) {
    clearActiveWordSelection();
    return;
  }

  clearActiveWordSelection();
  spanElement.style.backgroundColor = 'yellow';
  state.activeWordSpan = spanElement;

  const comments = await fetchWordComments(word);
  showWordComments(word, comments, wordElement);
}

async function fetchWordComments(word) {
  const allComments = await fetchStaticJson('comments.json', {});
  const normalizedWord = normalizeText(word);
  const matchKey = Object.keys(allComments).find((key) => normalizeText(key) === normalizedWord);

  if (!matchKey || typeof allComments[matchKey] !== 'object') {
    return [];
  }

  return Object.values(allComments[matchKey]).sort(sortByDate);
}

function showWordComments(word, comments, wordElement) {
  const commentsDiv = document.createElement('div');
  const form = document.createElement('form');
  const hiddenWordInput = document.createElement('input');
  const textarea = document.createElement('textarea');
  const button = document.createElement('button');
  const buttonWrap = document.createElement('div');
  const copy = getCopy();

  commentsDiv.className = 'comments-div';
  commentsDiv.style.paddingTop = window.getComputedStyle(wordElement).getPropertyValue('padding-top');

  form.className = 'comment-form';

  hiddenWordInput.type = 'hidden';
  hiddenWordInput.name = 'commentWord';
  hiddenWordInput.value = word.toLowerCase();

  textarea.name = 'comment';
  textarea.placeholder = copy.wordCommentPlaceholder;

  button.type = 'submit';
  button.textContent = copy.send;

  buttonWrap.className = 'button-div';
  buttonWrap.appendChild(button);

  form.appendChild(hiddenWordInput);
  form.appendChild(textarea);
  form.appendChild(buttonWrap);
  form.addEventListener('submit', submitWordComment);

  wordElement.appendChild(form);
  wordElement.insertAdjacentElement('afterend', commentsDiv);

  state.activeCommentForm = form;
  state.activeCommentsDiv = commentsDiv;

  if (!comments.length) {
    const emptyComment = document.createElement('div');
    emptyComment.className = 'comment';
    emptyComment.textContent = copy.noWordComments.replace('{word}', word);
    commentsDiv.appendChild(emptyComment);
    return;
  }

  comments.forEach((comment) => {
    const commentElement = document.createElement('div');
    const divider = document.createElement('hr');

    commentElement.className = 'comment';
    commentElement.textContent = comment.text;
    commentsDiv.appendChild(commentElement);
    commentsDiv.appendChild(divider);
  });
}

async function submitWordComment(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const formData = new FormData(form);
  const payload = {
    commentWord: formData.get('commentWord'),
    comment: formData.get('comment'),
    'g-recaptcha-response': await executeRecaptcha()
  };

  form.style.display = 'none';

  try {
    const response = await postJson('submit-comment', payload);
    if (!response.ok) {
      throw new Error(await response.text());
    }

    form.textContent = getCopy().wordCommentSuccess;
  } catch (error) {
    console.error('Comment submission failed:', error);
    form.textContent = getCopy().errorMessage;
  }

  form.style.display = 'block';
  form.style.fontSize = '12px';
  form.style.fontStyle = 'italic';
  form.style.width = '140px';
  form.style.wordBreak = 'normal';
}

function clearActiveWordSelection() {
  if (state.activeWordSpan) {
    state.activeWordSpan.style.backgroundColor = '';
    state.activeWordSpan = null;
  }

  if (state.activeCommentsDiv) {
    state.activeCommentsDiv.remove();
    state.activeCommentsDiv = null;
  }

  if (state.activeCommentForm) {
    state.activeCommentForm.remove();
    state.activeCommentForm = null;
  }
}

async function openNameFeedbackDialog(nameItem) {
  closeWordForm();
  closeNameForm();
  clearActiveWordSelection();

  state.activeNameItem = nameItem;

  if (elements.nameFeedbackForm) {
    elements.nameFeedbackForm.reset();
  }

  elements.feedbackName.value = nameItem.name;
  elements.nameFeedbackTitle.textContent = formatGardenNameForDisplay(nameItem.name);
  elements.nameFeedbackStatus.textContent = '';
  setNameFeedbackControlsDisabled(false);
  resetTextareaHeight(elements.nameFeedbackComment);

  const feedback = fetchNameFeedback(nameItem.name);
  renderNameFeedback(feedback);
  collapseNameFeedbackSections();
  showOverlay(elements.nameFeedbackContainer);

  if (!syncNameFeedbackVoteLimitState(nameItem.name)) {
    focusNameFeedbackComment();
  }
}

function closeNameFeedbackDialog() {
  state.activeNameItem = null;

  if (elements.nameFeedbackStatus) {
    elements.nameFeedbackStatus.textContent = '';
  }

  if (elements.nameFeedbackForm) {
    elements.nameFeedbackForm.reset();
    delete elements.nameFeedbackForm.dataset.isSubmitting;
  }

  setNameFeedbackControlsDisabled(false);
  resetTextareaHeight(elements.nameFeedbackComment);
  collapseNameFeedbackSections();
  hideOverlay(elements.nameFeedbackContainer);
}

function fetchNameFeedback(name) {
  return state.nameFeedbackByName[getGardenNameKey(name)] || createEmptyNameFeedback(name);
}

function renderNameFeedback(feedback) {
  renderFeedbackList(elements.nameFeedbackList, combineNameFeedbackComments(feedback), getCopy().noNameFeedbackComments);
}

function renderFeedbackList(container, comments, emptyText) {
  container.innerHTML = '';

  if (!comments.length) {
    const empty = document.createElement('div');
    empty.className = 'feedbackEmpty';
    empty.textContent = emptyText;
    container.appendChild(empty);
    return;
  }

  comments.forEach((comment) => {
    const item = document.createElement('div');
    item.className = 'feedbackComment';
    item.textContent = comment.text;
    container.appendChild(item);
  });
}

function collapseNameFeedbackSections() {
  setNameFeedbackColumnsExpanded(false);
}

function toggleNameFeedbackColumns() {
  if (!elements.nameFeedbackColumnsToggle) {
    return;
  }

  const isExpanded = elements.nameFeedbackColumnsToggle.getAttribute('aria-expanded') === 'true';
  setNameFeedbackColumnsExpanded(!isExpanded);
}

function setNameFeedbackColumnsExpanded(isExpanded) {
  if (!elements.nameFeedbackColumnsToggle || !elements.nameFeedbackColumns) {
    return;
  }

  elements.nameFeedbackColumnsToggle.setAttribute('aria-expanded', String(isExpanded));
  elements.nameFeedbackColumns.hidden = !isExpanded;
}

function setNameFeedbackControlsDisabled(isDisabled) {
  elements.sentimentButtons.forEach((button) => {
    button.disabled = isDisabled;
  });

  if (elements.nameFeedbackComment) {
    elements.nameFeedbackComment.disabled = isDisabled;
  }
}

function syncNameFeedbackVoteLimitState(name) {
  const isLimitReached = hasReachedNameFeedbackVoteLimit(name);
  setNameFeedbackControlsDisabled(isLimitReached);

  if (isLimitReached && elements.nameFeedbackStatus) {
    elements.nameFeedbackStatus.textContent = getCopy().nameFeedbackLimitReached;
  }

  return isLimitReached;
}

function closeIntro() {
  hideElementAfterOpacityTransition(elements.introContainer, 'is-exiting');
}

function openWordForm() {
  closeNameForm();
  closeNameFeedbackDialog();
  showOverlay(elements.formContainer);
  requestAnimationFrame(() => {
    if (elements.wordInput) {
      elements.wordInput.focus();
    }
  });
}

function closeWordForm() {
  if (elements.wordForm) {
    elements.wordForm.reset();
  }

  hideOverlay(elements.formContainer);
}

function openNameForm() {
  closeWordForm();
  closeNameFeedbackDialog();
  showOverlay(elements.formContainerName);
  requestAnimationFrame(() => {
    if (elements.nameInput) {
      elements.nameInput.focus();
    }
  });
}

function closeNameForm() {
  if (elements.nameForm) {
    elements.nameForm.reset();
  }

  hideOverlay(elements.formContainerName);
}

async function submitWord(event) {
  event.preventDefault();

  const value = elements.wordInput.value.trim().toLowerCase();
  if (!value) {
    return;
  }

  const flyingCopy = createFlyingCopy(elements.wordInput, value);
  closeWordForm();
  flyElementAround(flyingCopy, getCopy().wordSubmissionMessage);

  try {
    const payload = {
      word: Array.from(new TextEncoder().encode(value)),
      'g-recaptcha-response': await executeRecaptcha()
    };
    const response = await postJson('submit-word', payload);

    if (!response.ok) {
      throw new Error(await response.text());
    }
  } catch (error) {
    console.error('Word submission failed:', error);
  }
}

async function submitName(event) {
  event.preventDefault();

  const value = normalizeSpacing(elements.nameInput.value);
  if (!value) {
    return;
  }

  const flyingCopy = createFlyingCopy(elements.nameInput, formatGardenNameForDisplay(value));
  closeNameForm();
  flyElementAround(flyingCopy, getCopy().nameSubmissionMessage);

  try {
    const payload = {
      name: Array.from(new TextEncoder().encode(value)),
      'g-recaptcha-response': await executeRecaptcha()
    };
    const response = await postJson('submit-name', payload);

    if (!response.ok) {
      throw new Error(await response.text());
    }
  } catch (error) {
    console.error('Name submission failed:', error);
  }
}

async function submitNameFeedback(event) {
  event.preventDefault();

  if (!elements.nameFeedbackForm || elements.nameFeedbackForm.dataset.isSubmitting === 'true') {
    return;
  }

  const submitter = event.submitter || document.activeElement;
  const sentiment = submitter?.dataset?.sentiment || '';
  const formData = new FormData(elements.nameFeedbackForm);

  if (!sentiment) {
    elements.nameFeedbackStatus.textContent = getCopy().selectSentimentMessage;
    return;
  }

  const feedbackName = normalizeSpacing(formData.get('feedbackName') || '');
  if (syncNameFeedbackVoteLimitState(feedbackName)) {
    return;
  }

  elements.nameFeedbackForm.dataset.isSubmitting = 'true';
  elements.nameFeedbackStatus.textContent = '';
  setNameFeedbackControlsDisabled(true);

  try {
    const payload = {
      name: feedbackName,
      sentiment,
      comment: normalizeSpacing(formData.get('comment') || ''),
      'g-recaptcha-response': await executeRecaptcha()
    };
    const response = await postJson('submit-name-feedback', payload);
    let responseBody = {};

    try {
      responseBody = await response.json();
    } catch (parseError) {
      responseBody = {};
    }

    if (!response.ok) {
      throw new Error(responseBody.message || 'Failed to submit feedback');
    }

    applySubmittedNameFeedback(payload.name, sentiment, payload.comment);
    renderNameFeedback(fetchNameFeedback(payload.name));
    updateGardenNameFontSize(payload.name);

    const voteCount = incrementNameFeedbackVoteCount(payload.name);
    elements.nameFeedbackStatus.textContent = voteCount >= NAME_FEEDBACK_VOTE_LIMIT
      ? getCopy().nameFeedbackLimitReachedAfterSubmit
      : getCopy().nameFeedbackSuccess;
    elements.nameFeedbackComment.value = '';
    resetTextareaHeight(elements.nameFeedbackComment);
  } catch (error) {
    console.error('Name feedback submission failed:', error);
    elements.nameFeedbackStatus.textContent = getCopy().errorMessage;
  } finally {
    delete elements.nameFeedbackForm.dataset.isSubmitting;

    if (!state.activeNameItem || !hasReachedNameFeedbackVoteLimit(state.activeNameItem.name)) {
      setNameFeedbackControlsDisabled(false);
    }
  }
}

function decorateGardenNameMotion(element) {
  element.style.setProperty('--drift-duration', `${randomNumber(16, 26)}s`);
  element.style.setProperty('--drift-delay', `${randomNumber(-12, 0)}s`);
  element.style.setProperty('--drift-x-one', `${randomNumber(-38, 38)}px`);
  element.style.setProperty('--drift-y-one', `${randomNumber(-32, 32)}px`);
  element.style.setProperty('--drift-x-two', `${randomNumber(-38, 38)}px`);
  element.style.setProperty('--drift-y-two', `${randomNumber(-32, 32)}px`);
}

function createFlyingCopy(inputElement, text) {
  const rect = inputElement.getBoundingClientRect();
  const flyingCopy = document.createElement('div');
  const computedStyle = window.getComputedStyle(inputElement);

  flyingCopy.textContent = text;

  for (let index = 0; index < computedStyle.length; index += 1) {
    const property = computedStyle[index];
    flyingCopy.style.setProperty(property, computedStyle.getPropertyValue(property));
  }

  flyingCopy.style.position = 'fixed';
  flyingCopy.style.left = `${rect.left}px`;
  flyingCopy.style.top = `${rect.top}px`;
  flyingCopy.style.width = `${rect.width}px`;
  flyingCopy.style.height = `${rect.height}px`;
  flyingCopy.style.border = 'none';
  flyingCopy.style.zIndex = '1300';

  document.body.appendChild(flyingCopy);

  return flyingCopy;
}

function flyElementAround(element, message) {
  const rect = element.getBoundingClientRect();
  const messageDiv = document.createElement('div');

  element.style.position = 'fixed';
  element.style.left = `${rect.left}px`;
  element.style.top = `${rect.top}px`;

  messageDiv.textContent = message;
  messageDiv.style.fontSize = '12px';
  messageDiv.style.color = 'green';
  messageDiv.style.bottom = '-25px';
  messageDiv.style.opacity = '0';
  messageDiv.style.position = 'absolute';
  element.appendChild(messageDiv);

  function animateElement() {
    const x = Math.random() * (window.innerWidth / 4);
    const y = Math.random() * (window.innerHeight / 4);
    const bezierCurve = 'cubic-bezier(0.68, -0.55, 0.27, 1.55)';

    element.style.transition = `all 1s ${bezierCurve}`;
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
  }

  animateElement();

  setTimeout(() => {
    messageDiv.style.transition = 'opacity 0.5s ease';
    messageDiv.style.opacity = '1';
  }, 900);

  setTimeout(() => {
    element.style.left = '2000px';
    setTimeout(() => element.remove(), 500);
  }, 5000);
}

async function executeRecaptcha() {
  if (typeof grecaptcha === 'undefined') {
    throw new Error('reCAPTCHA is not available');
  }

  return grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'submit' });
}

async function postJson(functionName, payload) {
  return fetch(`${FUNCTION_BASE_URL}/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}

async function fetchStaticJson(path, fallback) {
  try {
    const response = await fetch(resolveSitePath(path));

    if (!response.ok) {
      throw new Error(`Failed to load ${path}`);
    }

    return response.json();
  } catch (error) {
    console.error(`Error fetching ${path}:`, error);
    return fallback;
  }
}

function resolveSitePath(path) {
  return path.startsWith('/') ? path : `/${path}`;
}

function showOverlay(element) {
  if (!element) {
    return;
  }

  element.classList.remove('is-hidden');
}

function hideOverlay(element) {
  if (!element) {
    return;
  }

  element.classList.add('is-hidden');
}

function hideElementAfterOpacityTransition(element, transitionClassName) {
  if (
    !element ||
    element.classList.contains('is-hidden') ||
    element.classList.contains(transitionClassName)
  ) {
    return;
  }

  let isHidden = false;
  let fallbackTimeoutId = 0;

  const finalizeHide = () => {
    if (isHidden) {
      return;
    }

    isHidden = true;
    window.clearTimeout(fallbackTimeoutId);
    element.removeEventListener('transitionend', handleTransitionEnd);
    element.classList.remove(transitionClassName);
    element.classList.add('is-hidden');
  };

  const handleTransitionEnd = (event) => {
    if (event.target !== element || event.propertyName !== 'opacity') {
      return;
    }

    finalizeHide();
  };

  element.addEventListener('transitionend', handleTransitionEnd);
  element.classList.add(transitionClassName);

  const transitionTimeoutMs = getTransitionTimeoutMs(element, 'opacity');
  if (transitionTimeoutMs === 0) {
    finalizeHide();
    return;
  }

  fallbackTimeoutId = window.setTimeout(finalizeHide, transitionTimeoutMs + 100);
}

function getTransitionTimeoutMs(element, propertyName) {
  const computedStyle = window.getComputedStyle(element);
  const properties = computedStyle.transitionProperty.split(',').map((value) => value.trim());
  const durations = computedStyle.transitionDuration.split(',').map(parseTransitionTimeToMs);
  const delays = computedStyle.transitionDelay.split(',').map(parseTransitionTimeToMs);
  const transitionCount = Math.max(properties.length, durations.length, delays.length);

  for (let index = 0; index < transitionCount; index += 1) {
    const property = properties[index % properties.length];
    if (property !== propertyName && property !== 'all') {
      continue;
    }

    const duration = durations[index % durations.length] || 0;
    const delay = delays[index % delays.length] || 0;
    return duration + delay;
  }

  return 0;
}

function parseTransitionTimeToMs(value) {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return 0;
  }

  if (trimmedValue.endsWith('ms')) {
    return Number.parseFloat(trimmedValue);
  }

  if (trimmedValue.endsWith('s')) {
    return Number.parseFloat(trimmedValue) * 1000;
  }

  return 0;
}

function autoResizeTextarea(event) {
  resizeTextarea(event.currentTarget);
}

function resetTextareaHeight(textarea) {
  if (!textarea) {
    return;
  }

  textarea.style.height = 'auto';
}

function resizeTextarea(textarea) {
  if (!textarea) {
    return;
  }

  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight}px`;
}

function focusNameFeedbackComment() {
  if (!elements.nameFeedbackComment) {
    return;
  }

  requestAnimationFrame(() => {
    elements.nameFeedbackComment.focus();

    const cursorPosition = elements.nameFeedbackComment.value.length;
    elements.nameFeedbackComment.setSelectionRange(cursorPosition, cursorPosition);
  });
}

function combineNameFeedbackComments(feedback) {
  const positiveComments = Array.isArray(feedback.positiveComments)
    ? feedback.positiveComments.map((comment) => ({ ...comment, sentiment: 'positive' }))
    : [];
  const negativeComments = Array.isArray(feedback.negativeComments)
    ? feedback.negativeComments.map((comment) => ({ ...comment, sentiment: 'negative' }))
    : [];

  return [...positiveComments, ...negativeComments].sort(sortByDate);
}

function normalizeNameFeedbackByName(feedbackByName) {
  if (!feedbackByName || typeof feedbackByName !== 'object') {
    return {};
  }

  return Object.entries(feedbackByName).reduce((normalizedFeedbackByName, [nameKey, feedback]) => {
    normalizedFeedbackByName[nameKey] = normalizeNameFeedback(feedback, feedback?.name || nameKey);
    return normalizedFeedbackByName;
  }, {});
}

function normalizeNameFeedback(feedback, fallbackName) {
  return {
    name: normalizeSpacing(feedback?.name || fallbackName),
    likes: Number(feedback?.likes || 0),
    dislikes: Number(feedback?.dislikes || 0),
    positiveComments: Array.isArray(feedback?.positiveComments) ? feedback.positiveComments : [],
    negativeComments: Array.isArray(feedback?.negativeComments) ? feedback.negativeComments : []
  };
}

function applySubmittedNameFeedback(name, sentiment, comment) {
  const nameKey = getGardenNameKey(name);
  const nextFeedback = normalizeNameFeedback(state.nameFeedbackByName[nameKey], name);

  if (sentiment === 'positive') {
    nextFeedback.likes += 1;
    if (comment) {
      nextFeedback.positiveComments.push({
        text: comment,
        date: new Date().toISOString()
      });
    }
  } else {
    nextFeedback.dislikes += 1;
    if (comment) {
      nextFeedback.negativeComments.push({
        text: comment,
        date: new Date().toISOString()
      });
    }
  }

  state.nameFeedbackByName[nameKey] = nextFeedback;
}

function getCookieValue(name) {
  const encodedName = `${encodeURIComponent(name)}=`;
  const cookies = document.cookie ? document.cookie.split('; ') : [];

  for (const cookie of cookies) {
    if (cookie.startsWith(encodedName)) {
      return cookie.slice(encodedName.length);
    }
  }

  return '';
}

function setCookie(name, value, maxAgeSeconds) {
  const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${encodeURIComponent(name)}=${value}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax${secureFlag}`;
}

function getNameFeedbackVoteCounts() {
  const cookieValue = getCookieValue(NAME_FEEDBACK_VOTE_COOKIE);
  if (!cookieValue) {
    return {};
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(cookieValue));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    return {};
  }
}

function setNameFeedbackVoteCounts(counts) {
  setCookie(
    NAME_FEEDBACK_VOTE_COOKIE,
    encodeURIComponent(JSON.stringify(counts)),
    NAME_FEEDBACK_VOTE_COOKIE_MAX_AGE_SECONDS
  );
}

function getGardenNameKey(name) {
  return normalizeText(name);
}

function getNameFeedbackVoteCount(name) {
  const counts = getNameFeedbackVoteCounts();
  return Number(counts[getGardenNameKey(name)] || 0);
}

function hasReachedNameFeedbackVoteLimit(name) {
  return getNameFeedbackVoteCount(name) >= NAME_FEEDBACK_VOTE_LIMIT;
}

function incrementNameFeedbackVoteCount(name) {
  const counts = getNameFeedbackVoteCounts();
  const nameKey = getGardenNameKey(name);
  const nextVoteCount = Math.min(
    NAME_FEEDBACK_VOTE_LIMIT,
    Number(counts[nameKey] || 0) + 1
  );

  counts[nameKey] = nextVoteCount;
  setNameFeedbackVoteCounts(counts);

  return nextVoteCount;
}

function clampGardenNameFontSize(value) {
  const numericValue = Number(value);
  const safeValue = Number.isFinite(numericValue) ? numericValue : DEFAULT_GARDEN_NAME_FONT_SIZE_PX;

  return Math.min(MAX_GARDEN_NAME_FONT_SIZE_PX, Math.max(MIN_GARDEN_NAME_FONT_SIZE_PX, safeValue));
}

function getGardenItemFontSize(item) {
  const numericFontSize = Number(item.fontSize);

  if (item.type === 'name') {
    return getGardenNameDisplayFontSize(item.name);
  }

  return Number.isFinite(numericFontSize) ? numericFontSize : 20;
}

function getGardenNameBaseFontSize(name) {
  return DEFAULT_GARDEN_NAME_FONT_SIZE_PX;
}

function getGardenNameDisplayFontSize(name) {
  const feedback = fetchNameFeedback(name);
  return clampGardenNameFontSize(getGardenNameBaseFontSize(name) + feedback.likes - feedback.dislikes);
}

function updateGardenNameFontSize(name) {
  const nameKey = getGardenNameKey(name);
  const displayFontSize = getGardenNameDisplayFontSize(name);

  if (!elements.container) {
    return;
  }

  elements.container.querySelectorAll('.word.garden-name').forEach((element) => {
    if (element.dataset.nameKey === nameKey) {
      element.style.fontSize = `${displayFontSize}px`;
    }
  });
}

function getBrowserLanguage() {
  return navigator.language || navigator.userLanguage || '';
}

function getGardenNameColor(item) {
  if (item.color) {
    return item.color;
  }

  const name = item.name || '';
  let hash = 0;

  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) >>> 0;
  }

  const hue = hash % 360;
  const saturation = 44 + (hash % 18);
  const lightness = 36 + (hash % 12);

  return `hsl(${hue}deg ${saturation}% ${lightness}%)`;
}

function getCopy() {
  if (state.isDanish) {
    return {
      wordAgain: 'Send endnu et ord fra haven',
      sendAWord: 'Send et ord fra haven',
      sendAName: 'Foresla et navn til haven',
      cancel: 'Fortryd',
      close: 'Luk',
      send: 'Send',
      introTitle: 'Rønnebæksholms Virtuelle Have',
      introText: "Denne hjemmeside lader dig indsende ord, baseret på hvad du oplever i Rønnebæksholm Haven, lytte til havens lyde, og foreslå et nyt navn til haven.",
      wordInputPlaceholder: 'Dit ord',
      nameInputPlaceholder: 'Dit navneforslag',
      wordCommentPlaceholder: 'Tilføj en kommentar...',
      nameCommentPlaceholder: 'Tilføj en kommentar hvis du vil...',
      nameFeedbackPrompt: 'Kan du lide navnet?',
      nameFeedbackColumnsTitle: 'Se kommentarer',
      nameFeedbackPositiveButton: 'JEG KAN GODT LIDE NAVNET',
      nameFeedbackNegativeButton: 'JEG KAN IKKE LIDE NAVNET',
      noNameFeedbackComments: 'Der er endnu ingen kommentarer til dette navn.',
      positiveCommentsTitle: 'Positive kommentarer',
      negativeCommentsTitle: 'Negative kommentarer',
      noWordComments: 'Der er endnu ikke blevet kommenteret på "{word}". Du kan skrive den første kommentar.',
      noPositiveComments: 'Der er ingen positive kommentarer.',
      noNegativeComments: 'Der er ingen negative kommentarer.',
      wordSubmissionMessage: 'Dit ord er sendt til godkendelse',
      nameSubmissionMessage: 'Dit navneforslag er sendt til godkendelse',
      wordCommentSuccess: 'Din kommentar er blevet sendt til godkendelse!',
      nameFeedbackSuccess: 'Din mening er blevet registret!',
      nameFeedbackLimitReached: 'Du har allerede givet din mening om dette navn tre gange.',
      nameFeedbackLimitReachedAfterSubmit: 'Din mening er blevet registreret. Du har nu givet din mening om dette navn tre gange.',
      selectSentimentMessage: 'Vælg venligst om du kan lide navnet eller ej.',
      errorMessage: 'Der er sket en fejl. Prøv igen senere.'
    };
  }

  return {
    wordAgain: 'Send a word from the garden',
    sendAWord: 'Send a word from the garden',
    sendAName: 'Suggest a name for the garden',
    cancel: 'Cancel',
    close: 'Close',
    send: 'Send',
    introTitle: 'Rønnebæksholm Virtual Garden',
    introText: "This website lets you send a word based on what you notice in the Rønnebæksholm Garden, listen to its sounds, and suggest a new name for the garden.",
    wordInputPlaceholder: 'Your word',
    nameInputPlaceholder: 'Your garden name',
    wordCommentPlaceholder: 'Write your comment...',
    nameCommentPlaceholder: 'Write an optional comment...',
    nameFeedbackPrompt: 'How does this name sound to you?',
    nameFeedbackColumnsTitle: 'View comments',
    nameFeedbackPositiveButton: 'I LIKE THIS NAME',
    nameFeedbackNegativeButton: "I DON'T LIKE THIS NAME",
    noNameFeedbackComments: 'There are no comments for this name yet.',
    positiveCommentsTitle: 'Positive comments',
    negativeCommentsTitle: 'Negative comments',
    noWordComments: 'There are still no comments on "{word}". You can write the first comment.',
    noPositiveComments: 'There are no positive comments yet.',
    noNegativeComments: 'There are no negative comments yet.',
    wordSubmissionMessage: 'Your word has been sent for approval',
    nameSubmissionMessage: 'Your name suggestion has been sent for approval',
    wordCommentSuccess: 'Your comment has been sent for approval!',
    nameFeedbackSuccess: 'Your feedback has been registered!',
    nameFeedbackLimitReached: 'You have already expressed your opinion about this name three times.',
    nameFeedbackLimitReachedAfterSubmit: 'Your feedback has been registered. You have now expressed your opinion about this name three times.',
    selectSentimentMessage: 'Please choose whether you like the name or not.',
    errorMessage: 'An error has occurred. Try again later.'
  };
}

function createEmptyNameFeedback(name) {
  return {
    name,
    likes: 0,
    dislikes: 0,
    positiveComments: [],
    negativeComments: []
  };
}

function normalizeText(value) {
  return normalizeSpacing(value || '').toLowerCase();
}

function normalizeSpacing(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function formatGardenNameForDisplay(value) {
  const normalizedValue = normalizeSpacing(value);
  if (!normalizedValue) {
    return '';
  }

  return normalizedValue
    .split(/(\s+|-|'|\/)/)
    .map((part) => {
      if (!part || /^(\s+|-|'|\/)$/.test(part)) {
        return part;
      }

      return capitalizeFirstLetter(part.toLocaleLowerCase());
    })
    .join('');
}

function capitalizeFirstLetter(value) {
  if (!value) {
    return '';
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function sortByDate(first, second) {
  const firstDate = new Date(first.date || 0).getTime();
  const secondDate = new Date(second.date || 0).getTime();
  return firstDate - secondDate;
}

function shuffleItems(items) {
  const clone = [...items];

  for (let index = clone.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
  }

  return clone;
}

function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
