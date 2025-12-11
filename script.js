// script.js - 100% Original Code (No External Dependencies)

// Text Cleaning and Processing Utilities
class TextProcessor {
    static cleanPDFText(rawText) {
        // Remove PDF artifacts and fix common issues
        let cleaned = rawText
            // Remove multiple spaces
            .replace(/\s+/g, ' ')
            // Fix broken words (e.g., "w o r d" -> "word")
            .replace(/\b(\w)\s+(?=\w\b)/g, '$1')
            // Remove standalone numbers and R characters (PDF artifacts)
            .replace(/\b\d+\s*R\s*/g, ' ')
            // Remove page markers
            .replace(/\/Type\s*\/Pages?/gi, '')
            .replace(/\/Kids\s*\[.*?\]/gi, '')
            .replace(/\/Count\s*\d+/gi, '')
            .replace(/<<|>>/g, '')
            .replace(/endobj/g, '')
            // Remove PDF commands
            .replace(/\/[A-Z][a-zA-Z0-9]*/g, ' ')
            // Fix sentence breaks
            .replace(/([a-z])([A-Z])/g, '$1. $2')
            // Remove excessive punctuation
            .replace(/[.!?]{2,}/g, '.')
            // Clean up whitespace
            .trim();

        return cleaned;
    }

    static extractReadableText(text) {
        // Remove mathematical formulas and keep only readable text
        let readable = text
            // Remove complex math notation
            .replace(/\$\$[^$]+\$\$/g, ' [math] ')
            .replace(/\$[^$]+\$/g, ' [formula] ')
            // Remove LaTeX commands
            .replace(/\\[a-z]+\{[^}]*\}/gi, '')
            .replace(/\\[a-z]+/gi, '')
            // Remove special characters clusters
            .replace(/[^\w\s.,!?;:()\-'"/]{3,}/g, ' ')
            // Keep only printable ASCII characters
            .replace(/[^\x20-\x7E\n]/g, ' ')
            // Remove numbers that are alone (likely page numbers or artifacts)
            .replace(/\b\d+\b/g, '')
            .trim();

        return readable;
    }

    static improveStructure(text) {
        // Add proper paragraph breaks
        let structured = text
            // Add breaks after periods followed by capital letters
            .replace(/\.\s*([A-Z])/g, '.\n\n$1')
            // Fix common title patterns
            .replace(/([a-z])\s*([A-Z][A-Z\s]+):/g, '$1\n\n$2:')
            // Remove extra blank lines
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        return structured;
    }
}

// Enhanced Quiz Generator Class
class QuizGenerator {
    constructor(text) {
        this.rawText = text;
        this.text = this.preprocessText(text);
        this.sentences = this.splitSentences(this.text);
    }

    preprocessText(text) {
        // Clean and structure the text
        let processed = TextProcessor.cleanPDFText(text);
        processed = TextProcessor.extractReadableText(processed);
        processed = TextProcessor.improveStructure(processed);
        return processed;
    }

    splitSentences(text) {
        // Better sentence splitting
        const sentences = text
            .split(/[.!?]+\s+/)
            .map(s => s.trim())
            .filter(s => {
                // Filter out garbage sentences
                const wordCount = s.split(/\s+/).length;
                const hasLetters = /[a-zA-Z]{3,}/.test(s);
                const notTooShort = s.length > 20;
                const notTooLong = s.length < 500;
                const notMostlyNumbers = (s.match(/\d/g) || []).length < s.length * 0.5;
                
                return wordCount >= 3 && hasLetters && notTooShort && notTooLong && notMostlyNumbers;
            });

        return sentences;
    }

    extractKeySentences(maxSentences = 10) {
        const importantWords = [
            'define', 'definition', 'important', 'key', 'main', 'primary',
            'significant', 'crucial', 'essential', 'means', 'refers to',
            'is a', 'are a', 'includes', 'consists of', 'theory', 'principle',
            'concept', 'method', 'process', 'system', 'function', 'purpose'
        ];

        const scoredSentences = this.sentences.map((sentence, idx) => {
            let score = 0;
            const lower = sentence.toLowerCase();

            // Score based on important words
            importantWords.forEach(word => {
                if (lower.includes(word)) score += 3;
            });

            // Score based on position (early sentences often more important)
            if (idx < 5) score += 3;
            else if (idx < 10) score += 2;

            // Score based on length (not too short, not too long)
            const wordCount = sentence.split(/\s+/).length;
            if (wordCount >= 8 && wordCount <= 25) score += 3;
            else if (wordCount >= 5 && wordCount <= 30) score += 1;

            // Score based on proper nouns
            const properNouns = sentence.match(/\b[A-Z][a-z]+\b/g);
            if (properNouns) score += Math.min(properNouns.length * 0.5, 3);

            // Penalize sentences with too many numbers
            const numbers = sentence.match(/\d+/g) || [];
            if (numbers.length > 3) score -= 2;

            // Bonus for sentences with colons (often definitions)
            if (sentence.includes(':')) score += 2;

            return { sentence, score };
        });

        // Sort by score and return top sentences
        scoredSentences.sort((a, b) => b.score - a.score);
        return scoredSentences
            .slice(0, maxSentences * 2)
            .filter(s => s.score > 0)
            .slice(0, maxSentences)
            .map(s => s.sentence);
    }

    extractKeyTerms(maxTerms = 15) {
        // Extract meaningful terms
        const words = this.text.match(/\b[A-Z][a-z]{2,}\b/g) || [];
        const frequency = {};
        
        // Common words to exclude
        const commonWords = new Set([
            'The', 'This', 'That', 'These', 'Those', 'There', 'Where',
            'When', 'What', 'Which', 'Who', 'How', 'Why', 'Could', 'Would',
            'Should', 'Must', 'May', 'Can', 'Will', 'Shall', 'Page'
        ]);

        words.forEach(word => {
            if (word.length > 3 && !commonWords.has(word)) {
                frequency[word] = (frequency[word] || 0) + 1;
            }
        });

        return Object.entries(frequency)
            .filter(([term, count]) => count >= 2)
            .sort((a, b) => b[1] - a[1])
            .slice(0, maxTerms)
            .map(([term]) => term);
    }

    generateQuiz() {
        const questions = [];

        // True/False questions from key sentences
        const tfSentences = this.sentences
            .filter(s => s.split(/\s+/).length >= 8 && s.split(/\s+/).length <= 25)
            .slice(0, 5);

        tfSentences.forEach((sentence, idx) => {
            questions.push({
                id: `tf${idx}`,
                type: 'truefalse',
                question: sentence.trim(),
                correctAnswer: 'true',
                options: ['True', 'False']
            });
        });

        // Multiple choice from definitions
        const definitionPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\s+(?:is|are|refers to|means|defines?)\s+([^.!?]{10,100})/g;
        let match;
        let mcqCount = 0;

        while ((match = definitionPattern.exec(this.text)) && mcqCount < 5) {
            const term = match[1].trim();
            const definition = match[2].trim();

            if (definition.split(/\s+/).length < 3) continue;

            // Generate better distractors
            const words = definition.split(/\s+/);
            const midPoint = Math.floor(words.length / 2);
            
            const distractor1 = words.slice(0, midPoint).join(' ') + ' (incorrect)';
            const distractor2 = words.slice(midPoint).join(' ') + ' (incorrect)';
            const distractor3 = 'None of the above';

            const options = [definition, distractor1, distractor2, distractor3];

            // Shuffle options
            for (let i = options.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [options[i], options[j]] = [options[j], options[i]];
            }

            questions.push({
                id: `mcq${mcqCount}`,
                type: 'mcq',
                question: `What is ${term}?`,
                correctAnswer: definition,
                options: options
            });
            mcqCount++;
        }

        // Fill in the blank questions
        const fibSentences = this.sentences
            .filter(s => {
                const words = s.split(/\s+/);
                return words.length >= 8 && words.length <= 20;
            })
            .slice(0, 5);

        fibSentences.forEach((sentence, idx) => {
            const words = sentence.split(/\s+/);
            // Choose a meaningful word (longer words)
            const meaningfulWords = words
                .map((w, i) => ({ word: w, index: i }))
                .filter(({word}) => word.length > 4 && /^[a-zA-Z]+$/.test(word))
                .sort((a, b) => b.word.length - a.word.length);

            if (meaningfulWords.length > 0) {
                const blankIdx = meaningfulWords[0].index;
                const correctWord = words[blankIdx];
                const questionText = words
                    .map((w, i) => i === blankIdx ? '______' : w)
                    .join(' ');

                questions.push({
                    id: `fib${idx}`,
                    type: 'fillblank',
                    question: questionText,
                    correctAnswer: correctWord.toLowerCase().replace(/[^a-z]/g, '')
                });
            }
        });

        return questions.slice(0, 10);
    }
}

// Global variables
let quizData = null;
let userAnswers = {};
let showingResults = false;

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileName = document.getElementById('fileName');
const textInput = document.getElementById('textInput');
const generateBtn = document.getElementById('generateBtn');
const loading = document.getElementById('loading');
const inputSection = document.getElementById('inputSection');
const notesSection = document.getElementById('notesSection');
const quizSection = document.getElementById('quizSection');
const submitBtn = document.getElementById('submitBtn');
const resetBtn = document.getElementById('resetBtn');

// File Upload Handlers
uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) {
        fileInput.files = e.dataTransfer.files;
        handleFileUpload(file);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) {
        handleFileUpload(e.target.files[0]);
    }
});

async function handleFileUpload(file) {
    fileName.textContent = `📄 ${file.name}`;
    fileName.style.display = 'block';

    try {
        let extractedText = '';

        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            // Handle PDF files with raw extraction
            extractedText = await extractPDFTextRaw(file);
        } else if (file.type.includes('text') || file.name.toLowerCase().endsWith('.txt')) {
            // Handle text files
            extractedText = await file.text();
        } else {
            alert('Supported files: PDF or TXT. For best results, paste text directly or use TXT files.');
            return;
        }

        // Clean and display the text
        const cleanedText = TextProcessor.cleanPDFText(extractedText);
        textInput.value = cleanedText;

        if (cleanedText.length < 50) {
            alert('Warning: PDF text extraction was minimal. For best results, copy text from your PDF and paste it directly into the text box.');
        }

    } catch (error) {
        console.error('Error reading file:', error);
        alert('Error reading file. For best results, copy text from your PDF and paste it directly into the text box.');
    }
}

// Raw PDF Text Extraction (100% Original - No External Library)
async function extractPDFTextRaw(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                // Read PDF as binary
                const uint8Array = new Uint8Array(e.target.result);
                
                // Convert to string
                let binaryText = '';
                for (let i = 0; i < uint8Array.length; i++) {
                    binaryText += String.fromCharCode(uint8Array[i]);
                }
                
                // Extract text between stream markers (basic PDF structure)
                let extractedText = '';
                
                // Method 1: Find text between BT and ET markers (BeginText/EndText)
                const btPattern = /BT\s+(.*?)\s+ET/gs;
                let matches = binaryText.matchAll(btPattern);
                
                for (const match of matches) {
                    let content = match[1];
                    // Extract text from Tj and TJ commands
                    const textMatches = content.match(/\((.*?)\)/g);
                    if (textMatches) {
                        textMatches.forEach(tm => {
                            const text = tm.slice(1, -1); // Remove parentheses
                            extractedText += text + ' ';
                        });
                    }
                }
                
                // Method 2: Look for readable text in the entire file
                if (extractedText.length < 100) {
                    // Fallback: extract any readable ASCII text
                    const readablePattern = /[A-Za-z]{3,}(?:\s+[A-Za-z]{3,})*/g;
                    const readableMatches = binaryText.match(readablePattern);
                    if (readableMatches) {
                        extractedText = readableMatches.join(' ');
                    }
                }
                
                // Clean up escape sequences and PDF artifacts
                extractedText = extractedText
                    .replace(/\\n/g, ' ')
                    .replace(/\\r/g, ' ')
                    .replace(/\\t/g, ' ')
                    .replace(/\\/g, '')
                    .replace(/\(/g, '')
                    .replace(/\)/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();
                
                if (extractedText.length < 50) {
                    resolve('PDF extraction was limited. Please copy and paste your text directly for better results.');
                } else {
                    resolve(extractedText);
                }
                
            } catch (error) {
                reject(new Error('Could not read PDF. Please copy text and paste directly.'));
            }
        };
        
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
    });
}

// Generate Button Handler
generateBtn.addEventListener('click', () => {
    const text = textInput.value.trim();

    if (!text || text.length < 100) {
        alert('Please upload a file or paste some text (at least 100 characters)!');
        return;
    }

    loading.style.display = 'block';
    generateBtn.disabled = true;

    // Process with slight delay for UX
    setTimeout(() => {
        try {
            const generator = new QuizGenerator(text);
            const keySentences = generator.extractKeySentences();
            const keyTerms = generator.extractKeyTerms();
            quizData = generator.generateQuiz();

            if (quizData.length === 0) {
                alert('Could not generate quiz. The text might not have enough structured content. Try adding more detailed text.');
                loading.style.display = 'none';
                generateBtn.disabled = false;
                return;
            }

            displayNotes(keySentences, keyTerms);
            displayQuiz(quizData);

            inputSection.style.display = 'none';
            loading.style.display = 'none';
            generateBtn.disabled = false;
        } catch (error) {
            console.error('Generation error:', error);
            alert('Error generating quiz: ' + error.message);
            loading.style.display = 'none';
            generateBtn.disabled = false;
        }
    }, 800);
});

// Display Notes
function displayNotes(keySentences, keyTerms) {
    const sentencesList = document.getElementById('keySentences');
    const termsContainer = document.getElementById('keyTerms');

    if (keySentences.length === 0) {
        sentencesList.innerHTML = '<li>No key sentences found. Try pasting text directly for better results.</li>';
    } else {
        sentencesList.innerHTML = keySentences
            .map(s => `<li>${s}</li>`)
            .join('');
    }

    if (keyTerms.length === 0) {
        termsContainer.innerHTML = '<span class="term-badge">No key terms found</span>';
    } else {
        termsContainer.innerHTML = keyTerms
            .map(t => `<span class="term-badge">${t}</span>`)
            .join('');
    }

    notesSection.style.display = 'block';
}

// Display Quiz
function displayQuiz(questions) {
    const container = document.getElementById('questionsContainer');

    container.innerHTML = questions.map((q, idx) => {
        let optionsHtml = '';

        if (q.type === 'truefalse' || q.type === 'mcq') {
            optionsHtml = q.options.map((opt, i) => `
                <label class="option">
                    <input type="radio" name="${q.id}" value="${opt}" 
                           data-correct="${q.type === 'truefalse' ? (opt.toLowerCase() === q.correctAnswer) : (opt === q.correctAnswer)}">
                    <span>${opt}</span>
                </label>
            `).join('');
        } else if (q.type === 'fillblank') {
            optionsHtml = `
                <input type="text" name="${q.id}" class="text-answer" 
                       placeholder="Type your answer..." 
                       data-correct="${q.correctAnswer}">
            `;
        }

        return `
            <div class="question" data-id="${q.id}">
                <div class="question-header">
                    <span class="question-number">${idx + 1}</span>
                    <p class="question-text">${q.question}</p>
                </div>
                <div class="question-options">
                    ${optionsHtml}
                </div>
                <div class="question-result" style="display: none;"></div>
            </div>
        `;
    }).join('');

    quizSection.style.display = 'block';
    quizSection.scrollIntoView({ behavior: 'smooth' });
}

// Submit Quiz
submitBtn.addEventListener('click', () => {
    let score = 0;
    const questions = document.querySelectorAll('.question');

    questions.forEach(q => {
        const inputs = q.querySelectorAll('input[type="radio"], input[type="text"]');
        let isCorrect = false;
        let userAnswer = '';
        let correctAnswer = '';

        inputs.forEach(input => {
            if (input.type === 'radio' && input.checked) {
                isCorrect = input.dataset.correct === 'true';
                userAnswer = input.value;
            } else if (input.type === 'text') {
                const normalized = input.value.toLowerCase().replace(/[^a-z]/g, '');
                correctAnswer = input.dataset.correct;
                isCorrect = normalized === correctAnswer;
                userAnswer = input.value;
            }
        });

        if (isCorrect) score++;

        const resultDiv = q.querySelector('.question-result');
        resultDiv.style.display = 'flex';
        resultDiv.className = 'question-result ' + (isCorrect ? 'correct' : 'incorrect');
        
        if (isCorrect) {
            resultDiv.innerHTML = '<span>✓</span> Correct!';
        } else {
            const correctInput = q.querySelector('[data-correct="true"]');
            if (correctInput) {
                correctAnswer = correctInput.value;
            } else {
                correctAnswer = q.querySelector('[data-correct]').dataset.correct;
            }
            resultDiv.innerHTML = `<span>✗</span> Incorrect. Correct answer: ${correctAnswer}`;
        }

        q.querySelectorAll('input').forEach(i => i.disabled = true);
    });

    const percentage = Math.round((score / quizData.length) * 100);
    document.getElementById('scoreDisplay').innerHTML = `
        Score: ${score}/${quizData.length} (${percentage}%)
    `;
    document.getElementById('scoreDisplay').style.display = 'block';
    submitBtn.style.display = 'none';
    resetBtn.style.display = 'inline-block';
    showingResults = true;
});

// Reset Button
resetBtn.addEventListener('click', () => {
    location.reload();
});