import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initGlobalImageCache } from './services/imageCacheService';

// 초고속 로컬 이미지 캐싱 시스템 가동 (몬스터, 아이템, 전투 프레임 전체 자동 고속화)
if (typeof window !== 'undefined') {
  initGlobalImageCache();
}

// 브라우저의 무해한 ResizeObserver 순환 알림 경고 필터링
if (typeof window !== 'undefined') {
  const originalErrorHandler = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    if (typeof message === 'string' && (message.includes('ResizeObserver') || message.includes('undelivered notifications'))) {
      return true;
    }
    if (originalErrorHandler) {
      return originalErrorHandler(message, source, lineno, colno, error);
    }
    return false;
  };

  window.addEventListener('error', (e) => {
    if (e.message && (e.message.includes('ResizeObserver') || e.message.includes('undelivered notifications'))) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);