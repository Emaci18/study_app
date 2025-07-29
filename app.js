// === Global State ===
let knownCards = [];
let unknownCards = [];
let originalCommands = [];
let commands = null;
let currentIndex = 0;
let isFlipped = false;
let userMarkedCurrentCard = false;
let quizCompleted = false;
let currentStudyDeck = null;
const questionKey = 'question';
const answerKey = 'answer';
let reviewFlashcards = [];

// DOM Elements
let cardInner, cardFront, cardBack, cardCounter;
let fileInput, startButton;

// === Utility Functions ===
const isDeckEmpty = () => !commands || commands.length === 0;
const getCurrentCard = () => commands[currentIndex];

function createButton(id, text, handler) {
  const btn = document.createElement('button');
  btn.id = id;
  btn.textContent = text;
  btn.addEventListener('click', handler);
  return btn;
}

// === File Upload and Start Section ===
function createStartSection() {
  const startSection = document.createElement('div');
  startSection.id = 'start-section';

  fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.id = 'jsonFileInput';
  fileInput.accept = '.json';

  startButton = createButton(
    'startStudyBtn',
    'Go to study session',
    handleStart
  );
  startButton.disabled = true;

  startSection.append(fileInput, startButton);
  document.body.prepend(startSection);

  fileInput.addEventListener('change', handleFileUpload);
}

async function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (!Array.isArray(data) || data.length === 0)
      throw new Error('Invalid JSON structure.');

    originalCommands = data;
    commands = [...data];
    startButton.disabled = false;
  } catch (err) {
    alert('Failed to parse JSON: ' + err.message);
    startButton.disabled = true;
  }
}

function handleStart() {
  document.getElementById('start-section').remove();
  showStudyModeMenu();
}

// === Flashcard UI ===
function createFlashcardUI() {
  const container = document.createElement('div');
  container.id = 'card-container';

  const flashcard = document.createElement('div');
  flashcard.id = 'flashcard';

  cardInner = document.createElement('div');
  cardInner.className = 'card-inner';
  cardInner.id = 'card-inner';

  cardFront = document.createElement('div');
  cardFront.className = 'card-front';
  cardFront.id = 'card-front';

  cardBack = document.createElement('div');
  cardBack.className = 'card-back';
  cardBack.id = 'card-back';

  cardInner.append(cardFront, cardBack);
  flashcard.appendChild(cardInner);
  container.appendChild(flashcard);

  // Parent container for all buttons, stack groups vertically
  const controls = document.createElement('div');
  controls.id = 'controls';
  controls.style.display = 'flex';
  controls.style.flexDirection = 'column';
  controls.style.gap = '10px'; // space between groups

  // First group container: Don't Know, Flip Card, Know (buttons horizontally)
  const group1 = document.createElement('div');
  group1.id = 'controls-group-1';
  group1.style.display = 'flex';
  group1.style.gap = '10px'; // space between buttons

  // Second group container: Previous, Shuffle, Back to Start (buttons horizontally)
  const group2 = document.createElement('div');
  group2.id = 'controls-group-2';
  group2.style.display = 'flex';
  group2.style.gap = '10px'; // space between buttons

  // Buttons info
  const group1Buttons = [
    { id: 'dontKnowBtn', text: "Don't Know", handler: markUnknown },
    { id: 'flipBtn', text: 'Flip Card', handler: flipCard },
    { id: 'knowBtn', text: 'Know', handler: markKnown },
  ];

  const group2Buttons = [
    { id: 'prevBtn', text: 'Previous', handler: prevCard },
    { id: 'shuffleBtn', text: 'Shuffle', handler: shuffleCards },
    { id: 'backToStartBtn', text: 'Back to Start', handler: backToStart },
  ];

  // Add buttons to group 1
  group1Buttons.forEach(({ id, text, handler }) => {
    group1.appendChild(createButton(id, text, handler));
  });

  // Add buttons to group 2
  group2Buttons.forEach(({ id, text, handler }) => {
    group2.appendChild(createButton(id, text, handler));
  });

  // Append both groups into controls container
  controls.appendChild(group1);
  controls.appendChild(group2);

  cardCounter = document.createElement('div');
  cardCounter.id = 'cardCounter';
  cardCounter.style.marginTop = '10px';
  cardCounter.style.fontWeight = 'bold';

  const resultsContainer = document.createElement('div');
  resultsContainer.id = 'resultsContainer';
  resultsContainer.style.display = 'none';

  container.append(controls, cardCounter);
  document.body.append(container, resultsContainer);
}

// === Card Actions ===
function showCard(index) {
  if (isDeckEmpty()) {
    cardFront.textContent = 'No cards available';
    cardBack.textContent = '';
    cardInner.className = 'card-inner';
    cardCounter.textContent = '';
    return;
  }

  const card = commands[index];
  cardFront.textContent = card[questionKey] || '[Missing question]';
  cardBack.textContent = card[answerKey] || '[Missing answer]';

  cardInner.className = `card-inner${isFlipped ? ' flipped' : ''}`;

  if (knownCards.some((c) => c[questionKey] === card[questionKey])) {
    cardInner.classList.add('known');
  } else if (unknownCards.some((c) => c[questionKey] === card[questionKey])) {
    cardInner.classList.add('unknown');
  }

  cardCounter.textContent = `Card ${index + 1} of ${commands.length}`;
  userMarkedCurrentCard = false;
}

function flipCard() {
  if (isDeckEmpty()) return;
  isFlipped = !isFlipped;
  cardInner.classList.toggle('flipped');
}

function nextCard() {
  if (isDeckEmpty() || quizCompleted) return;

  const card = getCurrentCard();
  if (
    !userMarkedCurrentCard &&
    !unknownCards.some((c) => c[questionKey] === card[questionKey])
  ) {
    unknownCards.push(card);
  }

  if (currentIndex < commands.length - 1) {
    currentIndex++;
    isFlipped = false;
    showCard(currentIndex);
  } else {
    quizCompleted = true;
    displayResults();
  }
}

function prevCard() {
  if (isDeckEmpty() || quizCompleted || currentIndex === 0) return;
  currentIndex--;
  isFlipped = false;
  showCard(currentIndex);
}

function shuffleCards() {
  if (isDeckEmpty()) return;

  // Reset known and unknown lists when shuffling
  knownCards = [];
  unknownCards = [];

  // Shuffle commands array
  commands = commands.sort(() => Math.random() - 0.5);

  currentIndex = 0;
  isFlipped = false;
  showCard(currentIndex);
}

function backToStart() {
  if (isDeckEmpty()) return;
  currentIndex = 0;
  isFlipped = false;
  knownCards = []; // Reset known cards
  unknownCards = []; // Reset unknown cards
  quizCompleted = false; // Also reset quizCompleted if you want to allow re-study
  showCard(currentIndex);
}

function markKnown() {
  const card = getCurrentCard();
  unknownCards = unknownCards.filter(
    (c) => c[questionKey] !== card[questionKey]
  );
  if (!knownCards.some((c) => c[questionKey] === card[questionKey])) {
    knownCards.push(card);
  }
  userMarkedCurrentCard = true;
  highlightCard('known');
  setTimeout(nextCard, 500);
}

function markUnknown() {
  const card = getCurrentCard();
  knownCards = knownCards.filter((c) => c[questionKey] !== card[questionKey]);
  if (!unknownCards.some((c) => c[questionKey] === card[questionKey])) {
    unknownCards.push(card);
  }
  userMarkedCurrentCard = true;
  highlightCard('unknown');
  setTimeout(nextCard, 500);
}

function highlightCard(status) {
  cardInner.classList.add(status);
  setTimeout(() => cardInner.classList.remove(status), 500);
}

function createNewDeck() {
  // Remove existing UI elements if any
  document.getElementById('card-container')?.remove();
  document.getElementById('resultsContainer')?.remove();
  document.getElementById('start-section')?.remove();

  // Optional: remove sidebar and top bar on new deck to fully reset UI
  document.getElementById('top-bar')?.remove();
  document.getElementById('sidebar-menu')?.remove();
  document.getElementById('sidebar-overlay')?.remove();

  // Reset global state
  knownCards = [];
  unknownCards = [];
  currentIndex = 0;
  isFlipped = false;
  quizCompleted = false;
  originalCommands = [];
  commands = null;
  currentStudyDeck = null;

  // Create the initial start section with file input
  createStartSection();

  // Re-create the hamburger menu so it exists fresh for the new deck
  createHamburgerMenu();
}

// === Results ===
function displayResults() {
  const score = knownCards.length;
  const total = commands.length;

  document.getElementById('card-container').style.display = 'none';
  cardCounter.textContent = '';

  const results = document.getElementById('resultsContainer');
  results.style.display = 'block';

  const reviewCards = unknownCards
    .map(
      (card) => `
        <div class="unknown-card">
            <strong>Q:</strong> ${card[questionKey] || '[?]'}<br>
            <strong>A:</strong> ${card[answerKey] || '[?]'}</div>
    `
    )
    .join('');

  const isFullDeck = currentStudyDeck.length === originalCommands.length;

  results.innerHTML = `
        <h2>Quiz Complete 🎉</h2>
        <p>You got <strong>${score}</strong> out of <strong>${total}</strong> correct.</p>
        ${
          unknownCards.length
            ? `
            <h3>Cards to review:</h3>
            <div class="unknown-cards">${reviewCards}</div>
            <button id="studyWrongBtn">Study Wrong Cards</button>
        `
            : `
            <p>Awesome job! You knew every card!</p>
        `
        }
        <button id="studyAllBtn">${
          isFullDeck ? 'Study Entire Deck' : 'Study Entire Range Again'
        }</button>
        ${
          unknownCards.length
            ? `<button id="downloadIncorrectBtn">Download Incorrect Cards</button>`
            : ''
        }
    `;

  if (unknownCards.length) {
    document
      .getElementById('studyWrongBtn')
      .addEventListener('click', () => restartSession(unknownCards));
    document
      .getElementById('downloadIncorrectBtn')
      .addEventListener('click', downloadIncorrectCards);
  }

  document
    .getElementById('studyAllBtn')
    .addEventListener('click', () => restartSession(currentStudyDeck));
}

function downloadIncorrectCards() {
  if (unknownCards.length === 0) {
    alert('No incorrect cards to download!');
    return;
  }

  const dataStr =
    'data:text/json;charset=utf-8,' +
    encodeURIComponent(JSON.stringify(unknownCards, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute('href', dataStr);
  downloadAnchorNode.setAttribute('download', 'incorrect_cards.json');
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

function restartSession(deck) {
  document.getElementById('card-container')?.remove();

  commands = [...deck];
  knownCards = [];
  unknownCards = [];
  currentIndex = 0;
  isFlipped = false;
  quizCompleted = false;

  document.getElementById('resultsContainer').style.display = 'none';
  createFlashcardUI();
  showCard(currentIndex);
}

function showPickRangeForm(menu) {
  // Clear menu content
  menu.innerHTML = '';

  // Instruction text
  const instruction = document.createElement('p');
  instruction.textContent = `Enter the start and end question numbers (1 to ${originalCommands.length}):`;
  menu.appendChild(instruction);

  // Start input
  const startInput = document.createElement('input');
  startInput.type = 'number';
  startInput.min = 1;
  startInput.max = originalCommands.length;
  startInput.placeholder = 'Start Question Number';
  menu.appendChild(startInput);

  // End input
  const endInput = document.createElement('input');
  endInput.type = 'number';
  endInput.min = 1;
  endInput.max = originalCommands.length;
  endInput.placeholder = 'End Question Number';
  menu.appendChild(endInput);

  // Error message placeholder
  const errorMsg = document.createElement('p');
  errorMsg.style.color = 'red';
  menu.appendChild(errorMsg);

  // Continue button
  const continueBtn = createButton(
    'continuePickRangeBtn',
    'Continue with study Session',
    () => {
      const start = parseInt(startInput.value, 10);
      const end = parseInt(endInput.value, 10);

      // Validation
      if (isNaN(start) || isNaN(end)) {
        errorMsg.textContent =
          'Please enter valid numbers for both start and end.';
        return;
      }
      if (
        start < 1 ||
        end < 1 ||
        start > originalCommands.length ||
        end > originalCommands.length
      ) {
        errorMsg.textContent = `Numbers must be between 1 and ${originalCommands.length}.`;
        return;
      }
      if (start > end) {
        errorMsg.textContent =
          'Start number must be less than or equal to end number.';
        return;
      }

      // Extract the subdeck and start study
      const subDeck = originalCommands.slice(start - 1, end); // slice is zero-based, end exclusive
      menu.remove();
      startStudySession(subDeck);
    }
  );
  menu.appendChild(continueBtn);
}

function startStudySession(deck) {
  knownCards = [];
  unknownCards = [];
  commands = [...deck];
  currentIndex = 0;
  isFlipped = false;
  quizCompleted = false;

  currentStudyDeck = [...deck]; // Save current study deck globally

  createFlashcardUI();
  showCard(currentIndex);
}

// === Study Mode Menu ===
function showStudyModeMenu() {
  const menu = document.createElement('div');
  menu.id = 'study-mode-menu';

  const buttons = [
    {
      id: 'generalStudyBtn',
      text: 'General Study',
      handler: () => {
        menu.remove();
        startStudySession(originalCommands);
      },
    },
    {
      id: 'pickRangeBtn',
      text: 'Pick Range',
      handler: () => showPickRangeForm(menu),
    },
    {
      id: 'homeBtn',
      text: 'Create New Deck',
      handler: () => {
        menu.remove();
        init();
      },
    },
  ];

  buttons.forEach(({ id, text, handler }) =>
    menu.appendChild(createButton(id, text, handler))
  );
  document.body.appendChild(menu);
}

function clearScreenExceptMenu() {
  // Assuming your menu has an ID or class, e.g., 'sidebar-menu' and 'top-bar'
  const menuIdsToKeep = ['sidebar-menu', 'top-bar'];

  // Get all direct children of body
  const bodyChildren = Array.from(document.body.children);

  bodyChildren.forEach((child) => {
    // If this element's id is NOT in the menu list, remove it
    if (!menuIdsToKeep.includes(child.id)) {
      child.remove();
    }
  });
}
// === Create Hamburger Top Menu ===
function createHamburgerMenu() {
  // Styles for menu and hamburger
  const style = document.createElement('style');

  document.head.appendChild(style);

  // Create top bar
  const topBar = document.createElement('div');
  topBar.id = 'top-bar';

  // Hamburger icon
  const hamburger = document.createElement('div');
  hamburger.id = 'hamburger';
  hamburger.title = 'Open Menu';
  hamburger.innerHTML = `<div></div><div></div><div></div>`;
  topBar.appendChild(hamburger);

  // Add page title or leave blank if you want
  const title = document.createElement('div');
  title.textContent = 'Flashcard App';
  title.style.marginLeft = '15px';
  title.style.fontWeight = 'bold';
  topBar.appendChild(title);

  // Sidebar menu
  const sidebar = document.createElement('div');
  sidebar.id = 'sidebar-menu';

  // Overlay behind sidebar for closing when clicking outside
  const overlay = document.createElement('div');
  overlay.id = 'sidebar-overlay';

  // Menu data
  const menuData = [
    {
      section: 'File',
      items: [
        {
          text: 'Create New Deck',
          action: () => {
            clearScreenExceptMenu();
            init();
          },
        },
      ],
    },
    {
      section: 'Study Mode',
      items: [
        {
          text: 'Home',
          action: () => {
            closeSidebar();
            document.getElementById('card-container').remove();
            showStudyModeMenu();
          },
        },
      ],
    },
    {
      section: 'Help',
      items: [
        {
          text: 'About',
          action: () => alert('Flashcard app v1.0\nCreated by You'),
        },
      ],
    },
  ];

  // Build menu UI
  menuData.forEach(({ section, items }) => {
    const secDiv = document.createElement('div');
    secDiv.className = 'menu-section';

    const heading = document.createElement('h3');
    heading.textContent = section;
    secDiv.appendChild(heading);

    items.forEach(({ text, action }) => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'menu-item';
      itemDiv.textContent = text;
      itemDiv.tabIndex = 0; // make focusable for accessibility
      itemDiv.addEventListener('click', action);
      itemDiv.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          action();
        }
      });
      secDiv.appendChild(itemDiv);
    });

    sidebar.appendChild(secDiv);
  });

  // Add elements to DOM
  document.body.prepend(topBar, sidebar, overlay);

  // Open/close sidebar handlers
  function openSidebar() {
    sidebar.classList.add('open');
    overlay.classList.add('visible');
  }
  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
  }

  hamburger.addEventListener('click', () => {
    if (sidebar.classList.contains('open')) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });

  overlay.addEventListener('click', closeSidebar);

  // Optional: Close sidebar on ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('open')) {
      closeSidebar();
    }
  });

  // Add top padding so page content not hidden under fixed top bar
  document.body.style.paddingTop = '50px';
}

function showEntryOptions() {
  // Clean up any existing UI elements
  document.getElementById('entry-options')?.remove();
  document.getElementById('upload-container')?.remove();
  document.getElementById('start-section')?.remove();
  document.getElementById('study-mode-menu')?.remove();
  document.getElementById('card-container')?.remove();
  document.getElementById('resultsContainer')?.remove();
  document.getElementById('top-bar')?.remove();
  document.getElementById('sidebar-menu')?.remove();
  document.getElementById('sidebar-overlay')?.remove();

  const wrapper = document.createElement('div');
  wrapper.id = 'entry-options';

  const heading = document.createElement('h2');
  heading.textContent = 'Welcome! What would you like to do?';

  const newBtn = createButton('createNewBtn', 'Create New Flashcards', () => {
    startCardCreation(); // 🚀 This now triggers the full UI
  });

  const uploadBtn = createButton(
    'uploadExistingBtn',
    'Upload Existing Cards',
    () => {
      wrapper.remove();
      createStartSection();
    }
  );

  wrapper.append(heading, newBtn, uploadBtn);
  document.body.appendChild(wrapper);
}

function startCardCreation() {
  // Clear page and show top bar
  document.body.innerHTML = '';
  createHamburgerMenu();

  // Flashcard storage
  const flashcards = [];
  let currentIndex = 0;

  const container = document.createElement('div');
  container.id = 'card-creator-container';

  const formContainer = document.createElement('div');
  formContainer.className = 'form-group';

  const questionInput = document.createElement('textarea');
  questionInput.placeholder = 'Enter question...';
  questionInput.className = 'input-box';

  const answerInput = document.createElement('textarea');
  answerInput.placeholder = 'Enter answer...';
  answerInput.className = 'input-box';

  formContainer.append(questionInput, answerInput);

  // Button group: Back + Next
  const navButtonsContainer = document.createElement('div');
  navButtonsContainer.className = 'button-group';

  const backBtn = createButton('backBtn', 'Back', () => {
    if (currentIndex > 0) {
      currentIndex--;
      const { question, answer } = flashcards[currentIndex];
      questionInput.value = question;
      answerInput.value = answer;
    }
  });

  const nextBtn = createButton('nextBtn', 'Next Card', () => {
    const question = questionInput.value.trim();
    const answer = answerInput.value.trim();
    if (!question || !answer) {
      alert('Both question and answer are required.');
      return;
    }

    flashcards[currentIndex] = { question, answer };
    currentIndex++;

    // Clear for next input
    questionInput.value = '';
    answerInput.value = '';
  });

  navButtonsContainer.append(backBtn, nextBtn);

  // Done button
  const doneBtnContainer = document.createElement('div');
  doneBtnContainer.className = 'done-button-container';

  const doneBtn = createButton('doneBtn', 'Done Creating Flashcards', () => {
    const question = questionInput.value.trim();
    const answer = answerInput.value.trim();

    // Save the last card if valid
    if (question || answer) {
      flashcards[currentIndex] = { question, answer };
    }

    // Filter out any cards that are invalid or empty
    const validCards = flashcards.filter(
      (card) =>
        card &&
        typeof card.question === 'string' &&
        typeof card.answer === 'string' &&
        card.question.trim() !== '' &&
        card.answer.trim() !== ''
    );

    if (validCards.length === 0) {
      alert('You haven’t added any valid flashcards.');
      return;
    }

    console.log('Created Cards:', validCards);
    // Proceed to study session or wherever you want
    // startStudySession(validCards); // Or replace with showEntryOptions(), etc.
    showReviewScreen(flashcards);
  });

  doneBtnContainer.appendChild(doneBtn);

  // Compose everything
  container.append(formContainer, navButtonsContainer, doneBtnContainer);
  document.body.appendChild(container);
}

function showReviewScreen(flashcards) {
  // Clear existing UI
  originalCommands = [...flashcards];
  reviewFlashcards = [...flashcards];
  document.body.innerHTML = '';
  createHamburgerMenu();

  const container = document.createElement('div');
  container.id = 'review-container';

  const heading = document.createElement('h2');
  heading.textContent = 'Review Your Created Flashcards';

  // Deck name input container
  const deckNameContainer = document.createElement('div');
  deckNameContainer.className = 'input-group';
  deckNameContainer.style.marginBottom = '20px';

  const deckNameLabel = document.createElement('label');
  deckNameLabel.textContent = 'Deck Name:';
  deckNameLabel.style.minWidth = '80px';
  deckNameLabel.style.fontWeight = '600';
  deckNameLabel.style.marginRight = '10px';
  deckNameLabel.setAttribute('for', 'deckNameInput');

  const deckNameInput = document.createElement('input');
  deckNameInput.type = 'text';
  deckNameInput.id = 'deckNameInput';
  deckNameInput.placeholder = 'Enter deck name';
  deckNameInput.style.flexGrow = '1';
  deckNameInput.style.padding = '8px 10px';
  deckNameInput.style.borderRadius = '5px';
  deckNameInput.style.border = '1px solid var(--border-color, #ccc)';
  deckNameInput.style.fontSize = '14px';

  deckNameContainer.append(deckNameLabel, deckNameInput);

  const cardList = document.createElement('div');
  cardList.className = 'flashcard-list';

  function createCardElement(card, index) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'flashcard-review';

    // Question container
    const qContainer = document.createElement('div');
    qContainer.className = 'input-group';

    const qLabel = document.createElement('label');
    qLabel.textContent = `Q${index + 1}:`;
    qLabel.style.minWidth = '30px';
    qLabel.style.fontWeight = '600';
    qLabel.style.marginRight = '8px';

    const qTextarea = document.createElement('textarea');
    qTextarea.value = card.question;
    qTextarea.rows = 2;
    qTextarea.className = 'flashcard-textarea';
    qTextarea.placeholder = `Question ${index + 1}`;

    qContainer.append(qLabel, qTextarea);

    // Answer container
    const aContainer = document.createElement('div');
    aContainer.className = 'input-group';

    const aLabel = document.createElement('label');
    aLabel.textContent = `A${index + 1}:`;
    aLabel.style.minWidth = '30px';
    aLabel.style.fontWeight = '600';
    aLabel.style.marginRight = '8px';

    const aTextarea = document.createElement('textarea');
    aTextarea.value = card.answer;
    aTextarea.rows = 2;
    aTextarea.className = 'flashcard-textarea';
    aTextarea.placeholder = `Answer ${index + 1}`;

    aContainer.append(aLabel, aTextarea);

    // Update flashcard on input
    qTextarea.addEventListener('input', () => {
      reviewFlashcards[index].question = qTextarea.value;
    });
    aTextarea.addEventListener('input', () => {
      reviewFlashcards[index].answer = aTextarea.value;
    });

    cardDiv.append(qContainer, aContainer);

    return cardDiv;
  }

  // Render all existing cards initially
  flashcards.forEach((card, index) => {
    const cardElem = createCardElement(card, index);
    cardList.appendChild(cardElem);
  });

  // Add Another Card button
  const addCardBtn = createButton('addCardBtn', 'Add Another Card', () => {
    // Add new empty flashcard to array
    flashcards.push({ question: '', answer: '' });

    // Create new card element and append
    const newIndex = flashcards.length - 1;
    const newCardElem = createCardElement(flashcards[newIndex], newIndex);
    cardList.appendChild(newCardElem);

    // Scroll to bottom to show new card
    newCardElem.scrollIntoView({ behavior: 'smooth' });
  });
  addCardBtn.style.display = 'block';
  addCardBtn.style.margin = '15px auto';

  // Disclaimer
  const disclaimer = document.createElement('p');
  disclaimer.textContent =
    'We recommend you download the flashcards before proceeding.';
  disclaimer.style.fontStyle = 'italic';
  disclaimer.style.marginTop = '15px';
  disclaimer.style.textAlign = 'center';

  // Buttons container
  const btnContainer = document.createElement('div');
  btnContainer.className = 'button-group';

  // Start Study Session button
  const startStudyBtn = createButton(
    'startStudyBtn',
    'Start Study Session',
    () => {
      document.getElementById('review-container').remove();
      showStudyModeMenu(); // Assuming this function exists
    }
  );

  const downloadBtn = createButton(
    'downloadFlashcardsBtn',
    'Download Flashcards',
    () => {
      const deckName = deckNameInput.value.trim();
      if (!deckName) {
        alert('Please enter a deck name before downloading.');
        deckNameInput.focus();
        return;
      }

      // Filter out empty cards (both question and answer empty or whitespace)
      const filteredFlashcards = flashcards.filter(
        ({ question, answer }) => question.trim() !== '' || answer.trim() !== ''
      );

      if (filteredFlashcards.length === 0) {
        alert('You have no valid flashcards to download.');
        return;
      }

      const dataStr =
        'data:text/json;charset=utf-8,' +
        encodeURIComponent(
          JSON.stringify(filteredFlashcards, null, 2) // Just the array here
        );
      const dlAnchor = document.createElement('a');
      dlAnchor.setAttribute('href', dataStr);
      dlAnchor.setAttribute('download', `${deckName}.json`); // Deck name as filename
      document.body.appendChild(dlAnchor);
      dlAnchor.click();
      dlAnchor.remove();
    }
  );

  btnContainer.append(startStudyBtn, downloadBtn);

  container.append(
    heading,
    deckNameContainer,
    cardList,
    addCardBtn,
    disclaimer,
    btnContainer
  );
  document.body.appendChild(container);
}

function init() {
  showEntryOptions();
  createHamburgerMenu();
}
// === Init ===

init();
