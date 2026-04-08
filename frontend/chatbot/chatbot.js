const chatBubbleBtn = document.getElementById('chat-bubble-btn');
const chatPopup = document.getElementById('chat-popup');
const closeChatBtn = document.getElementById('close-chat-btn');
const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');


chatBubbleBtn.addEventListener('click', (e) => {
    e.stopPropagation(); 
    chatPopup.classList.toggle('hidden');
});

closeChatBtn.addEventListener('click', () => {
    chatPopup.classList.add('hidden');
});

// Close when clicking outside the widget
document.addEventListener('click', (event) => {
    const isClickInsideWidget = chatPopup.contains(event.target) || chatBubbleBtn.contains(event.target);
    if (!isClickInsideWidget && !chatPopup.classList.contains('hidden')) {
        chatPopup.classList.add('hidden');
    }
});

// Prevent clicks inside the chat window from closing it
chatPopup.addEventListener('click', (e) => {
    e.stopPropagation();
});


function handleKeyPress(event) {
    if (event.key === 'Enter') sendMessage();
}

function appendMessage(text, sender) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', sender === 'user' ? 'user-msg' : 'bot-msg');
    msgDiv.innerText = text;
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    return msgDiv;
}

function appendMoviesToMessage(msgElement, movies) {
    if (!movies || movies.length === 0) return;
    const gridDiv = document.createElement('div');
    gridDiv.classList.add('chat-movie-grid');

    movies.forEach(movie => {
        if (movie.poster_path) {
            const link = document.createElement('a');
            link.href = `/frontend/Movie_details/details.html?type=movie&id=${movie.movie_id}`;
            link.target = "_blank"; 
            const img = document.createElement('img');
            img.src = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
            img.alt = movie.title;
            img.title = movie.title;
            link.appendChild(img);
            gridDiv.appendChild(link);
        }
    });
    msgElement.appendChild(gridDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    appendMessage(text, 'user');
    userInput.value = '';
    const thinkingMsg = appendMessage("Thinking...", 'bot');
    chatHistory.push({ role: "user", content: text });

    try {
        const response = await fetch('http://localhost:8000/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: chatHistory })
        });
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        chatBox.removeChild(thinkingMsg);
        const botMsgElement = appendMessage(data.reply, 'bot');

        if (data.movies && data.movies.length > 0) {
            appendMoviesToMessage(botMsgElement, data.movies);
        }

        chatHistory.push({ role: "assistant", content: data.reply });

        // Save the updated history AND the current time to localStorage
        const chatDataToSave = {
            timestamp: new Date().getTime(),
            history: chatHistory
        };
        localStorage.setItem('moviebuddy_chat_data', JSON.stringify(chatDataToSave));
    } catch (error) {
        console.error("Chat error:", error);
        chatBox.removeChild(thinkingMsg);
        appendMessage("Connection error. Is the server running?", 'bot');
    }
}


const EXPIRY_TIME_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
let chatHistory = [];

const savedChatData = JSON.parse(localStorage.getItem('moviebuddy_chat_data'));

if (savedChatData) {
    const now = new Date().getTime();
    if (now - savedChatData.timestamp > EXPIRY_TIME_MS) {
        // It's been more than 24 hours! Clear the history.
        localStorage.removeItem('moviebuddy_chat_data');
        chatHistory = [];
    } else {
        // Still valid, load the history!
        chatHistory = savedChatData.history;
    }
}