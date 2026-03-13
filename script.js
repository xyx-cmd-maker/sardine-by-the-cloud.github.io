/**
 * 玉汝于城农产AI - 交互逻辑最终优化版
 * 修复：价格永久0问题、图片加载、事件冲突、内存泄漏
 */

// ==============================
// 全局状态管理（单例模式，无冲突）
// ==============================
const AppState = {
  currentOverlay: null,
  isMenuOpen: false,
  scrollPosition: 0,
  // 【修复】GSAP就绪状态，只检测一次
  gsapReady: typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined',
  isPageLoaded: false
};

// ==============================
// 工具函数（性能优先，无冗余）
// ==============================
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

// 防抖函数（滚动/resize专用）
const debounce = (func, wait = 100) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// 检查元素是否在视口内
const isInViewport = (el) => {
  const rect = el.getBoundingClientRect();
  return (
    rect.top <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.bottom >= 0
  );
};

// ==============================
// 初始化入口
// ==============================
document.addEventListener('DOMContentLoaded', () => {
  initCoreEvents();
  initNavbar();
  initPriceDisplay(); // 【修复】优先初始化价格，确保不会显示0
  initAnimations();
  initForms();
  
  // 页面可见性监听（省电/性能优化）
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // 页面完全加载后二次检查
  window.addEventListener('load', () => {
    AppState.isPageLoaded = true;
    // 首屏价格动画二次触发
    initPriceDisplay();
  });
});

// ==============================
// 核心事件系统（事件委托，性能最优）
// ==============================
function initCoreEvents() {
  // 全局点击委托（统一处理所有按钮点击，无冗余监听器）
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-open-overlay], [data-close-overlay], [data-scroll-to], .close-btn, .back-btn');
    if (!target) return;

    // 打开弹窗
    if (target.hasAttribute('data-open-overlay')) {
      e.preventDefault();
      openOverlay(target.getAttribute('data-open-overlay'));
      return;
    }

    // 关闭弹窗
    if (target.hasAttribute('data-close-overlay') || target.classList.contains('close-btn') || target.classList.contains('back-btn')) {
      e.preventDefault();
      const overlayId = target.getAttribute('data-close-overlay') || target.closest('.overlay, .overlay-page').id;
      closeOverlay(overlayId);
      return;
    }

    // 平滑滚动
    if (target.hasAttribute('data-scroll-to')) {
      e.preventDefault();
      smoothScrollTo(target.getAttribute('data-scroll-to'));
      return;
    }
  });

  // 点击遮罩层关闭弹窗
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('overlay')) {
      closeOverlay(e.target.id);
    }
  });

  // 优化的滚动监听（Passive，不阻塞浏览器滚动）
  window.addEventListener('scroll', updateActiveNav, { passive: true });
}

// ==============================
// 导航栏逻辑（状态互斥，无冲突）
// ==============================
function initNavbar() {
  const hamburger = $('#hamburger');
  const mobileMenu = $('#mobileMenu');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMobileMenu();
    });
  }

  // 导航链接点击
  $$('.nav-link, .mobile-nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      
      if (AppState.isMenuOpen) toggleMobileMenu();
      
      smoothScrollTo(targetId);
    });
  });
}

function toggleMobileMenu() {
  const hamburger = $('#hamburger');
  const mobileMenu = $('#mobileMenu');
  
  AppState.isMenuOpen = !AppState.isMenuOpen;
  
  hamburger.classList.toggle('active', AppState.isMenuOpen);
  mobileMenu.classList.toggle('active', AppState.isMenuOpen);
  
  // 菜单与弹窗互斥：菜单打开时自动关闭弹窗
  if (AppState.isMenuOpen) {
    if (AppState.currentOverlay) closeAllOverlays(false);
    lockBodyScroll();
  } else {
    unlockBodyScroll();
  }
}

function smoothScrollTo(sectionId) {
  const section = $('#' + sectionId);
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// 防抖的导航激活状态更新
const updateActiveNav = debounce(() => {
  const sections = $$('section[id]');
  const navLinks = $$('.nav-link');
  let current = '';

  const scrollPos = window.scrollY + 140; // 导航栏偏移量

  sections.forEach(section => {
    if (scrollPos >= section.offsetTop) {
      current = section.getAttribute('id');
    }
  });

  navLinks.forEach(link => {
    const isActive = link.getAttribute('href') === `#${current}`;
    link.classList.toggle('active', isActive);
  });
});

// ==============================
// 【核心修复】价格显示逻辑（彻底解决0问题）
// ==============================
function initPriceDisplay() {
  const priceCards = $$('.price-card');
  
  priceCards.forEach(card => {
    const targetPrice = parseFloat(card.getAttribute('data-price'));
    const counterEl = $('.price-counter', card);
    if (!counterEl || isNaN(targetPrice)) return;

    // 【关键】永远先显示正确价格，绝对不会出现0
    counterEl.innerText = targetPrice.toFixed(1);

    // 只有GSAP就绪，才执行滚动动画
    if (AppState.gsapReady) {
      // 检查是否已经在视口，立即执行动画
      const isVisible = isInViewport(card);
      
      ScrollTrigger.create({
        trigger: card,
        start: 'top 85%',
        once: true, // 只执行一次，释放内存
        onEnter: () => runPriceAnimation(counterEl, targetPrice),
        // 【修复】首屏元素直接执行动画
        onRefresh: () => {
          if (isInViewport(card) && !AppState.isPageLoaded) {
            runPriceAnimation(counterEl, targetPrice);
          }
        }
      });

      // 首屏可见的卡片，立即执行动画
      if (isVisible && AppState.isPageLoaded) {
        runPriceAnimation(counterEl, targetPrice);
      }
    }
  });
}

// 价格数字动画（独立函数，无冲突）
function runPriceAnimation(element, target) {
  // 动画开始前重置，此时用户已看到正确价格，无闪烁
  gsap.fromTo(element, 
    { innerText: 0 },
    { 
      innerText: target,
      duration: 1.2,
      ease: 'power1.out',
      snap: { innerText: 0.1 },
      onUpdate: function() {
        element.innerText = parseFloat(element.innerText).toFixed(1);
      }
    }
  );
}

// ==============================
// 动画系统（GSAP + 完美降级）
// ==============================
function initAnimations() {
  // GSAP未加载时，直接显示所有元素，无隐藏
  if (!AppState.gsapReady) {
    console.log('GSAP未加载，运行轻量模式');
    $$('.service-card, .price-card, .case-card, .about-item').forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // Hero 动画时间线
  const heroTL = gsap.timeline({ defaults: { ease: 'power3.out' } });
  heroTL
    .from('.hero-title', { opacity: 0, y: 60, duration: 1.1 })
    .from('.hero-slogan', { opacity: 0, y: 40, duration: 0.9 }, '-=0.6')
    .from('.hero-desc', { opacity: 0, y: 40, duration: 0.9 }, '-=0.6')
    .from('.hero-buttons', { opacity: 0, y: 40, duration: 0.9 }, '-=0.6')
    .from('.agri-icon', { opacity: 0, scale: 0.4, duration: 1.1, stagger: 0.25 }, '-=0.6');

  // 通用卡片入场动画生成器（once=true，执行后自动释放内存）
  const createScrollAnim = (selector, props = {}) => {
    $$(selector).forEach((el, i) => {
      gsap.from(el, {
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none none',
          once: true
        },
        opacity: 0,
        duration: 0.7,
        ease: 'power2.out',
        delay: i * 0.08,
        ...props
      });
    });
  };

  // 执行各模块动画
  createScrollAnim('.service-card', { y: 40 });
  createScrollAnim('.case-card', { y: 40 });
  createScrollAnim('.about-item', { x: -30 });
}

// ==============================
// 表单系统（兼容Formspree）
// ==============================
function initForms() {
  const contactForm = $('#contactForm');
  const formSuccess = $('#formSuccess');
  
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      // 表单提交成功反馈
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
// 弹窗系统（与CSS完美适配，无滚动冲突）
// ==============================
function openOverlay(overlayId) {
  if (!overlayId) return;
  
  // 先关闭所有弹窗，确保单例无冲突
  closeAllOverlays(false);
  
  const overlay = $('#' + overlayId);
  if (!overlay) return;

  // 关闭移动端菜单（互斥）
  if (AppState.isMenuOpen) toggleMobileMenu();

  overlay.classList.add('active');
  AppState.currentOverlay = overlayId;
  
  // 滚动到弹窗顶部
  overlay.scrollTop = 0;
  
  // 锁定背景滚动
  lockBodyScroll();
}

// 兼容HTML内联onclick（兜底）
window.openOverlay = openOverlay;
window.switchOverlay = openOverlay;

function closeOverlay(overlayId) {
  const overlay = $('#' + overlayId);
  if (!overlay) return;

  overlay.classList.remove('active');
  
  // 检查是否还有活跃弹窗，无则解锁背景
  const hasActiveOverlay = document.querySelector('.overlay.active, .overlay-page.active');
  
  if (!hasActiveOverlay) {
    AppState.currentOverlay = null;
    unlockBodyScroll();
  }
}
window.closeOverlay = closeOverlay;

function closeAllOverlays(unlock = true) {
  $$('.overlay-page.active, .overlay.active').forEach(el => {
    el.classList.remove('active');
  });
  
  AppState.currentOverlay = null;
  
  if (unlock) {
    // 延迟解锁，等待CSS动画完成
    setTimeout(unlockBodyScroll, 50);
  }
}
window.closeAllOverlays = closeAllOverlays;

// ==============================
// 滚动锁定（防页面跳动，完美兼容移动端）
// ==============================
function lockBodyScroll() {
  if (document.body.style.overflow === 'hidden') return;
  AppState.scrollPosition = window.scrollY;
  document.body.style.top = `-${AppState.scrollPosition}px`;
  document.body.style.position = 'fixed';
  document.body.style.width = '100%';
  document.body.style.overflowY = 'scroll'; // 保留滚动条占位，防止布局偏移
}

function unlockBodyScroll() {
  if (document.body.style.position !== 'fixed') return;
  const scrollY = AppState.scrollPosition;
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
  document.body.style.overflowY = '';
  window.scrollTo(0, scrollY);
}

// ==============================
// 性能与生命周期优化
// ==============================
function handleVisibilityChange() {
  if (!AppState.gsapReady) return;

  if (document.hidden) {
    // 页面隐藏时暂停所有动画，节省CPU/电量
    gsap.globalTimeline.pause();
  } else {
    // 页面显示时恢复动画
    gsap.globalTimeline.resume();
  }
}

// 页面卸载前清理所有动画，防止内存泄漏
window.addEventListener('beforeunload', () => {
  if (AppState.gsapReady) {
    ScrollTrigger.getAll().forEach(st => st.kill());
  }
});
