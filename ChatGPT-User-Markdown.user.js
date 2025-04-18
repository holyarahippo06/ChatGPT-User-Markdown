// ==UserScript==
// @name         ChatGPT-User-Markdown
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Handles both existing and new messages reliably
// @author       Holy AraHippo
// @match        https://chatgpt.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    console.log("[Markdown Renderer] Script loaded");

    // Formatting function with extra safeguards
    function formatMessage(text) {
        if (!text) return text;
        try {
            return text
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/(?<!\*)\*(?!\*)([^*]+?)\*(?!\*)/g, '<em>$1</em>');
        } catch (e) {
            console.error("Formatting error:", e);
            return text;
        }
    }

    // Process a single message element
    function processMessageElement(element) {
        if (element.dataset.markdownProcessed) return;
        const original = element.innerHTML;
        const formatted = formatMessage(original);

        if (formatted !== original) {
            element.innerHTML = formatted;
            element.dataset.markdownProcessed = "true";
            console.log("Processed message:", element);
        }
    }

    // Main observer with multiple strategies
    function setupObservers() {
        // Strategy 1: Observe the entire document body
        const globalObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    // Handle both direct messages and nested cases
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.classList?.contains('whitespace-pre-wrap')) {
                            processMessageElement(node);
                        }
                        node.querySelectorAll?.('.whitespace-pre-wrap').forEach(processMessageElement);
                    }
                });
            });
        });

        globalObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Strategy 2: Periodic checker as backup
        setInterval(() => {
            document.querySelectorAll('.whitespace-pre-wrap:not([data-markdown-processed])')
                .forEach(processMessageElement);
        }, 2000);

        // Strategy 3: Observe send button clicks
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-testid="send-button"]')) {
                setTimeout(() => {
                    document.querySelectorAll('.whitespace-pre-wrap:not([data-markdown-processed])')
                        .forEach(processMessageElement);
                }, 1000);
            }
        });

        console.log("Observers activated");
    }

    // Initial processing and setup
    function initialize() {
        // Process existing messages
        document.querySelectorAll('.whitespace-pre-wrap').forEach(processMessageElement);

        // Setup observers
        setupObservers();

        // Special case for message edit events
        document.addEventListener('focusin', (e) => {
            if (e.target.classList?.contains('whitespace-pre-wrap')) {
                processMessageElement(e.target);
            }
        });
    }

    // Start with retry logic
    let attempts = 0;
    const maxAttempts = 10;
    const retry = () => {
        if (document.querySelector('.whitespace-pre-wrap') || attempts >= maxAttempts) {
            initialize();
        } else {
            attempts++;
            setTimeout(retry, 500);
        }
    };

    if (document.readyState === 'complete') {
        retry();
    } else {
        window.addEventListener('load', retry);
    }
})();
