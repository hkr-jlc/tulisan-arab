// ===== STATE MANAGEMENT =====
const AppState = {
    currentUser: null,
    currentLevel: 1,
    currentTab: 'materi',
    levels: [],
    users: [],
    leaderboard: [],
    drillIndex: 0,
    quizIndex: 0,
    quizScore: 0,
    quizAnswers: [],
    quizStartTime: null,
    quizElapsed: 0,
    quizTimerInterval: null,
    selectedMatch: null,
    matchPairs: [],
    matchedCount: 0
};

const STORAGE_KEYS = {
    USERS: 'arabic_users',
    LEADERBOARD: 'arabic_leaderboard',
    CURRENT_USER: 'arabic_current_user'
};

// ===== LOCAL STORAGE UTILS =====
function saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function loadFromStorage(key, defaultVal) {
    const saved = localStorage.getItem(key);
    if (saved) {
        try { return JSON.parse(saved); } catch(e) { return defaultVal; }
    }
    return defaultVal;
}

// ===== USER MANAGEMENT =====
function initUsers() {
    const savedUsers = loadFromStorage(STORAGE_KEYS.USERS, []);
    if (savedUsers.length === 0) {
        // Add demo user if empty
        const demoUser = {
            id: 'demo_' + Date.now(),
            email: 'demo@arab.com',
            username: 'DemoUser',
            password: 'demo123',
            created: new Date().toISOString().split('T')[0],
            scores: {
                1: { best_score: 80, best_time: 45, attempts: 3 },
                2: { best_score: 0, best_time: 0, attempts: 0 },
                3: { best_score: 0, best_time: 0, attempts: 0 },
                4: { best_score: 0, best_time: 0, attempts: 0 }
            }
        };
        savedUsers.push(demoUser);
        saveToStorage(STORAGE_KEYS.USERS, savedUsers);
    }
    AppState.users = savedUsers;
}

function getUserByEmail(email) {
    return AppState.users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

function getUserById(id) {
    return AppState.users.find(u => u.id === id);
}

function createUser(email, username, password) {
    const newUser = {
        id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        email: email.toLowerCase().trim(),
        username: username.trim(),
        password: password,
        created: new Date().toISOString().split('T')[0],
        scores: {
            1: { best_score: 0, best_time: 0, attempts: 0 },
            2: { best_score: 0, best_time: 0, attempts: 0 },
            3: { best_score: 0, best_time: 0, attempts: 0 },
            4: { best_score: 0, best_time: 0, attempts: 0 }
        }
    };
    AppState.users.push(newUser);
    saveToStorage(STORAGE_KEYS.USERS, AppState.users);
    return newUser;
}

function updateUserScore(userId, levelId, score, timeSeconds) {
    const user = getUserById(userId);
    if (!user) return;

    if (!user.scores[levelId]) {
        user.scores[levelId] = { best_score: 0, best_time: 0, attempts: 0 };
    }

    const current = user.scores[levelId];
    current.attempts++;

    if (score > current.best_score) {
        current.best_score = score;
    }
    if (timeSeconds > 0 && (current.best_time === 0 || timeSeconds < current.best_time)) {
        current.best_time = timeSeconds;
    }

    saveToStorage(STORAGE_KEYS.USERS, AppState.users);
    updateLeaderboard();
}

// ===== LEADERBOARD =====
function initLeaderboard() {
    const saved = loadFromStorage(STORAGE_KEYS.LEADERBOARD, []);
    if (saved.length === 0 && AppState.users.length > 0) {
        updateLeaderboard();
    } else {
        AppState.leaderboard = saved;
    }
}

function updateLeaderboard() {
    const entries = AppState.users.map(u => {
        let totalScore = 0;
        let totalTime = 0;
        let levelsCompleted = 0;
        let timeCount = 0;

        Object.keys(u.scores).forEach(lid => {
            const s = u.scores[lid];
            totalScore += s.best_score;
            if (s.best_score >= 60) levelsCompleted++;
            if (s.best_time > 0) {
                totalTime += s.best_time;
                timeCount++;
            }
        });

        return {
            username: u.username,
            userId: u.id,
            total_score: totalScore,
            avg_time: timeCount > 0 ? Math.round(totalTime / timeCount) : 0,
            levels_completed: levelsCompleted,
            last_active: new Date().toISOString().split('T')[0]
        };
    });

    entries.sort((a, b) => b.total_score - a.total_score || a.avg_time - b.avg_time);
    AppState.leaderboard = entries;
    saveToStorage(STORAGE_KEYS.LEADERBOARD, entries);
}

// ===== AUTH UI =====
function showAuth() {
    const overlay = document.getElementById('auth-overlay');
    overlay.classList.remove('hidden');
    renderAuthForm('login');
}

function hideAuth() {
    document.getElementById('auth-overlay').classList.add('hidden');
}

function renderAuthForm(mode) {
    const box = document.getElementById('auth-box');
    const isLogin = mode === 'login';

    box.innerHTML = `
        <div class="auth-logo">
            <div class="icon">🕌</div>
            <h2>Belajar Huruf Arab</h2>
            <p>${isLogin ? 'Masuk untuk melanjutkan belajar' : 'Buat akun baru untuk memulai'}</p>
        </div>
        <div class="auth-tabs">
            <button class="auth-tab ${isLogin ? 'active' : ''}" onclick="renderAuthForm('login')">Masuk</button>
            <button class="auth-tab ${!isLogin ? 'active' : ''}" onclick="renderAuthForm('register')">Daftar</button>
        </div>
        <div class="auth-error" id="auth-error"></div>
        <div class="auth-success" id="auth-success"></div>
        <form class="auth-form" id="auth-form" onsubmit="handleAuth(event, '${mode}')">
            ${!isLogin ? `
                <div class="form-group">
                    <label>Username</label>
                    <input type="text" id="auth-username" placeholder="Nama panggilan" required minlength="3">
                </div>
            ` : ''}
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="auth-email" placeholder="email@contoh.com" required>
            </div>
            <div class="form-group">
                <label>Password</label>
                <input type="password" id="auth-password" placeholder="Minimal 6 karakter" required minlength="6">
            </div>
            <button type="submit" class="auth-btn">${isLogin ? '🔓 Masuk' : '✨ Daftar'}</button>
        </form>
        <div class="auth-footer">
            ${isLogin ? 'Belum punya akun? Klik "Daftar" di atas' : 'Sudah punya akun? Klik "Masuk" di atas'}
        </div>
    `;
}

function handleAuth(e, mode) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    const errorEl = document.getElementById('auth-error');
    const successEl = document.getElementById('auth-success');

    errorEl.classList.remove('show');
    successEl.classList.remove('show');

    if (mode === 'register') {
        const username = document.getElementById('auth-username').value.trim();

        if (getUserByEmail(email)) {
            errorEl.textContent = '❌ Email sudah terdaftar. Silakan masuk.';
            errorEl.classList.add('show');
            return;
        }

        if (username.length < 3) {
            errorEl.textContent = '❌ Username minimal 3 karakter.';
            errorEl.classList.add('show');
            return;
        }

        const newUser = createUser(email, username, password);
        successEl.textContent = '✅ Akun berhasil dibuat! Silakan masuk.';
        successEl.classList.add('show');

        setTimeout(() => renderAuthForm('login'), 1500);
        return;
    }

    // Login
    const user = getUserByEmail(email);
    if (!user) {
        errorEl.textContent = '❌ Email tidak ditemukan. Silakan daftar dulu.';
        errorEl.classList.add('show');
        return;
    }

    if (user.password !== password) {
        errorEl.textContent = '❌ Password salah.';
        errorEl.classList.add('show');
        return;
    }

    loginUser(user);
}

function loginUser(user) {
    AppState.currentUser = user;
    saveToStorage(STORAGE_KEYS.CURRENT_USER, user.id);
    hideAuth();
    updateHeaderUser();
    renderLevels();
    showWelcome();
}

function logout() {
    AppState.currentUser = null;
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    updateHeaderUser();
    showAuth();
}

function switchAccount() {
    const dropdown = document.getElementById('user-dropdown');
    dropdown.classList.remove('show');

    const content = document.getElementById('content-area');
    content.innerHTML = `
        <div style="max-width:500px;margin:0 auto">
            <h2 style="text-align:center;margin-bottom:1.5rem;color:var(--primary-dark)">👥 Pilih Akun</h2>
            <div class="account-list" id="account-list"></div>
            <div style="text-align:center;margin-top:1.5rem">
                <button class="btn btn-secondary" onclick="showAuth()">➕ Tambah Akun Baru</button>
            </div>
        </div>
    `;

    const list = document.getElementById('account-list');
    AppState.users.forEach(u => {
        const isActive = AppState.currentUser && AppState.currentUser.id === u.id;
        const item = document.createElement('div');
        item.className = `account-item ${isActive ? 'active' : ''}`;
        item.innerHTML = `
            <div class="acc-avatar">${u.username.charAt(0).toUpperCase()}</div>
            <div class="acc-info">
                <div class="acc-name">${u.username}</div>
                <div class="acc-email">${u.email}</div>
            </div>
            <div class="acc-check">✓</div>
        `;
        item.onclick = () => {
            if (!isActive) {
                loginUser(u);
            }
        };
        list.appendChild(item);
    });
}

function updateHeaderUser() {
    const badge = document.getElementById('level-badge');
    const profile = document.getElementById('user-profile');

    if (AppState.currentUser) {
        badge.textContent = `Level ${AppState.currentLevel}`;
        profile.style.display = 'flex';
        document.getElementById('user-name').textContent = AppState.currentUser.username;
        document.getElementById('user-email').textContent = AppState.currentUser.email;
        document.getElementById('user-avatar').textContent = AppState.currentUser.username.charAt(0).toUpperCase();
    } else {
        badge.textContent = 'Guest';
        profile.style.display = 'none';
    }
}

function toggleDropdown() {
    const dropdown = document.getElementById('user-dropdown');
    dropdown.classList.toggle('show');
}

// ===== EXPORT / IMPORT DATA =====
function exportData() {
    const data = {
        users: AppState.users,
        leaderboard: AppState.leaderboard,
        exported_at: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `arabic-learning-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                if (data.users) {
                    AppState.users = data.users;
                    saveToStorage(STORAGE_KEYS.USERS, data.users);
                }
                if (data.leaderboard) {
                    AppState.leaderboard = data.leaderboard;
                    saveToStorage(STORAGE_KEYS.LEADERBOARD, data.leaderboard);
                }
                alert('✅ Data berhasil diimport! Silakan refresh halaman.');
                location.reload();
            } catch (err) {
                alert('❌ File tidak valid.');
            }
        };
        reader.readAsText(file);
    };
    input.click();
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

        // Check saved login
        const savedUserId = loadFromStorage(STORAGE_KEYS.CURRENT_USER, null);
        if (savedUserId) {
            const user = getUserById(savedUserId);
            if (user) {
                AppState.currentUser = user;
                updateHeaderUser();
                hideAuth();
                showWelcome();
                return;
            }
        }
        showAuth();
    } catch (err) {
        console.error('Error loading XML:', err);
        document.getElementById('content-area').innerHTML = 
            '<div style="text-align:center;padding:2rem;color:#e74c3c">Gagal memuat database.</div>';
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

    const user = AppState.currentUser;

    AppState.levels.forEach((level, idx) => {
        const meta = levelMeta[idx] || { name: 'Level ' + level.id, desc: '' };
        let isUnlocked = true;
        let score = 0;

        if (user && user.scores) {
            const prevLevel = level.id - 1;
            if (prevLevel > 0) {
                const prev = user.scores[prevLevel];
                isUnlocked = prev && prev.best_score >= 60;
            }
            const curr = user.scores[level.id];
            score = curr ? curr.best_score : 0;
        }

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
            ${score > 0 ? `<div style="font-size:0.75rem;color:var(--primary);margin-top:0.3rem;font-weight:600">⭐ Skor: ${score}%</div>` : ''}
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
    const user = AppState.currentUser;
    const username = user ? user.username : 'Pembelajar';

    content.innerHTML = `
        <div class="welcome-screen">
            <div class="big-icon">📖</div>
            <h2>Halo, ${username}! 👋</h2>
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
                    <div class="label">Kuis & Ranking</div>
                </div>
                <div class="feature-item">
                    <div class="icon">🔊</div>
                    <div class="label">Audio Bacaan</div>
                </div>
            </div>
            <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap">
                <button class="btn btn-primary" onclick="showTab('materi')">Mulai Belajar</button>
                <button class="btn btn-secondary" onclick="showLeaderboard()">📊 Lihat Ranking</button>
            </div>
        </div>
    `;
}

// ===== LEADERBOARD =====
function showLeaderboard() {
    updateLeaderboard();
    const content = document.getElementById('content-area');
    const user = AppState.currentUser;

    let rows = AppState.leaderboard.map((entry, idx) => {
        const isCurrent = user && entry.userId === user.id;
        const rankClass = idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : 'rank-other';
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '';

        return `
            <tr class="${isCurrent ? 'current-user' : ''}">
                <td><div class="rank-badge ${rankClass}">${medal || (idx + 1)}</div></td>
                <td><strong>${entry.username}</strong> ${isCurrent ? '(Kamu)' : ''}</td>
                <td><strong>${entry.total_score}%</strong></td>
                <td>${entry.avg_time > 0 ? entry.avg_time + ' dtk' : '-'}</td>
                <td>${entry.levels_completed}/4</td>
            </tr>
        `;
    }).join('');

    if (rows === '') {
        rows = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-light)">Belum ada data. Ayo mulai kuis!</td></tr>';
    }

    content.innerHTML = `
        <div class="leaderboard-section">
            <div class="section-title">🏆 Peringkat Pembelajar</div>
            <div class="leaderboard-card">
                <div class="leaderboard-header">
                    <h3>📊 Leaderboard</h3>
                    <span style="font-size:0.85rem">${AppState.leaderboard.length} pembelajar</span>
                </div>
                <div style="overflow-x:auto">
                    <table class="leaderboard-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Nama</th>
                                <th>Total Skor</th>
                                <th>Rata-rata Waktu</th>
                                <th>Level Selesai</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
            <div style="text-align:center;margin-top:1.5rem">
                <button class="btn btn-secondary" onclick="showWelcome()">⬅ Kembali</button>
            </div>
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
    AppState.quizStartTime = Date.now();
    AppState.quizElapsed = 0;

    if (AppState.quizTimerInterval) clearInterval(AppState.quizTimerInterval);
    AppState.quizTimerInterval = setInterval(() => {
        AppState.quizElapsed = Math.floor((Date.now() - AppState.quizStartTime) / 1000);
        const timerEl = document.getElementById('quiz-timer');
        if (timerEl) {
            timerEl.textContent = `⏱ ${AppState.quizElapsed} dtk`;
            if (AppState.quizElapsed > 60) timerEl.classList.add('warning');
            if (AppState.quizElapsed > 120) timerEl.classList.add('danger');
        }
    }, 1000);

    showQuizQuestion();
}

function showQuizQuestion() {
    const level = AppState.levels.find(l => l.id === AppState.currentLevel);
    const soal = level.quiz[AppState.quizIndex];

    const content = document.getElementById('content-area');
    content.innerHTML = `
        <div class="quiz-container">
            <div class="quiz-timer" id="quiz-timer">⏱ 0 dtk</div>
            <div class="quiz-progress" id="quiz-progress"></div>
            <div class="quiz-question-box">
                <div class="quiz-question">${soal.pertanyaan}</div>
                ${soal.pertanyaan.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u064B-\u065F\u0670\u0640]+/g) ? 
                  `<div class="quiz-arab">${extractArabic(soal.pertanyaan)}</div>` : ''}
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
    const match = text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u064B-\u065F\u0670\u0640]+/g);
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
        <button class="quiz-option" data-letter="${letters[i]}" onclick="checkQuiz('${p.replace(/'/g, "\\'")}', this)">${p}</button>
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
        if (AppState.quizTimerInterval) clearInterval(AppState.quizTimerInterval);
        showQuizResult();
    } else {
        showQuizQuestion();
    }
}

function showQuizResult() {
    const level = AppState.levels.find(l => l.id === AppState.currentLevel);
    const total = level.quiz.length;
    const score = Math.round((AppState.quizScore / total) * 100);
    const timeSeconds = AppState.quizElapsed;
    const user = AppState.currentUser;

    // Save to user
    if (user) {
        updateUserScore(user.id, AppState.currentLevel, score, timeSeconds);
    }

    // Determine speed badge
    let speedClass = 'speed-normal';
    let speedText = '⚡ Normal';
    if (timeSeconds < 30) {
        speedClass = 'speed-fast';
        speedText = '🚀 Cepat!';
    } else if (timeSeconds > 90) {
        speedClass = 'speed-slow';
        speedText = '🐢 Pelan';
    }

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
            <div style="font-size:3rem;margin-bottom:0.5rem">🏆</div>
            <div class="result-score">${score}%</div>
            <div class="result-label">${AppState.quizScore} benar dari ${total} soal</div>
            <div style="margin:0.5rem 0">
                <span class="speed-badge ${speedClass}">${speedText}</span>
                <span style="color:var(--text-light);font-size:0.9rem;margin-left:0.5rem">⏱ ${timeSeconds} dtk</span>
            </div>
            <div class="result-message ${messageClass}">${message}</div>
            ${user ? `<div style="margin-bottom:1rem;color:var(--text-light);font-size:0.9rem">👤 ${user.username}</div>` : ''}
            <div class="result-buttons">
                <button class="btn btn-primary" onclick="renderQuiz()">🔄 Ulangi Kuis</button>
                ${score >= 60 && AppState.currentLevel < 4 ? 
                    `<button class="btn btn-primary" onclick="AppState.currentLevel++;AppState.currentTab='materi';renderLevels();showTab('materi')">Level Selanjutnya ➡</button>` : ''}
                <button class="btn btn-secondary" onclick="showLeaderboard()">📊 Lihat Ranking</button>
            </div>
        </div>
    `;

    renderLevels();
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    initUsers();
    initLeaderboard();
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

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const profile = document.getElementById('user-profile');
        const dropdown = document.getElementById('user-dropdown');
        if (profile && dropdown && !profile.contains(e.target)) {
            dropdown.classList.remove('show');
        }
    });

    // Load voices for TTS
    if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = () => {
            window.speechSynthesis.getVoices();
        };
    }
});
