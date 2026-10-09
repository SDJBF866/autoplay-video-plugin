// ==UserScript==
// @name         Universal AutoPlay Video
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Automatically plays HTML5 video elements on pages with muted autoplay support.
// @author       Copilot
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const config = {
        // 设为 true 时，尝试静音自动播放；浏览器通常允许静音自动播放
        muteBeforePlay: true,
        // 自动播放的最大重试次数
        maxRetries: 20,
        // 每次重试的间隔（毫秒）
        retryDelay: 500,
        // 是否在页面中寻找所有 video 元素并播放
        autoplayAll: true,
        // 是否忽略用户暂停状态（仅在需要时）
        ignoreUserPaused: true,
    };

    function log(...args) {
        console.log('[Universal AutoPlay Video]', ...args);
    }

    function isElementPlayable(video) {
        if (!(video instanceof HTMLMediaElement)) return false;
        if (video.dataset.autoplayHandled === 'true') return false;

        const style = window.getComputedStyle(video);
        if (style.display === 'none') return false;

        return true;
    }

    function tryPlayVideo(video, retryCount = 0) {
        if (!isElementPlayable(video)) return;

        try {
            if (config.muteBeforePlay && !video.muted) {
                video.muted = true;
            }

            if (config.ignoreUserPaused) {
                video.pause();
            }

            const playPromise = video.play();

            if (playPromise && typeof playPromise.then === 'function') {
                playPromise
                    .then(() => {
                        video.dataset.autoplayHandled = 'true';
                        log('已自动播放:', video);
                    })
                    .catch((err) => {
                        if (retryCount < config.maxRetries) {
                            setTimeout(() => tryPlayVideo(video, retryCount + 1), config.retryDelay);
                        } else {
                            log('自动播放失败，已达到最大重试次数:', video, err);
                        }
                    });
            } else {
                video.dataset.autoplayHandled = 'true';
                log('已自动播放（同步模式）:', video);
            }
        } catch (err) {
            log('播放过程中发生错误:', err);
        }
    }

    function scanAndPlayVideos() {
        const videos = Array.from(document.querySelectorAll('video'));

        videos.forEach((video) => {
            if (!config.autoplayAll && video.dataset.autoplayHandled === 'true') return;
            tryPlayVideo(video, 0);
        });
    }

    function observeMutations() {
        const observer = new MutationObserver((mutations) => {
            let shouldScan = false;
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length) {
                    shouldScan = true;
                    break;
                }
                if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
                    shouldScan = true;
                    break;
                }
            }

            if (shouldScan) {
                scanAndPlayVideos();
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['src', 'poster', 'controls', 'autoplay'],
        });
    }

    function init() {
        log('脚本已加载，开始扫描视频元素...');
        scanAndPlayVideos();
        observeMutations();
    }

    // 页面已完成加载后开始执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
