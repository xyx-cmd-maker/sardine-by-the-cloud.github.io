/**
 * 玉汝于城农产AI - 交互逻辑优化版
 * 优化点：状态互斥、事件委托、性能监听、内存安全
 */

// ==============================
// 全局状态管理（单例模式）
// ==============================
const AppState = {
  currentOverlay: null,
  isMenuOpen: false,
  scrollPosition: 0,
  gsapReady: typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined'
};

// ==============================
// 工具函数（性能优先）
// ==============================
const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

// 防抖函数（用于滚动）
const debounce = (func, wait) => {
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

// ==============================
// 初始化入口
// ==============================
document.addEventListener('DOMContentLoaded', () => {
  initCoreEvents();
  initNavbar();
  initAnimations();
  initPriceDisplay();
  initForms();
  
  // 页面可见性监听（省电/性能）
  document.addEventListener('visibilitychange', handleVisibilityChange);
});

// ==============================
// 核心事件系统（事件委托）
// ==============================
function initCoreEvents() {
  // 1. 全局点击委托（处理弹窗关闭、按钮点击）
  document.addEventListener('click', (e) => {
    const target = e.target;
    
    // 点击遮罩层关闭弹窗
    if (target.classList.contains('overlay')) {
      closeOverlay(target.id);
    }
    
    // 点击关闭按钮
    if (target.closest('.close-btn')) {
      const overlay = target.closest('.overlay, .overlay-page');
      if (overlay) closeOverlay(overlay.id);
    }
    
    // 点击打开弹窗的按钮
    const openTrigger = target.closest('[data-open-overlay]');
    if (openTrigger) {
      openOverlay(openTrigger.getAttribute('data-open-overlay'));
    }
  });

  // 2. 优化的滚动监听（Passive）
  window.addEventListener('scroll', updateActiveNav, { passive: true });
}

// ==============================
// 导航栏逻辑（状态互斥）
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
  
  // 菜单与弹窗互斥：菜单打开时，若有弹窗则关闭
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

const updateActiveNav = debounce(() => {
  const sections = $$('section[id]');
  const navLinks = $$('.nav-link');
  let current = '';

  const scrollPos = window.scrollY + 140; // 偏移量

  sections.forEach(section => {
    if (scrollPos >= section.offsetTop) {
      current = section.getAttribute('id');
    }
  });

  navLinks.forEach(link => {
    const isActive = link.getAttribute('href') === `#${current}`;
    link.classList.toggle('active', isActive);
  });
}, 10);

// ==============================
// 动画系统（GSAP + 降级方案）
// ==============================
function initAnimations() {
  if (!AppState.gsapReady) {
    console.log('GSAP not loaded: Running in lightweight mode');
    // 降级：移除所有透明度隐藏，直接显示
    $$('.service-card, .price-card, .case-card, .about-item').forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // 1. Hero 动画时间线
  const heroTL = gsap.timeline({ defaults: { ease: 'power3.out' } });
  heroTL
    .from('.hero-title', { opacity: 0, y: 60, duration: 1.1 })
    .from('.hero-slogan', { opacity: 0, y: 40, duration: 0.9 }, '-=0.6')
    .from('.hero-desc', { opacity: 0, y: 40, duration: 0.9 }, '-=0.6')
    .from('.hero-buttons', { opacity: 0, y: 40, duration: 0.9 }, '-=0.6')
    .from('.agri-icon', { opacity: 0, scale: 0.4, duration: 1.1, stagger: 0.25 }, '-=0.6');

  // 2. 通用卡片入场动画生成器
  const createScrollAnim = (selector, props = {}) => {
    $$(selector).forEach((el, i) => {
      gsap.from(el, {
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          toggleActions: 'play none none none',
          once: true // 只执行一次，性能优化
        },
        opacity: 0,
        duration: 0.7,
        ease: 'power2.out',
        delay: i * 0.08,
        ...props
      });
    });
  };

  createScrollAnim('.service-card', { y: 40 });
  createScrollAnim('.price-card', { y: 40 });
  createScrollAnim('.case-card', { y: 40 });
  createScrollAnim('.about-item', { x: -30 });
}

// ==============================
// 价格显示（无闪烁优先）
// ==============================
function initPriceDisplay() {
  const priceCards = $$('.price-card');
  
  priceCards.forEach(card => {
    const target = parseFloat(card.getAttribute('data-price'));
    const counter = $('.counter', card);
    if (!counter) return;

    // 1. 立即显示正确价格（防止闪烁）
    counter.innerText = target.toFixed(1);

    // 2. 如果有GSAP，做滚动动画
    if (AppState.gsapReady) {
      ScrollTrigger.create({
        trigger: card,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          // 动画开始前重置为0，此时用户视线刚进入，不会闪烁
          counter.innerText = '0';
          gsap.to(counter, {
            innerText: target,
            duration: 1.2,
            ease: 'power1.out',
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

// ==============================
// 表单系统
// ==============================
function initForms() {
  const contactForm = $('#contactForm');
  const formSuccess = $('#formSuccess');
  
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      // 简单的交互反馈
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
// 【核心】弹窗系统（与CSS Flex完美适配）
// ==============================
function openOverlay(overlayId) {
  if (!overlayId) return;
  
  // 先关闭所有，确保单例
  closeAllOverlays(false);
  
  const overlay = $('#' + overlayId);
  if (!overlay) return;

  // 关闭移动端菜单（互斥）
  if (AppState.isMenuOpen) toggleMobileMenu();

  overlay.classList.add('active');
  AppState.currentOverlay = overlayId;
  
  // 滚动到顶部（CSS Flex布局要求）
  overlay.scrollTop = 0;
  
  lockBodyScroll();
}

// 保留全局函数名供HTML onclick调用
window.openOverlay = openOverlay;
window.switchOverlay = openOverlay; // switch逻辑合并入open

function closeOverlay(overlayId) {
  const overlay = $('#' + overlayId);
  if (!overlay) return;

  overlay.classList.remove('active');
  
  // 检查是否还有活跃弹窗
  const hasActive = document.querySelector('.overlay.active, .overlay-page.active');
  
  if (!hasActive) {
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
    // 稍微延迟，等待CSS transition
    setTimeout(unlockBodyScroll, 50);
  }
}
window.closeAllOverlays = closeAllOverlays;

// ==============================
// 滚动锁定（防跳动）
// ==============================
function lockBodyScroll() {
  if (document.body.style.overflow === 'hidden') return;
  AppState.scrollPosition = window.scrollY;
  document.body.style.top = `-${AppState.scrollPosition}px`;
  document.body.style.position = 'fixed';
  document.body.style.width = '100%';
  document.body.style.overflowY = 'scroll'; // 保持滚动条占位
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
// 性能与生命周期
// ==============================
function handleVisibilityChange() {
  if (!AppState.gsapReady) return;

  if (document.hidden) {
    // 页面隐藏时暂停所有动画
    gsap.globalTimeline.pause();
  } else {
    // 页面显示时恢复
    gsap.globalTimeline.resume();
  }
}

// 清理函数（防止SPA或热重载内存泄漏）
window.addEventListener('beforeunload', () => {
  if (AppState.gsapReady) {
    ScrollTrigger.getAll().forEach(st => st.kill());
  }
});
