/**
 * 玉汝于城农产AI - 价格滚动动画最终版
 * 核心：确保从0开始滚动 + 视口触发 + 容错兜底
 */

// ==============================
// 全局状态
// ==============================
const AppState = {
  gsapReady: typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined'
};

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

// ==============================
// 初始化入口
// ==============================
document.addEventListener('DOMContentLoaded', () => {
  initCoreEvents();
  initNavbar();
  initAnimations(); // 包含价格滚动
  initForms();
});

// ==============================
// 核心事件系统 (简化版，仅保留必要)
// ==============================
function initCoreEvents() {
  document.addEventListener('click', (e) => {
    const openBtn = e.target.closest('[data-open-overlay]');
    const closeBtn = e.target.closest('[data-close-overlay], .close-btn, .back-btn');
    const scrollBtn = e.target.closest('[data-scroll-to]');

    if (openBtn) openOverlay(openBtn.getAttribute('data-open-overlay'));
    if (closeBtn) closeOverlay(closeBtn.closest('.overlay, .overlay-page').id);
    if (scrollBtn) {
      e.preventDefault();
      smoothScrollTo(scrollBtn.getAttribute('data-scroll-to'));
    }
  });

  // 点击遮罩关闭
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('overlay')) closeOverlay(e.target.id);
  });
}

// ==============================
// 导航栏逻辑 (简化版)
// ==============================
function initNavbar() {
  const hamburger = $('#hamburger');
  const mobileMenu = $('#mobileMenu');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      mobileMenu.classList.toggle('active');
      document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : 'auto';
    });
  }

  $$('.nav-link, .mobile-nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      if (mobileMenu && mobileMenu.classList.contains('active')) {
        hamburger.classList.remove('active');
        mobileMenu.classList.remove('active');
        document.body.style.overflow = 'auto';
      }
      smoothScrollTo(targetId);
    });
  });
}

function smoothScrollTo(sectionId) {
  const section = $('#' + sectionId);
  if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ==============================
// 【核心重写】动画与价格滚动系统
// ==============================
function initAnimations() {
  // 1. 兜底逻辑：如果GSAP挂了，直接显示正确价格
  if (!AppState.gsapReady) {
    console.log('GSAP未加载，直接显示价格');
    $$('.price-card').forEach(card => {
      const target = parseFloat(card.getAttribute('data-price'));
      const counter = $('.price-counter', card);
      if (counter && !isNaN(target)) counter.innerText = target.toFixed(1);
    });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // 2. Hero 入场动画
  gsap.timeline()
    .from('.hero-title', { opacity: 0, y: 60, duration: 1.1 })
    .from('.hero-slogan', { opacity: 0, y: 40, duration: 0.9 }, '-=0.6')
    .from('.hero-buttons', { opacity: 0, y: 40, duration: 0.9 }, '-=0.6');

  // 3. 服务/案例卡片淡入
  const createFadeIn = (selector) => {
    gsap.utils.toArray(selector).forEach((el, i) => {
      gsap.from(el, {
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none none',
          once: true
        },
        opacity: 0,
        y: 40,
        duration: 0.7,
        delay: i * 0.08
      });
    });
  };
  createFadeIn('.service-card');
  createFadeIn('.case-card');

  // 4. 【重中之重】价格数字滚动动画
  gsap.utils.toArray('.price-card').forEach((card, index) => {
    const targetPrice = parseFloat(card.getAttribute('data-price'));
    const counterEl = $('.price-counter', card);

    if (!counterEl || isNaN(targetPrice)) return;

    // 强制初始化为0，确保视觉效果
    counterEl.innerText = '0';

    // 创建ScrollTrigger
    ScrollTrigger.create({
      trigger: card,
      start: 'top 80%', // 稍微提前一点触发
      once: true, // 只执行一次，看完就没了，保持新鲜感
      onEnter: () => {
        // 执行动画：从0到目标值
        gsap.to(counterEl, {
          innerText: targetPrice,
          duration: 1.5, // 动画时长1.5秒，比较有节奏感
          ease: 'power2.out', // 先快后慢
          snap: { innerText: 0.1 }, // 每次变动0.1
          onUpdate: function() {
            // 实时更新并保留一位小数
            counterEl.innerText = parseFloat(counterEl.innerText).toFixed(1);
          }
        });
      }
    });
  });
}

// ==============================
// 表单系统
// ==============================
function initForms() {
  const contactForm = $('#contactForm');
  const formSuccess = $('#formSuccess');
  
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (formSuccess) {
        formSuccess.style.display = 'block';
        contactForm.reset();
        setTimeout(() => {
          formSuccess.style.display = 'none';
          closeAllOverlays();
        }, 2800);
      }
    });
  }
}

// ==============================
// 简易弹窗系统
// ==============================
function openOverlay(overlayId) {
  closeAllOverlays(false);
  const overlay = $('#' + overlayId);
  if (overlay) {
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeOverlay(overlayId) {
  const overlay = $('#' + overlayId);
  if (overlay) {
    overlay.classList.remove('active');
    // 检查是否还有其他弹窗
    if (!document.querySelector('.overlay.active, .overlay-page.active')) {
      document.body.style.overflow = 'auto';
    }
  }
}

function closeAllOverlays(unlock = true) {
  $$('.overlay-page.active, .overlay.active').forEach(el => el.classList.remove('active'));
  if (unlock) document.body.style.overflow = 'auto';
}
