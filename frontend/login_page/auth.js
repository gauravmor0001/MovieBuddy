const loginSection = document.getElementById('login-section');
const registerSection = document.getElementById('register-section');
const showRegisterBtn = document.getElementById('show-register');
const showLoginBtn = document.getElementById('show-login');

showRegisterBtn.addEventListener('click', () => {
    loginSection.style.display = 'none';
    registerSection.style.display = 'block';
});

showLoginBtn.addEventListener('click', () => {
    registerSection.style.display = 'none';
    loginSection.style.display = 'block';
});

const API_BASE_URL = 'http://127.0.0.1:8000/api';

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault(); // Stops the page from refreshing
    
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const errorMsg = document.getElementById('reg-error');

    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Registration successful! Please sign in.');
            showLoginBtn.click(); 
        } else {
            errorMsg.innerText = data.detail || 'Registration failed.';
        }
    } catch (error) {
        errorMsg.innerText = 'Cannot connect to server.';
    }
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorMsg = document.getElementById('login-error');

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            // THE MAGIC TRICK: Save the VIP Wristband!
            localStorage.setItem('moviebuddy_token', data.access_token);
            localStorage.setItem('moviebuddy_username', data.username);
            
            // Redirect the user back to the home page
            window.location.href = '../home/index.html';
        } else {
            errorMsg.innerText = data.detail || 'Invalid credentials.';
        }
    } catch (error) {
        errorMsg.innerText = 'Cannot connect to server.';
    }
});