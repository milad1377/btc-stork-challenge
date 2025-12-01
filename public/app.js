// =========================================================
// ۱. تنظیمات چالش
// =========================================================
// تاریخ چالش: دسامبر ۱، ۲۰۲۵ در ۱۲:۰۰ UTC
const challengeDateString = '2025-12-01T12:00:00Z';
const deadlineUTC = new Date(challengeDateString);
const lockDownPeriodHours = 4;
const lockDownTime = new Date(deadlineUTC.getTime() - lockDownPeriodHours * 60 * 60 * 1000);

// =========================================================
// ۲. توابع اتصال و زمان‌بندی
// =========================================================

// چک کردن وضعیت و نمایش فرم
function checkChallengeStatus() {
    const now = new Date();
    const deadlineElement = document.getElementById('deadline-status');
    const formElement = document.getElementById('prediction-form');

    // ... منطق بررسی زمان و قفل کردن فرم (مانند پاسخ‌های قبلی) ...

    let statusMessage = `زمان اتمام چالش: ${deadlineUTC.toLocaleTimeString('fa-IR', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' })} UTC`;
    // ...
    // اگر زمان چالش گذشته، سعی کنید تابع حل چالش را فراخوانی کنید:
    if (now >= deadlineUTC) {
        // این فراخوانی برای حل چالش توسط اولین کاربر پس از زمان تعیین شده است (Triggered Resolution)
        triggerResolution();
    }
    // ...
}

// فراخوانی تابع حل چالش Vercel (توسط کاربر)
async function triggerResolution() {
    // URL تابع حل چالش Vercel
    const resolveUrl = '/api/resolve';
    try {
        const response = await fetch(resolveUrl);
        const data = await response.json();

        if (data.status === 'SUCCESS' || data.status === 'RESOLVED') {
            displayWinners(); // در صورت حل شدن، برندگان را نمایش بده
        }
    } catch (e) {
        console.error("Error triggering resolution:", e);
    }
}

// نمایش نتایج برندگان (از تابع Vercel خوانده می‌شود)
async function displayWinners() {
    const winnerList = document.getElementById('winner-list');
    const challengeKey = deadlineUTC.toISOString().slice(0, 10);

    // URL برای خواندن نتایج از MongoDB (این باید یک API Route جداگانه باشد، اما برای سادگی،
    // فرض می‌کنیم تابع resolve نتایج را برای نمایش در این بخش برگردانده یا 
    // از API route دیگری خوانده می‌شود.)
    // برای سادگی، یک API route جدید (get-results.js) فرض می‌کنیم که فقط می‌خواند.

    try {
        const response = await fetch(`/api/get-winners?date=${challengeKey}`);
        const data = await response.json();

        // ... منطق نمایش برندگان (مانند پاسخ قبلی) ...

    } catch (e) {
        winnerList.innerHTML = '<li>خطا در بارگذاری برندگان.</li>';
    }
}

// تابع ارسال پیش‌بینی به Vercel Function
async function submitPrediction() {
    const username = document.getElementById('discord-username').value.trim();
    const price = document.getElementById('predicted-price').value.trim();
    const messageElement = document.getElementById('message');

    // ... منطق اعتبارسنجی (مانند پاسخ قبلی) ...

    const priceNumber = parseFloat(price);

    try {
        // ارسال داده به Vercel Function: /api/submit
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
            messageElement.innerText = `✅ پیش‌بینی شما (${price} دلار) ثبت شد.`;
        } else {
            messageElement.innerText = `❌ خطا: ${result.error || 'خطایی رخ داد.'}`;
        }

    } catch (e) {
        messageElement.innerText = '❌ خطای اتصال.';
    }
}

window.onload = () => {
    checkChallengeStatus();
    setInterval(checkChallengeStatus, 60000);
};