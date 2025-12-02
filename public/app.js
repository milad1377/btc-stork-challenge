// =========================================================
// 1. Challenge Settings - Daily Challenge
// =========================================================
function getTodaysChallengeDeadline() {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 8, 0, 0));

    // If current time is past today's 8:00 UTC, move to tomorrow's challenge
    if (now >= today) {
        today.setUTCDate(today.getUTCDate() + 1);
    }

    return today;
}

const deadlineUTC = getTodaysChallengeDeadline();
const lockDownPeriodHours = 1; // 1 hour before deadline
const lockDownTime = new Date(deadlineUTC.getTime() - lockDownPeriodHours * 60 * 60 * 1000);

// =========================================================
// 2. Fetch Real-time Bitcoin Price
// =========================================================
async function fetchBitcoinPrice() {
    const priceElement = document.getElementById('btc-price');
    const updateTimeElement = document.getElementById('price-update-time');

    try {
        const response = await fetch('/api/price');
        const data = await response.json();

        if (data && data.success && data.price) {
            const price = data.price;
            priceElement.innerHTML = `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            const now = new Date();
            const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            updateTimeElement.textContent = `Last updated: ${timeString} (Stork Network)`;
        } else {
            throw new Error('Invalid data format');
        }
    } catch (error) {
        console.error('Error fetching Bitcoin price:', error);
        priceElement.innerHTML = '<span style="font-size: 18px;">Error fetching price</span>';
        updateTimeElement.textContent = 'Please check your internet connection';
    }
}

// =========================================================
// 3. Check User Participation
// =========================================================
function checkUserParticipation() {
    const challengeKey = deadlineUTC.toISOString().slice(0, 10);
    const storageKey = `btc_challenge_${challengeKey}`;
    const participated = localStorage.getItem(storageKey);

    return participated !== null;
}

function saveUserParticipation(username) {
    const challengeKey = deadlineUTC.toISOString().slice(0, 10);
    const storageKey = `btc_challenge_${challengeKey}`;
    localStorage.setItem(storageKey, JSON.stringify({
        username: username,
        timestamp: new Date().toISOString()
    }));
}

// =========================================================
// 4. Fetch and Display Participants
// =========================================================
async function fetchParticipants() {
    const participantsList = document.getElementById('participants-list');
    const participantsCount = document.getElementById('participants-count');
    const challengeKey = deadlineUTC.toISOString().slice(0, 10);

    try {
        const response = await fetch(`/api/participants?date=${challengeKey}`);
        const data = await response.json();

        if (data && data.participants && data.participants.length > 0) {
            participantsCount.textContent = data.participants.length;
            participantsList.innerHTML = '';

            data.participants.forEach((participant, index) => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <strong>${index + 1}.</strong> ${participant.username} 
                    - $${participant.prediction.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                `;
                participantsList.appendChild(li);
            });
        } else {
            participantsCount.textContent = '0';
            participantsList.innerHTML = '<li>No participants yet</li>';
        }
    } catch (error) {
        console.error('Error fetching participants:', error);
        participantsCount.textContent = '0';
        participantsList.innerHTML = '<li>Error loading participants</li>';
    }
}

// =========================================================
// 5. Check Challenge Status and Lock Form
// =========================================================
function checkChallengeStatus() {
    const now = new Date();
    const deadlineElement = document.getElementById('deadline-status');
    const formElement = document.getElementById('prediction-form');
    const submitButton = formElement.querySelector('button');

    // Check if user has already participated
    if (checkUserParticipation()) {
        const messageElement = document.getElementById('message');
        messageElement.className = 'info';
        messageElement.innerHTML = '✅ You have already participated in this challenge';
        submitButton.disabled = true;
        submitButton.textContent = 'Already Participated';
    }

    // Calculate time remaining
    const timeUntilDeadline = deadlineUTC - now;
    const timeUntilLockdown = lockDownTime - now;

    if (now >= deadlineUTC) {
        // Challenge has ended
        deadlineElement.innerHTML = '⏰ Challenge time has ended';
        submitButton.disabled = true;
        submitButton.textContent = 'Challenge Ended';
        triggerResolution();
    } else if (now >= lockDownTime) {
        // In lockdown period
        const minutesLeft = Math.floor(timeUntilDeadline / 60000);
        deadlineElement.innerHTML = `🔒 Form is locked. ${minutesLeft} minutes until results`;
        submitButton.disabled = true;
        submitButton.textContent = 'Form Locked';
    } else {
        // Still accepting submissions
        const hoursLeft = Math.floor(timeUntilLockdown / 3600000);
        const minutesLeft = Math.floor((timeUntilLockdown % 3600000) / 60000);

        const deadlineTimeString = deadlineUTC.toLocaleTimeString('en-US', {
            timeZone: 'UTC',
            hour: '2-digit',
            minute: '2-digit'
        });

        const lockdownTimeString = lockDownTime.toLocaleTimeString('en-US', {
            timeZone: 'UTC',
            hour: '2-digit',
            minute: '2-digit'
        });

        const deadlineDateString = deadlineUTC.toLocaleDateString('en-US', {
            timeZone: 'UTC',
            month: 'short',
            day: 'numeric'
        });

        deadlineElement.innerHTML = `⏰ Final Price: ${deadlineDateString} at ${deadlineTimeString} UTC<br>🔒 Form closes at ${lockdownTimeString} UTC (1 hour before) | Time remaining: ${hoursLeft}h ${minutesLeft}m`;

        // Keep form enabled only if user hasn't participated
        if (!checkUserParticipation()) {
            submitButton.disabled = false;
            submitButton.textContent = 'Submit Prediction';
        }
    }
}

// =========================================================
// 6. Submit Prediction
// =========================================================
async function submitPrediction() {
    let username = document.getElementById('discord-username').value.trim();
    // Add @ prefix if not already present
    if (username && !username.startsWith('@')) {
        username = '@' + username;
    }
    const price = document.getElementById('predicted-price').value.trim();
    const messageElement = document.getElementById('message');

    // Check if user has already participated
    if (checkUserParticipation()) {
        messageElement.className = 'error';
        messageElement.innerHTML = '❌ You have already participated in this challenge';
        return;
    }

    // Validate inputs
    if (!username || !price) {
        messageElement.className = 'error';
        messageElement.innerHTML = '❌ Please fill in all fields';
        return;
    }

    const priceNumber = parseFloat(price);
    if (isNaN(priceNumber) || priceNumber <= 0) {
        messageElement.className = 'error';
        messageElement.innerHTML = '❌ Please enter a valid price';
        return;
    }

    // Check time
    const now = new Date();
    if (now >= lockDownTime) {
        messageElement.className = 'error';
        messageElement.innerHTML = '❌ Submission time has ended';
        return;
    }

    // Show submitting status
    messageElement.className = 'info';
    messageElement.innerHTML = '⏳ Submitting...';

    try {
        const response = await fetch('/api/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                discordUsername: username,
                prediction: priceNumber,
                challengeDate: deadlineUTC.toISOString().slice(0, 10)
            })
        });

        const result = await response.json();

        if (response.ok) {
            // Save user participation
            saveUserParticipation(username);

            messageElement.className = 'success';
            messageElement.innerHTML = `✅ Your prediction ($${priceNumber.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) has been submitted successfully`;

            // Disable button
            const submitButton = document.querySelector('#prediction-form button');
            submitButton.disabled = true;
            submitButton.textContent = 'Already Participated';

            // Clear form
            document.getElementById('discord-username').value = '';
            document.getElementById('predicted-price').value = '';

            // Refresh participants list
            fetchParticipants();
        } else {
            messageElement.className = 'error';
            messageElement.innerHTML = `❌ Error: ${result.error || 'An error occurred'}`;
        }
    } catch (error) {
        console.error('Submission error:', error);
        messageElement.className = 'error';
        messageElement.innerHTML = '❌ Connection error. Please try again';
    }
}

// =========================================================
// 7. Trigger Challenge Resolution
// =========================================================
async function triggerResolution() {
    const resolveUrl = '/api/resolve';
    try {
        const response = await fetch(resolveUrl);
        const data = await response.json();

        if (data.status === 'SUCCESS' || data.status === 'RESOLVED') {
            displayWinners();
        }
    } catch (error) {
        console.error("Error triggering resolution:", error);
    }
}

// =========================================================
// 8. Display Winners
// =========================================================
async function displayWinners() {
    const winnerList = document.getElementById('winners-list');
    const winnersCount = document.getElementById('winners-count');

    try {
        const response = await fetch('/api/all-winners');
        const data = await response.json();

        if (data && data.allWinners && data.allWinners.length > 0) {
            // Removed totalWinners count
            winnerList.innerHTML = '';

            data.allWinners.forEach(day => {
                if (day.winners && day.winners.length > 0) {
                    

                    // Add date header
                    const dateHeader = document.createElement('li');
                    dateHeader.style.fontWeight = 'bold';
                    dateHeader.style.marginTop = '10px';
                    dateHeader.style.borderTop = '1px solid rgba(102, 126, 234, 0.3)';
                    dateHeader.style.paddingTop = '10px';
                    dateHeader.innerHTML = `📅 ${new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
                    winnerList.appendChild(dateHeader);

                    // Add winners for this day
                    day.winners.forEach((winner, index) => {
                        const li = document.createElement('li');
                        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
                        li.innerHTML = `
                            ${medal} <strong>${winner.username}</strong><br>
                            Prediction: $${winner.prediction.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            ${winner.difference ? `<br>Difference: $${winner.difference.toFixed(2)}` : ''}
                        `;
                        winnerList.appendChild(li);
                    });
                }
            });

            // Count removed
        } else {
            winnersCount.textContent = '0';
            winnerList.innerHTML = '<li>No winners yet</li>';
        }
    } catch (error) {
        console.error('Error fetching winners:', error);
        winnersCount.textContent = '0';
        winnerList.innerHTML = '<li>Error loading winners</li>';
    }
}

// =========================================================
// 9. Toggle Dropdown
// =========================================================
function toggleDropdown(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    const allDropdowns = document.querySelectorAll('.dropdown-content');

    // Close all other dropdowns
    allDropdowns.forEach(d => {
        if (d.id !== dropdownId) {
            d.classList.remove('show');
        }
    });

    // Toggle current dropdown
    dropdown.classList.toggle('show');
}

// Close dropdown when clicking outside
window.onclick = function (event) {
    if (!event.target.matches('.dropdown-btn')) {
        const dropdowns = document.querySelectorAll('.dropdown-content');
        dropdowns.forEach(dropdown => {
            if (dropdown.classList.contains('show')) {
                dropdown.classList.remove('show');
            }
        });
    }
}

// =========================================================
// 10. Initialize Application
// =========================================================
window.onload = () => {
    // Fetch initial Bitcoin price
    fetchBitcoinPrice();

    // Update price every 30 seconds
    setInterval(fetchBitcoinPrice, 30000);

    // Check challenge status
    checkChallengeStatus();

    // Update status every minute
    setInterval(checkChallengeStatus, 60000);

    // Fetch participants and winners
    fetchParticipants();
    displayWinners();

    // Refresh lists every 30 seconds
    setInterval(fetchParticipants, 30000);
    setInterval(displayWinners, 30000);

};
