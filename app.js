// ===== STATE MANAGEMENT =====
const AppState = {
    currentLevel: 1,
    currentTab: 'materi',
    levels: [],
    progress: {
        level1_score: 0,
        level2_score: 0,
        level3_score: 0,
        level4_score: 0,
        level1_unlocked: true,
        level2_unlocked: false,
        level3_unlocked: false,
        level4_unlocked: false
    },
    drillIndex: 0,
    quizIndex: 0,
    quizScore: 0,
    quizAnswers: [],
    selectedMatch: null,
    matchPairs: [],
    matchedCount: 0
};

// ===== LOAD PROGRESS =====
function loadProgress() {
    const saved = localStorage.getItem('arabic_learning_progress');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            AppState.progress = { ...AppState.progress, ...data };
        } catch (e) {
            console.log('Error loading progress:', e);
        }
    }
}

function saveProgress() {
    localStorage.setItem('arabic_learning_progress', JSON.stringify(AppState.progress));
}

// ===== PARSE XML =====
let xmlDoc = null;

async function loadXML() {
    try {
        const response = await fetch('database.xml');
        const text = await response.text();
        const parser = new DOMParser();
        xmlDoc = parser.parseFromString(text, 'text/xml');
        parseLevels();
        renderLevels();
        showWelcome();
    } catch (err) {
        console.error('Error loading XML:', err);
        document.getElementById('content-area').innerHTML = 
            '<div style="text-align:center;padding:2rem;color:#e74c3c">Gagal memuat database. Pastikan file database.xml ada di folder yang sama.</div>';
    }
}

function parseLevels() {
    const levelNodes = xmlDoc.querySelectorAll('level');
    AppState.levels = [];
    levelNodes.forEach(node => {
        const id = parseInt(node.getAttribute('id'));
        const materiNodes = node.querySelectorAll('materi > item');
        const drillNodes = node.querySelectorAll('drills > drill');
        const quizNodes = node.querySelectorAll('quiz > soal');

        const materi = Array.from(materiNodes).map(m => ({
            id: m.getAttribute('id'),
            arab: m.getAttribute('arab'),
            latin: m.getAttribute('latin'),
            sound: m.getAttribute('sound'),
            type: m.getAttribute('type'),
            desc: m.querySelector('desc')?.textContent || '',
            contoh: Array.from(m.querySelectorAll('contoh > kata')).map(k => ({
                arab: k.getAttribute('arab'),
                latin: k.getAttribute('latin'),
                arti: k.getAttribute('arti')
            }))
        }));

        const drills = Array.from(drillNodes).map(d => {
            const type = d.getAttribute('type');
            const question = d.querySelector('question')?.textContent || '';
            const items = Array.from(d.querySelectorAll('item')).map(item => ({
                arab: item.getAttribute('arab'),
                answer: item.getAttribute('answer') || item.getAttribute('jawaban')
            }));
            const pairs = Array.from(d.querySelectorAll('pairs > pair')).map(p => ({
                arab: p.getAttribute('arab'),
                latin: p.getAttribute('latin')
            }));
            return { id: d.getAttribute('id'), type, question, items, pairs };
        });

        const quiz = Array.from(quizNodes).map(q => {
            const jawaban = q.querySelector('jawaban');
            return {
                id: q.getAttribute('id'),
                type: q.getAttribute('type'),
                pertanyaan: q.querySelector('pertanyaan')?.textContent || '',
                benar: jawaban?.getAttribute('benar') || '',
                pilihan: Array.from(jawaban?.querySelectorAll('pilihan') || []).map(p => p.textContent)
            };
        });

        AppState.levels.push({ id, materi, drills, quiz });
    });
}

// ===== RENDER LEVELS =====
function renderLevels() {
    const grid = document.getElementById('levels-grid');
    if (!grid) return;

    grid.innerHTML = '';
    const levelMeta = [
        { name: 'Huruf Hijaiyah', desc: 'Mengenal 28 huruf Arab dasar' },
        { name: 'Harakat (Vokal)', desc: 'Fathah, Kasrah, Dammah' },
        { name: 'Sukun & Tasydid', desc: 'Huruf mati dan huruf ganda' },
        { name: 'Kata Sederhana', desc: 'Membaca kata-kata dasar' }
    ];

    AppState.levels.forEach((level, idx) => {
        const meta = levelMeta[idx] || { name: 'Level ' + level.id, desc: '' };
        const isUnlocked = AppState.progress[`level${level.id}_unlocked`];
        const score = AppState.progress[`level${level.id}_score`] || 0;
        const isActive = AppState.currentLevel === level.id;

        const card = document.createElement('div');
        card.className = `level-card ${isActive ? 'active' : ''} ${isUnlocked ? '' : 'locked'}`;
        card.onclick = () => {
            if (isUnlocked) {
                AppState.currentLevel = level.id;
                AppState.currentTab = 'materi';
                renderLevels();
                showTab('materi');
            }
        };

        card.innerHTML = `
            <div class="level-number">${level.id}</div>
            <div class="level-name">${meta.name}</div>
            <div class="level-desc">${meta.desc}</div>
            <div class="level-progress">
                <div class="level-progress-bar" style="width: ${score}%"></div>
            </div>
        `;

        grid.appendChild(card);
    });
}

// ===== NAVIGATION =====
function showTab(tab) {
    AppState.currentTab = tab;

    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');

    const content = document.getElementById('content-area');
    content.innerHTML = '';
    content.classList.remove('fade-in');
    void content.offsetWidth;
    content.classList.add('fade-in');

    switch(tab) {
        case 'materi': renderMateri(); break;
        case 'drill': renderDrill(); break;
        case 'quiz': renderQuiz(); break;
    }
}

// ===== WELCOME SCREEN =====
function showWelcome() {
    const content = document.getElementById('content-area');
    content.innerHTML = `
        <div class="welcome-screen">
            <div class="big-icon">📖</div>
            <h2>Selamat Datang!</h2>
            <p>Belajar huruf Arab dari nol dengan materi interaktif, latihan drill, dan kuis seru. 
            Pilih level di atas untuk memulai perjalananmu!</p>
            <div class="features-list">
                <div class="feature-item">
                    <div class="icon">🔤</div>
                    <div class="label">28 Huruf Hijaiyah</div>
                </div>
                <div class="feature-item">
                    <div class="icon">🎯</div>
                    <div class="label">Latihan Drill</div>
                </div>
                <div class="feature-item">
                    <div class="icon">🏆</div>
                    <div class="label">Kuis & Skor</div>
                </div>
                <div class="feature-item">
                    <div class="icon">🔊</div>
                    <div class="label">Audio Bacaan</div>
                </div>
            </div>
            <button class="btn btn-primary" onclick="showTab('materi')">Mulai Belajar</button>
        </div>
    `;
}

// ===== RENDER MATERI =====
function renderMateri() {
    const level = AppState.levels.find(l => l.id === AppState.currentLevel);
    if (!level) return;

    const content = document.getElementById('content-area');
    content.innerHTML = '<div class="materi-grid" id="materi-grid"></div>';

    const grid = document.getElementById('materi-grid');
    level.materi.forEach(item => {
        const card = document.createElement('div');
        card.className = 'huruf-card';
        card.innerHTML = `
            <button class="sound-btn" onclick="event.stopPropagation(); speakArabic('${item.arab}')">🔊</button>
            <div class="arab">${item.arab}</div>
            <div class="latin">${item.latin}</div>
        `;
        card.onclick = () => showDetail(item);
        grid.appendChild(card);
    });
}

function showDetail(item) {
    const overlay = document.getElementById('detail-overlay');
    const modal = document.getElementById('detail-modal');

    let contohHTML = '';
    if (item.contoh && item.contoh.length > 0) {
        contohHTML = `
            <div class="contoh-box">
                <div class="contoh-title">Contoh:</div>
                ${item.contoh.map(c => `
                    <div class="contoh-item">
                        <span class="contoh-arab">${c.arab}</span>
                        <span>${c.latin} - ${c.arti}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    modal.innerHTML = `
        <div class="arab-big">${item.arab}</div>
        <div class="latin-big">${item.latin}</div>
        <div class="desc">${item.desc}</div>
        ${contohHTML}
        <button class="close-btn" onclick="closeDetail()">Tutup</button>
    `;

    overlay.classList.add('open');
}

function closeDetail() {
    document.getElementById('detail-overlay').classList.remove('open');
}

// ===== TEXT TO SPEECH =====
function speakArabic(text) {
    if (!('speechSynthesis' in window)) {
        alert('Browser tidak mendukung text-to-speech');
        return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-SA';
    utterance.rate = 0.8;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const arabVoice = voices.find(v => v.lang.includes('ar'));
    if (arabVoice) utterance.voice = arabVoice;

    window.speechSynthesis.speak(utterance);
}

// ===== RENDER DRILL =====
function renderDrill() {
    const level = AppState.levels.find(l => l.id === AppState.currentLevel);
    if (!level || !level.drills.length) {
        document.getElementById('content-area').innerHTML = 
            '<div style="text-align:center;padding:2rem">Belum ada latihan untuk level ini.</div>';
        return;
    }

    // Reset drill state
    AppState.drillIndex = 0;
    AppState.selectedMatch = null;
    AppState.matchedCount = 0;

    const content = document.getElementById('content-area');
    content.innerHTML = `
        <div class="drill-container" id="drill-container">
            <div class="drill-question" id="drill-question"></div>
            <div id="drill-content"></div>
            <div class="drill-nav">
                <span class="drill-counter" id="drill-counter"></span>
            </div>
        </div>
    `;

    showDrillItem();
}

function showDrillItem() {
    const level = AppState.levels.find(l => l.id === AppState.currentLevel);
    const drill = level.drills[AppState.drillIndex];
    if (!drill) return;

    document.getElementById('drill-question').textContent = drill.question;
    document.getElementById('drill-counter').textContent = 
        `Latihan ${AppState.drillIndex + 1} dari ${level.drills.length}`;

    const content = document.getElementById('drill-content');
    content.innerHTML = '';
    content.classList.remove('fade-in');
    void content.offsetWidth;
    content.classList.add('fade-in');

    switch(drill.type) {
        case 'match':
            renderMatchDrill(drill, content);
            break;
        case 'identify':
        case 'identify_harakat':
            renderIdentifyDrill(drill, content);
            break;
        case 'baca':
        case 'baca_kata':
            renderBacaDrill(drill, content);
            break;
        default:
            renderIdentifyDrill(drill, content);
    }
}

function renderMatchDrill(drill, container) {
    const pairs = [...drill.pairs];
    const shuffledArab = [...pairs].sort(() => Math.random() - 0.5);
    const shuffledLatin = [...pairs].sort(() => Math.random() - 0.5);

    container.innerHTML = `
        <div class="match-grid" id="match-grid">
            ${shuffledArab.map((p, i) => `
                <div class="match-item" data-type="arab" data-value="${p.arab}" onclick="handleMatch(this)">${p.arab}</div>
            `).join('')}
            ${shuffledLatin.map((p, i) => `
                <div class="match-item latin" data-type="latin" data-value="${p.arab}" onclick="handleMatch(this)">${p.latin}</div>
            `).join('')}
        </div>
    `;

    AppState.matchPairs = pairs;
    AppState.matchedCount = 0;
}

function handleMatch(el) {
    if (el.classList.contains('matched') || el.classList.contains('selected')) return;

    const grid = document.getElementById('match-grid');
    const selected = grid.querySelector('.selected');

    if (!selected) {
        el.classList.add('selected');
        return;
    }

    const isMatch = selected.dataset.value === el.dataset.value && selected !== el;

    if (isMatch) {
        selected.classList.remove('selected');
        selected.classList.add('matched');
        el.classList.add('matched');
        AppState.matchedCount++;

        if (AppState.matchedCount >= AppState.matchPairs.length) {
            setTimeout(() => nextDrill(), 800);
        }
    } else {
        selected.classList.remove('selected');
        selected.classList.add('wrong-match');
        el.classList.add('wrong-match');
        setTimeout(() => {
            selected.classList.remove('wrong-match');
            el.classList.remove('wrong-match');
        }, 500);
    }
}

function renderIdentifyDrill(drill, container) {
    const item = drill.items[AppState.drillIndex] || drill.items[0];
    if (!item) return;

    // Create options from all items in this drill
    const options = drill.items.map(i => i.answer);
    const shuffled = [...options].sort(() => Math.random() - 0.5);

    container.innerHTML = `
        <div class="drill-display">${item.arab}</div>
        <div class="drill-options" id="drill-options">
            ${shuffled.map(opt => `
                <button class="drill-option" onclick="checkIdentify(this, '${opt}', '${item.answer}')">${opt}</button>
            `).join('')}
        </div>
    `;
}

function checkIdentify(btn, selected, correct) {
    const buttons = document.querySelectorAll('.drill-option');
    buttons.forEach(b => b.disabled = true);

    if (selected === correct) {
        btn.classList.add('correct');
        setTimeout(() => nextDrill(), 1000);
    } else {
        btn.classList.add('wrong');
        buttons.forEach(b => {
            if (b.textContent === correct) b.classList.add('correct');
        });
        setTimeout(() => nextDrill(), 1500);
    }
}

function renderBacaDrill(drill, container) {
    const item = drill.items[AppState.drillIndex] || drill.items[0];
    if (!item) return;

    container.innerHTML = `
        <div class="drill-display">${item.arab}</div>
        <div class="baca-input-group">
            <input type="text" class="baca-input" id="baca-input" placeholder="tulis latinnya..." autocomplete="off">
            <button class="baca-submit" onclick="checkBaca('${item.answer}')">Cek</button>
        </div>
        <div class="baca-hint">Tekan Enter untuk cek jawaban</div>
        <div id="baca-feedback"></div>
    `;

    document.getElementById('baca-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkBaca(item.answer);
    });
    document.getElementById('baca-input').focus();
}

function checkBaca(correct) {
    const input = document.getElementById('baca-input');
    const feedback = document.getElementById('baca-feedback');
    const val = input.value.trim().toLowerCase();

    if (!val) return;

    if (val === correct.toLowerCase()) {
        feedback.innerHTML = '<div class="quiz-feedback correct show">✅ Benar!</div>';
        input.style.borderColor = 'var(--success)';
        setTimeout(() => nextDrill(), 1200);
    } else {
        feedback.innerHTML = `<div class="quiz-feedback wrong show">❌ Salah. Jawaban: ${correct}</div>`;
        input.style.borderColor = 'var(--danger)';
        setTimeout(() => nextDrill(), 1800);
    }
}

function nextDrill() {
    const level = AppState.levels.find(l => l.id === AppState.currentLevel);
    AppState.drillIndex++;

    if (AppState.drillIndex >= level.drills.length) {
        document.getElementById('content-area').innerHTML = `
            <div style="text-align:center;padding:3rem">
                <div style="font-size:4rem;margin-bottom:1rem">🎉</div>
                <h2 style="color:var(--primary-dark);margin-bottom:1rem">Latihan Selesai!</h2>
                <p style="color:var(--text-light);margin-bottom:2rem">Kamu telah menyelesaikan semua latihan drill di level ini.</p>
                <button class="btn btn-primary" onclick="showTab('quiz')">Lanjut ke Kuis</button>
            </div>
        `;
    } else {
        showDrillItem();
    }
}

// ===== RENDER QUIZ =====
function renderQuiz() {
    const level = AppState.levels.find(l => l.id === AppState.currentLevel);
    if (!level || !level.quiz.length) {
        document.getElementById('content-area').innerHTML = 
            '<div style="text-align:center;padding:2rem">Belum ada kuis untuk level ini.</div>';
        return;
    }

    AppState.quizIndex = 0;
    AppState.quizScore = 0;
    AppState.quizAnswers = new Array(level.quiz.length).fill(null);

    showQuizQuestion();
}

function showQuizQuestion() {
    const level = AppState.levels.find(l => l.id === AppState.currentLevel);
    const soal = level.quiz[AppState.quizIndex];

    const content = document.getElementById('content-area');
    content.innerHTML = `
        <div class="quiz-container">
            <div class="quiz-progress" id="quiz-progress"></div>
            <div class="quiz-question-box">
                <div class="quiz-question">${soal.pertanyaan}</div>
                ${soal.pertanyaan.includes('ك') || soal.pertanyaan.includes('ب') || soal.pertanyaan.includes('ا') || 
                  soal.pertanyaan.includes('م') || soal.pertanyaan.includes('ن') || soal.pertanyaan.includes('ص') ||
                  soal.pertanyaan.includes('ق') || soal.pertanyaan.includes('د') || soal.pertanyaan.includes('ذ') ||
                  soal.pertanyaan.includes('ر') || soal.pertanyaan.includes('ز') || soal.pertanyaan.includes('س') ||
                  soal.pertanyaan.includes('ش') || soal.pertanyaan.includes('ط') || soal.pertanyaan.includes('ظ') ||
                  soal.pertanyaan.includes('ع') || soal.pertanyaan.includes('غ') || soal.pertanyaan.includes('ف') ||
                  soal.pertanyaan.includes('ل') || soal.pertanyaan.includes('ه') || soal.pertanyaan.includes('و') ||
                  soal.pertanyaan.includes('ي') || soal.pertanyaan.includes('ح') || soal.pertanyaan.includes('خ') ||
                  soal.pertanyaan.includes('ج') || soal.pertanyaan.includes('ث') || soal.pertanyaan.includes('ت') ||
                  soal.pertanyaan.includes('ض') || soal.pertanyaan.includes('ة') || soal.pertanyaan.includes('ء') ||
                  soal.pertanyaan.includes('َ') || soal.pertanyaan.includes('ِ') || soal.pertanyaan.includes('ُ') ||
                  soal.pertanyaan.includes('ْ') || soal.pertanyaan.includes('ّ') || soal.pertanyaan.includes('ً') ||
                  soal.pertanyaan.includes('ٍ') || soal.pertanyaan.includes('ٌ')
                  ? `<div class="quiz-arab">${extractArabic(soal.pertanyaan)}</div>` : ''}
            </div>
            <div class="quiz-options" id="quiz-options"></div>
            <div class="quiz-feedback" id="quiz-feedback"></div>
            <div style="text-align:center">
                <button class="quiz-nav-btn" id="quiz-next" onclick="nextQuiz()">Lanjut ➡</button>
            </div>
        </div>
    `;

    renderQuizProgress();
    renderQuizOptions(soal);
}

function extractArabic(text) {
    const match = text.match(/[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿ً-ٰٟـ]+/g);
    return match ? match.join(' ') : '';
}

function renderQuizProgress() {
    const level = AppState.levels.find(l => l.id === AppState.currentLevel);
    const dots = document.getElementById('quiz-progress');
    dots.innerHTML = '';

    for (let i = 0; i < level.quiz.length; i++) {
        const dot = document.createElement('div');
        dot.className = 'quiz-progress-dot';
        if (i === AppState.quizIndex) dot.classList.add('current');
        else if (AppState.quizAnswers[i] === true) dot.classList.add('correct');
        else if (AppState.quizAnswers[i] === false) dot.classList.add('wrong');
        dots.appendChild(dot);
    }
}

function renderQuizOptions(soal) {
    const container = document.getElementById('quiz-options');
    const letters = ['A', 'B', 'C', 'D'];

    container.innerHTML = soal.pilihan.map((p, i) => `
        <button class="quiz-option" data-letter="${letters[i]}" onclick="checkQuiz('${p.replace(/'/g, "\'")}', this)">${p}</button>
    `).join('');
}

function checkQuiz(selected, btn) {
    const level = AppState.levels.find(l => l.id === AppState.currentLevel);
    const soal = level.quiz[AppState.quizIndex];
    const isCorrect = selected === soal.benar;

    AppState.quizAnswers[AppState.quizIndex] = isCorrect;
    if (isCorrect) AppState.quizScore++;

    const buttons = document.querySelectorAll('.quiz-option');
    buttons.forEach(b => {
        b.classList.add('disabled');
        if (b.textContent === soal.benar) b.classList.add('correct');
    });

    if (!isCorrect) btn.classList.add('wrong');

    const feedback = document.getElementById('quiz-feedback');
    feedback.className = `quiz-feedback ${isCorrect ? 'correct' : 'wrong'} show`;
    feedback.textContent = isCorrect ? '✅ Benar! Bagus sekali.' : `❌ Salah. Jawaban: ${soal.benar}`;

    renderQuizProgress();
    document.getElementById('quiz-next').classList.add('show');
}

function nextQuiz() {
    const level = AppState.levels.find(l => l.id === AppState.currentLevel);
    AppState.quizIndex++;

    if (AppState.quizIndex >= level.quiz.length) {
        showQuizResult();
    } else {
        showQuizQuestion();
    }
}

function showQuizResult() {
    const level = AppState.levels.find(l => l.id === AppState.currentLevel);
    const total = level.quiz.length;
    const score = Math.round((AppState.quizScore / total) * 100);

    // Save progress
    const prevScore = AppState.progress[`level${AppState.currentLevel}_score`] || 0;
    if (score > prevScore) {
        AppState.progress[`level${AppState.currentLevel}_score`] = score;
    }

    // Unlock next level if score >= 60
    if (score >= 60 && AppState.currentLevel < 4) {
        AppState.progress[`level${AppState.currentLevel + 1}_unlocked`] = true;
    }

    saveProgress();
    renderLevels();

    let messageClass = 'retry';
    let message = 'Ayo coba lagi! Latih lebih giat ya. 💪';
    if (score >= 80) {
        messageClass = 'excellent';
        message = 'Luar biasa! Kamu hebat! 🌟';
    } else if (score >= 60) {
        messageClass = 'good';
        message = 'Bagus! Tingkatkan lagi ya. 👍';
    }

    const content = document.getElementById('content-area');
    content.innerHTML = `
        <div class="quiz-result">
            <div class="result-score">${score}%</div>
            <div class="result-label">${AppState.quizScore} benar dari ${total} soal</div>
            <div class="result-message ${messageClass}">${message}</div>
            <div class="result-buttons">
                <button class="btn btn-primary" onclick="renderQuiz()">Ulangi Kuis</button>
                ${score >= 60 && AppState.currentLevel < 4 ? 
                    `<button class="btn btn-primary" onclick="AppState.currentLevel++;AppState.currentTab='materi';renderLevels();showTab('materi')">Level Selanjutnya ➡</button>` : ''}
                <button class="btn btn-secondary" onclick="showTab('materi')">Kembali ke Materi</button>
            </div>
        </div>
    `;
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    loadProgress();
    loadXML();

    // Setup navigation
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            if (tabName) showTab(tabName);
        });
    });

    // Close modal on overlay click
    document.getElementById('detail-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'detail-overlay') closeDetail();
    });

    // Load voices for TTS
    if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = () => {
            window.speechSynthesis.getVoices();
        };
    }
});
