/**
 * 玉汝于城农产AI官网交互逻辑
 * 包含：价格滚动动画、导航交互、弹窗、表单提交
 */

// 全局状态管理
const AppState = {
  gsapReady: typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined',
  isMobileMenuOpen: false
};

// 快捷选择器
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

// 页面DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  initCoreEvents();
  initNavbar();
  initAnimations();
  initForms();
});

// ==============================
// 核心事件系统
// ==============================
function initCoreEvents() {
  // 全局点击事件委托
  document.addEventListener('click', (e) => {
    const openOverlayBtn = e.target.closest('[data-open-overlay]');
    const closeOverlayBtn = e.target.closest('[data-close-overlay], .close-btn, .back-btn');
    const scrollBtn = e.target.closest('[data-scroll-to]');

    // 打开弹窗/侧滑页
    if (openOverlayBtn) {
      const overlayId = openOverlayBtn.getAttribute('data-open-overlay');
      openOverlay(overlayId);
    }

    // 关闭弹窗/侧滑页
    if (closeOverlayBtn) {
      const overlayEl = closeOverlayBtn.closest('.overlay, .overlay-page');
      if (overlayEl) closeOverlay(overlayEl.id);
    }

    // 平滑滚动
    if (scrollBtn) {
      e.preventDefault();
      const targetId = scrollBtn.getAttribute('data-scroll-to');
      smoothScrollTo(targetId);
      // 滚动时关闭所有弹窗
      closeAllOverlays();
    }
  });

  // 点击遮罩关闭居中弹窗
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('overlay')) {
      closeOverlay(e.target.id);
    }
  });

  // 键盘ESC关闭弹窗
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllOverlays();
    }
  });
}

// ==============================
// 导航栏交互逻辑
// ==============================
function initNavbar() {
  const hamburger = $('#hamburger');
  const mobileMenu = $('#mobileMenu');
  const mobileNavLinks = $$('.mobile-nav-link');

  // 汉堡菜单切换
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      mobileMenu.classList.toggle('active');
      AppState.isMobileMenuOpen = mobileMenu.classList.contains('active');
      document.body.style.overflow = AppState.isMobileMenuOpen ? 'hidden' : 'auto';
    });
  }

  // 移动端点击导航项关闭菜单
  mobileNavLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      smoothScrollTo(targetId);
      // 关闭菜单
      hamburger.classList.remove('active');
      mobileMenu.classList.remove('active');
      document.body.style.overflow = 'auto';
      AppState.isMobileMenuOpen = false;
    });
  });

  // 桌面端导航项点击平滑滚动
  $$('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      smoothScrollTo(targetId);
    });
  });
}

// 平滑滚动工具函数
function smoothScrollTo(sectionId) {
  const targetSection = $('#' + sectionId);
  if (targetSection) {
    const navbarHeight = $('#navbar').offsetHeight;
    const targetPosition = targetSection.offsetTop - navbarHeight;
    window.scrollTo({
      top: targetPosition,
      behavior: 'smooth'
    });
  }
}

// ==============================
// 动画系统（核心：价格滚动动画）
// ==============================
function initAnimations() {
  // 兜底逻辑：GSAP加载失败时，直接显示正确价格
  if (!AppState.gsapReady) {
    console.warn('GSAP未加载，已自动显示正确价格');
    $$('.price-card').forEach(card => {
      const targetPrice = parseFloat(card.getAttribute('data-price'));
      const counterEl = $('.price-counter', card);
      if (counterEl && !isNaN(targetPrice)) {
        counterEl.innerText = targetPrice.toFixed(1);
      }
    });
    return;
  }

  // 注册ScrollTrigger插件
  gsap.registerPlugin(ScrollTrigger);

  // 1. Hero区入场动画
  gsap.timeline()
    .from('.hero-title', { opacity: 0, y: 60, duration: 1.1, ease: 'power2.out' })
    .from('.hero-slogan', { opacity: 0, y: 40, duration: 0.9, ease: 'power2.out' }, '-=0.6')
    .from('.hero-desc', { opacity: 0, y: 40, duration: 0.9, ease: 'power2.out' }, '-=0.5')
    .from('.hero-buttons', { opacity: 0, y: 40, duration: 0.9, ease: 'power2.out' }, '-=0.4');

  // 2. 服务卡片淡入动画
  const createFadeInAnimation = (selector) => {
    gsap.utils.toArray(selector).forEach((element, index) => {
      gsap.from(element, {
        scrollTrigger: {
          trigger: element,
          start: 'top 85%',
          toggleActions: 'play none none none',
          once: true
        },
        opacity: 0,
        y: 40,
        duration: 0.7,
        delay: index * 0.08,
        ease: 'power2.out'
      });
    });
  };
  createFadeInAnimation('.service-card');
  createFadeInAnimation('.case-card');
  createFadeInAnimation('.about-item');

  // 3. 【核心】价格数字滚动动画
  gsap.utils.toArray('.price-card').forEach((card) => {
    const targetPrice = parseFloat(card.getAttribute('data-price'));
    const counterEl = $('.price-counter', card);

    // 容错处理
    if (!counterEl || isNaN(targetPrice)) return;

    // 强制初始化为0，确保动画从0开始
    counterEl.innerText = '0';

    // 创建视口触发的滚动动画
    ScrollTrigger.create({
      trigger: card,
      start: 'top 80%', // 卡片进入视口80%时触发
      once: true, // 只执行一次，保证新鲜感
      onEnter: () => {
        // 执行数字滚动动画
        gsap.to(counterEl, {
          innerText: targetPrice,
          duration: 1.5, // 动画时长1.5秒，节奏舒适
          ease: 'power2.out', // 先快后慢，符合视觉习惯
          snap: { innerText: 0.1 }, // 每次变动0.1，适配一位小数
          onUpdate: function() {
            // 实时更新，强制保留一位小数
            counterEl.innerText = parseFloat(counterEl.innerText).toFixed(1);
          }
        });
      }
    });
  });
}

// ==============================
// 表单提交逻辑
// ==============================
function initForms() {
  const contactForm = $('#contactForm');
  const formSuccessTip = $('#formSuccess');
  
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      // 显示提交成功提示
      if (formSuccessTip) {
        formSuccessTip.style.display = 'block';
        contactForm.reset();
        
        // 3秒后隐藏提示，关闭所有弹窗
        setTimeout(() => {
          formSuccessTip.style.display = 'none';
          closeAllOverlays();
        }, 3000);
      }
    });
  }
}

// ==============================
// 弹窗/侧滑页管理
// ==============================
function openOverlay(overlayId) {
  // 先关闭所有弹窗，避免叠加
  closeAllOverlays(false);
  
  const overlayEl = $('#' + overlayId);
  if (overlayEl) {
    overlayEl.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeOverlay(overlayId) {
  const overlayEl = $('#' + overlayId);
  if (overlayEl) {
    overlayEl.classList.remove('active');
    
    // 检查是否还有其他打开的弹窗，没有则恢复页面滚动
    const hasActiveOverlay = document.querySelector('.overlay.active, .overlay-page.active');
    if (!hasActiveOverlay) {
      document.body.style.overflow = 'auto';
    }
  }
}

function closeAllOverlays(unlockBody = true) {
  $$('.overlay-page.active, .overlay.active').forEach(el => {
    el.classList.remove('active');
  });
  
  if (unlockBody) {
    document.body.style.overflow = 'auto';
  }
}
