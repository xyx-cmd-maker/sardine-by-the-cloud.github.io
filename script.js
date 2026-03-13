// 全局状态：简化管理，不用复杂的栈
let currentOverlay = null;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initGSAP();
  initPriceCounter();
  initForms();
  initOverlayClickClose();
});

// ------------------------------
// 导航栏
// ------------------------------
function initNavbar() {
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      mobileMenu.classList.toggle('active');
      document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : 'auto';
    });
  }

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      scrollToSection(targetId);
      if (hamburger && mobileMenu) {
        hamburger.classList.remove('active');
        mobileMenu.classList.remove('active');
        document.body.style.overflow = 'auto';
      }
    });
  });

  window.addEventListener('scroll', updateActiveNav);
}

function scrollToSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateActiveNav() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');
  let current = '';
  sections.forEach(section => {
    const sectionTop = section.offsetTop - 130;
    if (window.scrollY >= sectionTop) current = section.getAttribute('id');
  });
  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === `#${current}`) link.classList.add('active');
  });
}

// ------------------------------
// GSAP动画（带容错）
// ------------------------------
function initGSAP() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    console.log('GSAP未加载，跳过动画');
    document.querySelectorAll('.price-card').forEach(card => {
      const target = parseFloat(card.getAttribute('data-price'));
      const counter = card.querySelector('.counter');
      if (counter) counter.innerText = target.toFixed(1);
    });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  gsap.timeline()
    .from('.hero-title', { opacity: 0, y: 60, duration: 1.1 })
    .from('.hero-slogan', { opacity: 0, y: 40, duration: 0.9 }, '-=0.6')
    .from('.hero-desc', { opacity: 0, y: 40, duration: 0.9 }, '-=0.6')
    .from('.hero-buttons', { opacity: 0, y: 40, duration: 0.9 }, '-=0.6')
    .from('.agri-icon', { opacity: 0, scale: 0.4, duration: 1.1, stagger: 0.25 }, '-=0.6');

  gsap.utils.toArray('.service-card').forEach((card, i) => {
    gsap.from(card, {
      scrollTrigger: { trigger: card, start: 'top 82%', toggleActions: 'play none none none' },
      opacity: 0, y: 55, duration: 0.85, delay: i * 0.12
    });
  });

  gsap.utils.toArray('.price-card').forEach((card, i) => {
    gsap.from(card, {
      scrollTrigger: { trigger: card, start: 'top 82%', toggleActions: 'play none none none' },
      opacity: 0, y: 55, duration: 0.85, delay: i * 0.12
    });
  });

  gsap.utils.toArray('.case-card').forEach((card, i) => {
    gsap.from(card, {
      scrollTrigger: { trigger: card, start: 'top 82%', toggleActions: 'play none none none' },
      opacity: 0, y: 55, duration: 0.85, delay: i * 0.12
    });
  });

  gsap.utils.toArray('.about-item').forEach((item, i) => {
    gsap.from(item, {
      scrollTrigger: { trigger: item, start: 'top 82%', toggleActions: 'play none none none' },
      opacity: 0, x: -35, duration: 0.85, delay: i * 0.12
    });
  });
}

// ------------------------------
// 价格数字（优先直接显示，避免0）
// ------------------------------
function initPriceCounter() {
  const priceCards = document.querySelectorAll('.price-card');
  priceCards.forEach(card => {
    const target = parseFloat(card.getAttribute('data-price'));
    const counter = card.querySelector('.counter');
    if (!counter) return;
    counter.innerText = target.toFixed(1);

    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      counter.innerText = '0';
      ScrollTrigger.create({
        trigger: card,
        start: 'top 82%',
        onEnter: () => {
          gsap.to(counter, {
            innerText: target,
            duration: 1.5,
            ease: 'power2.out',
            snap: { innerText: 0.1 },
            onUpdate: function() {
              counter.innerText = parseFloat(counter.innerText).toFixed(1);
            }
          });
        }
      });
    }
  });
}

// ------------------------------
// 表单
// ------------------------------
function initForms() {
  const contactForm = document.getElementById('contactForm');
  const formSuccess = document.getElementById('formSuccess');
  if (contactForm && formSuccess) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleFormSubmit(formSuccess, contactForm);
    });
  }
}

function handleFormSubmit(successElement, formElement) {
  successElement.style.display = 'block';
  formElement.reset();
  setTimeout(() => {
    successElement.style.display = 'none';
    closeAllOverlays();
  }, 2800);
}

// ------------------------------
// 【核心重写】弹窗逻辑（彻底解决卡死问题）
// ------------------------------
function initOverlayClickClose() {
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('overlay')) {
      closeOverlay(e.target.id);
    }
  });
}

// 打开弹窗（简化逻辑：每次只打开一个，关闭其他）
function openOverlay(overlayId) {
  closeAllOverlays(false);
  
  const overlay = document.getElementById(overlayId);
  if (!overlay) return;

  overlay.classList.add('active');
  currentOverlay = overlayId;
  document.body.style.overflow = 'hidden'; // 锁定背景
}

// 切换弹窗（服务页跳案例页）
function switchOverlay(overlayId) {
  openOverlay(overlayId);
}

// 关闭弹窗（强制重置状态）
function closeOverlay(overlayId) {
  const overlay = document.getElementById(overlayId);
  if (!overlay) return;

  overlay.classList.remove('active');
  
  // 【核心】强制检查：如果没有其他弹窗了，立即恢复body滚动
  const hasActiveOverlay = document.querySelector('.overlay.active') || document.querySelector('.overlay-page.active');
  if (!hasActiveOverlay) {
    currentOverlay = null;
    document.body.style.overflow = 'auto';
  }
}

// 关闭所有弹窗（强制重置，绝对不锁死）
function closeAllOverlays(resetBody = true) {
  document.querySelectorAll('.overlay-page.active').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.overlay.active').forEach(el => el.classList.remove('active'));
  currentOverlay = null;
  
  if (resetBody) {
    // 【核心】强制恢复body滚动，加个延迟确保动画完成
    setTimeout(() => {
      document.body.style.overflow = 'auto';
    }, 50);
  }
}