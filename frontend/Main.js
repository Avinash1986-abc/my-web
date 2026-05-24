/* ════════════════════════════════════════
   Rural Learning Tutorial — Shared JS
   ════════════════════════════════════════ */

// ── BACKGROUND ──
function injectBackground() {
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
function closeModal(id) { document.getElementById(id).classList.remove('show'); }
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('show');
});

// ── LOGOUT ──
function logout() { window.location.href = 'login.html'; }

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
});