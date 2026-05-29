/* ════════════════════════════════════════
   Rural Learning Tutorial — Shared JS
   ════════════════════════════════════════ */

// ── BACKGROUND ──
function injectBackground() {
  // Prevent duplicate injection if it already exists
  if (document.querySelector('.bg-animation')) return;
  document.body.insertAdjacentHTML('afterbegin', `
    <div class="bg-animation">
      <div class="circle"></div><div class="circle"></div><div class="circle"></div>
      <div class="circle"></div><div class="circle"></div><div class="circle"></div>
      <div class="circle"></div><div class="circle"></div>
    </div>
    <div class="leaf">🌿</div><div class="leaf">🍃</div><div class="leaf">🌱</div>
    <div class="leaf">🍀</div><div class="leaf">🌿</div><div class="leaf">🍃</div>
  `);
}

// ── RIPPLE ──
function addRipple(btn) {
  btn.addEventListener('click', function(e) {
    const r = document.createElement('span');
    const rect = btn.getBoundingClientRect();
    r.style.cssText = `position:absolute;border-radius:50%;background:rgba(255,255,255,.35);
      width:10px;height:10px;transform:scale(0);animation:btnRipple .6s linear;
      pointer-events:none;left:${e.clientX-rect.left-5}px;top:${e.clientY-rect.top-5}px`;
    btn.style.position = btn.style.position || 'relative';
    btn.appendChild(r);
    setTimeout(() => r.remove(), 700);
  });
}

// ── SCROLL ANIMATIONS ──
function initScrollAnimations() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }, i * 80);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.anim-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(28px)';
    el.style.transition = 'opacity .6s ease, transform .6s ease';
    obs.observe(el);
  });
}

// ── ALERT ──
function showAlert(msg, type = 'success') {
  const box = document.querySelector('.alert-container');
  if (!box) return;
  box.innerHTML = `<div class="alert alert-${type}">${type==='success'?'✅':'❌'} ${msg}</div>`;
  setTimeout(() => { if(box) box.innerHTML = ''; }, 3500);
}

// ── MODAL ──
function openModal(id)  { document.getElementById(id).classList.add('show');    }
// Safe closeModal to check element presence
function closeModal(id) { 
  const el = document.getElementById(id);
  if (el) el.classList.remove('show'); 
}
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('show');
});

// ── LOGOUT ──
function logout() {
  sessionStorage.clear();
  window.location.replace('Login.html');
}

// ── SIDEBAR RENDERER ──
function renderAppSidebar() {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return; // Not a page with a sidebar (e.g. Login, Register, index)

  const user = getUser(); // Fetched from sessionStorage via api.js
  if (!user) return;

  // Find navigation container in sidebar (could be a nav, a ul.nav-menu, or bare nav)
  const navContainer = sidebar.querySelector('.nav-menu') || sidebar.querySelector('nav');
  if (!navContainer) return;

  // Extract just the filename (e.g. "dashboard-student.html") from the full URL
  const currentFile = window.location.pathname.split('/').pop().toLowerCase() || 'index.html';

  // Helper to check if a link is the current active page
  const isActive = (href) => {
    const linkFile = href.toLowerCase();
    if (currentFile === linkFile) return 'active';
    // Group aliases: watch.html counts as the video page
    if (linkFile === 'upload-video.html' && currentFile === 'watch.html') return 'active';
    if (linkFile === 'tutorials.html'   && currentFile === 'watch.html') return 'active';
    // Materials upload maps to the materials link
    if (linkFile === 'materials.html'   && currentFile === 'upload-materials.html') return 'active';
    return '';
  };

  if (user.role === 'teacher') {
    navContainer.innerHTML = `
      <a href="Dashboard-teacher.html" class="nav-link ${isActive('Dashboard-teacher.html')}">📊 Dashboard</a>
      <a href="Upload-video.html" class="nav-link ${isActive('Upload-video.html')}">🎥 Video Lectures</a>
      <a href="Assignments.html" class="nav-link ${isActive('Assignments.html')}">✏️ Student Tasks</a>
      <a href="Quiz.html" class="nav-link ${isActive('Quiz.html')}">⏱️ Quiz Creator</a>
      <a href="Materials.html" class="nav-link ${isActive('Materials.html')}">📄 Study Notes</a>
      <a href="Chat.html" class="nav-link ${isActive('Chat.html')}">💬 Classroom Chat</a>
      <div style="margin: 40px 0 10px; font-size: 0.65rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">Personal Analytics</div>
      <a href="Teacher-profile.html" class="nav-link ${isActive('Teacher-profile.html')}">👤 My Profile</a>
      <a href="#" onclick="logout()" class="nav-link" style="color: #ef4444; margin-top: 40px;">🚪 Sign Out</a>
    `;
  } else {
    navContainer.innerHTML = `
      <a href="Dashboard-student.html" class="nav-link ${isActive('Dashboard-student.html')}">🏠 Dashboard</a>
      <a href="Tutorials.html" class="nav-link ${isActive('Tutorials.html')}">🎥 Video Lessons</a>
      <a href="Assignments-student.html" class="nav-link ${isActive('Assignments-student.html')}">✏️ Assignments</a>
      <a href="Quiz.html" class="nav-link ${isActive('Quiz.html')}">⏱️ Quizzes</a>
      <a href="Materials.html" class="nav-link ${isActive('Materials.html')}">📄 Study Library</a>
      <a href="Chat.html" class="nav-link ${isActive('Chat.html')}">💬 Classroom Chat</a>
      <div style="margin: 40px 0 10px; font-size: 0.65rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">Personal Analytics</div>
      <a href="student-profile.html" class="nav-link ${isActive('student-profile.html')}">👤 My Profile</a>
      <a href="Progress.html" class="nav-link ${isActive('Progress.html')}">📊 My Reports</a>
      <a href="Scoreboard.html" class="nav-link ${isActive('Scoreboard.html')}">🏆 Honor Board</a>
      <a href="#" onclick="logout()" class="nav-link" style="color: #ef4444; margin-top: 40px;">🚪 Sign Out</a>
    `;
  }

  // Populate profile footer / header avatar dynamically
  // Covers: footer-init, user-init, hero-init, user-avatar
  const footerInit = document.getElementById('footer-init')
    || document.getElementById('user-init')
    || document.getElementById('hero-init')
    || document.getElementById('user-avatar');
  // Covers: footer-name, user-name, welcome-name
  const footerName = document.getElementById('footer-name')
    || document.getElementById('user-name')
    || document.getElementById('welcome-name');
  // Covers: footer-class, user-class, hero-meta
  const footerClass = document.getElementById('footer-class')
    || document.getElementById('user-class')
    || document.getElementById('hero-meta');

  if (footerInit && (footerInit.innerText.trim() === '?' || footerInit.innerText.trim() === '')) {
    footerInit.innerText = user.name.charAt(0).toUpperCase();
  }
  if (footerName && ['Loading...', 'Teacher', 'Student', ''].includes(footerName.innerText.trim())) {
    footerName.innerText = user.name;
  }
  if (footerClass && ['fetching profile', 'Fetching Session', 'Class N/A', 'Class Loading...', '...', ''].includes(footerClass.innerText.trim())) {
    footerClass.innerText = user.role === 'teacher'
      ? (user.expertSubject || 'Faculty Member')
      : ('CLASS ' + (user.studentClass || '').toUpperCase());
  }
}


// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  injectBackground();
  document.querySelectorAll('.btn, .btn-primary, .btn-login, .btn-register, .btn-gold').forEach(addRipple);
  initScrollAnimations();
  if (!document.getElementById('ripple-style')) {
    const s = document.createElement('style');
    s.id = 'ripple-style';
    s.textContent = '@keyframes btnRipple { to { transform:scale(40); opacity:0; } }';
    document.head.appendChild(s);
  }
  
  // Dynamically render sidebar links to ensure global linkage consistency
  setTimeout(renderAppSidebar, 0);
});