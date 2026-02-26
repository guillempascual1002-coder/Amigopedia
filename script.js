// drag threshold: minimum distance (pixels) before drag activates
const DRAG_THRESHOLD = 6;

// collection state: track quantities per card number in each group
const collection = {
    "black-angus": {},
    "fuck-quesadilla": {},
    "blip-city": {},
    "helldivers": {},
    "pym": {},
    "otros": {}
};

// all card filenames that exist in images/
// this is the single source of truth for available cards
// only add filenames if the corresponding image file actually exists
const allAvailableCards = [
    "black-angus-01.png",
    "black-angus-02.png",
    "black-angus-03.png",
    "black-angus-04.png",
    "black-angus-05.png",
    "black-angus-06.png",
    "fuck-quesadilla-01.png",
    "fuck-quesadilla-02.png",
    "fuck-quesadilla-03.png",
    "fuck-quesadilla-04.png",
    "fuck-quesadilla-05.png",
    "fuck-quesadilla-09.png",
    "blip-city-01.png",
    // add more existing card filenames here
];

// helper: ensure card record exists
function ensureCardRecord(group, num) {
    if (!collection[group]) collection[group] = {};
    if (!collection[group][num]) {
        collection[group][num] = { quantity: 0, wins: 0 };
    }
    return collection[group][num];
}

// helper to count unique collected cards across all groups
function getUniqueCollectedCount() {
    return Object.values(collection).reduce((sum, group) => {
        return sum + Object.keys(group || {}).length;
    }, 0);
}

// helper: shuffle array in place using Fisher-Yates
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// get list of cards not yet collected (unique check)
function getRemainingCards() {
    return allAvailableCards.filter(card => {
        const group = parseGroup(card);
        const num = parseSlotNumber(card);
        const groupMap = collection[group];
        return !(groupMap && groupMap[num]);
    });
}

// duplicates allowed: envelope remains usable
function hasRemainingCards() {
    return true;
}

// total slots per group (constant)
const groupTotals = {
    "black-angus": 10,
    "fuck-quesadilla": 15,
    "blip-city": 4,
    "helldivers": 14,
    "pym": 21,
    "otros": 8
};

// initialization after DOM loads
window.addEventListener('DOMContentLoaded', init);

function init() {
    const accordion = document.getElementById('accordion');

    // create each group section
    Object.keys(groupTotals).forEach(key => {
        const section = document.createElement('section');
        section.className = 'group';
        section.dataset.group = key;

        const header = document.createElement('div');
        header.className = 'group-header';
        header.textContent = humanize(key);
        // assign random delay and slight variation in duration so headers drift independently
        header.style.animationDelay = Math.random() * 5 + 's';
        header.style.animationDuration = (6 + Math.random() * 4) + 's';

        const counter = document.createElement('span');
        counter.className = 'counter';
        header.appendChild(counter);

        header.addEventListener('click', () => {
            section.classList.toggle('open');
            updateEnvelopeVisibilityForAlbum();
            updateDisplayZoneVisibility();
        });

        section.appendChild(header);

        const panel = document.createElement('div');
        panel.className = 'group-panel';

        const grid = document.createElement('div');
        grid.className = 'card-grid';

        // create empty slots numbered 1..total
        for (let i = 1; i <= groupTotals[key]; i++) {
            const slot = document.createElement('div');
            slot.className = 'card-slot';
            slot.dataset.group = key;
            slot.dataset.slot = i;
            grid.appendChild(slot);
        }
        panel.appendChild(grid);
        section.appendChild(panel);
        accordion.appendChild(section);

        updateCounter(key);
    });

    loadCollection();
    renderCollectionToDom();
    updateAllCounters();

    setupModal();
    setupEnvelope();
    setupDisplayZone();
    updateEnvelopeState();
    updateEnvelopeVisibilityForAlbum();
    updateDisplayZoneVisibility();
}

// convert key to display name
function humanize(key) {
    return key.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// update the counter in a section header based on collection state
function updateCounter(key) {
    const count = collection[key] ? Object.keys(collection[key]).length : 0;
    const total = groupTotals[key] || 0;
    const counterEl = document.querySelector(`.group[data-group="${key}"] .counter`);
    if (counterEl) counterEl.textContent = `${count}/${total}`;
}

function updateAllCounters() {
    Object.keys(groupTotals).forEach(updateCounter);
}

// parse group portion of filename
function parseGroup(filename) {
    const base = filename.replace(/\.[^.]+$/, '');
    const parts = base.split('-');
    if (parts.length < 2) return '';
    parts.pop(); // drop numeric part
    return parts.join('-');
}

// parse numeric slot from filename
function parseSlotNumber(filename) {
    const base = filename.replace(/\.[^.]+$/, '');
    const parts = base.split('-');
    const numPart = parts[parts.length - 1];
    const num = parseInt(numPart, 10);
    return isNaN(num) ? null : num;
}

function buildFilename(group, num) {
    return `${group}-${String(num).padStart(2, '0')}.png`;
}

function getCardInfoFromImg(img) {
    const name = img.dataset.filename || img.alt || '';
    let filename = name || '';
    if (!filename && img.src) {
        filename = img.src.split('/').pop().split('\\').pop();
    }
    const group = parseGroup(filename);
    const num = parseSlotNumber(filename);
    return { group, num, filename };
}

// add a single card file to its exact slot if not already present
function addCard(filename) {
    const group = parseGroup(filename);
    const num = parseSlotNumber(filename);
    if (!group || num == null) return;
    const groupMap = collection[group];
    if (!groupMap) return;
    const record = ensureCardRecord(group, num);
    const hadCard = record.quantity > 0;
    record.quantity += 1;
    const selector = `.card-slot[data-group="${group}"][data-slot="${num}"]`;
    const slot = document.querySelector(selector);
    if (slot && !slot.querySelector('img')) {
        const img = document.createElement('img');
        img.src = "images/" + filename;
        console.log('Loading card from:', img.src);
        img.alt = filename;
        img.dataset.filename = filename;
        img.addEventListener('click', () => openModal(img.src, img.alt));
        enableCardDrag(img);
        slot.appendChild(img);
        // mark slot as containing a card so UI effects (gloss) only apply when present
        slot.classList.add('has-card');
    }
    updateCounter(group);
    updateEnvelopeState();
    saveCollection();
}

function placeCardInSlot(group, num, filename) {
    const selector = `.card-slot[data-group="${group}"][data-slot="${num}"]`;
    const slot = document.querySelector(selector);
    if (!slot || slot.querySelector('img')) return;
    const img = document.createElement('img');
    img.src = "images/" + filename;
    img.alt = filename;
    img.dataset.filename = filename;
    img.addEventListener('click', () => openModal(img.src, img.alt));
    enableCardDrag(img);
    slot.appendChild(img);
    slot.classList.add('has-card');
}

// utility: external code can call to add multiple cards
function addImages(filenames) {
    filenames.forEach(addCard);
}

window.addImages = addImages;

// drag interaction for album cards ----------------------------------------
// threshold-based drag: requires minimum movement before activating
// uses transform translate for smooth physics animations
function enableCardDrag(img) {
    let isPressed = false;      // mouse button down
    let isDragging = false;     // threshold exceeded, dragging active
    let wasDragging = false;    // used to suppress click event after drag
    let startX = 0;             // initial mouse position
    let startY = 0;
    let currentX = 0;           // current mouse position
    let currentY = 0;
    let lastX = 0;              // last position (for velocity)
    let lastY = 0;
    let velocityX = 0;          // velocity for tilt effect
    let velocityY = 0;
    let translationX = 0;       // current translation offset
    let translationY = 0;
    let offsetX = 0;            // pointer offset from element left
    let offsetY = 0;            // pointer offset from element top

    // Block all click events on album cards
    img.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    });

    // Ensure pointer events work on all devices
    img.style.touchAction = 'none';

    // handle pointer move
    const handlePointerMove = (e) => {
        if (!isPressed) return;
        currentX = e.clientX;
        currentY = e.clientY;
        if (!isDragging) {
            const dx = currentX - startX;
            const dy = currentY - startY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > DRAG_THRESHOLD) {
                isDragging = true;
                wasDragging = true;
                img.classList.add('dragging');
                img.style.pointerEvents = 'auto';
            } else {
                return;
            }
        }
        velocityX = currentX - lastX;
        velocityY = currentY - lastY;
        lastX = currentX;
        lastY = currentY;
        translationX = currentX - startX;
        translationY = currentY - startY;
        const tilt = Math.max(-6, Math.min(6, velocityX * 0.2));
        const shadowIntensity = Math.min(0.3, Math.abs(velocityX) * 0.01 + 0.15);
        const shadowOffset = Math.abs(velocityX) * 0.5;
        img.style.transform = `translate(${translationX}px, ${translationY}px)`;
        img.style.boxShadow = `${shadowOffset}px ${20 + shadowOffset}px ${40 + shadowOffset}px rgba(0,0,0,${shadowIntensity})`;
    };

    // handle pointer up (stops drag immediately)
    const handleEndDrag = (e) => {
        if (!isPressed) return;
        isPressed = false;
        img.releasePointerCapture(e.pointerId);
        window.removeEventListener('pointermove', handlePointerMove);
        // if threshold was never exceeded, just a click - return without animation
        if (!isDragging) {
            img.classList.remove('dragging', 'returning');
            img.style.position = '';
            img.style.margin = '';
            img.style.width = '';
            img.style.height = '';
            img.style.left = '';
            img.style.top = '';
            img.style.zIndex = '';
            img.style.pointerEvents = '';
            img.style.transform = '';
            img.style.boxShadow = '';
            return;
        }
        // check if we landed in the display zone (desktop only); if so move card and stop here
        if (tryPlaceInDisplayZone(img, currentX, currentY)) {
            wasDragging = true;
            isDragging = false;
            return;
        }

        // check if we landed in the battle zone; if so clone and stop here
        if (tryPlaceInBattleZone(img, currentX, currentY)) {
            wasDragging = true;
            isDragging = false;
            img.classList.remove('dragging');
            img.style.position = '';
            img.style.margin = '';
            img.style.width = '';
            img.style.height = '';
            img.style.left = '';
            img.style.top = '';
            img.style.zIndex = '';
            img.style.pointerEvents = '';
            img.style.transform = '';
            img.style.boxShadow = '';
            return;
        }
        isDragging = false;
        img.classList.remove('dragging');
        img.classList.add('returning');
        const inertiaX = translationX + (velocityX * 8);
        const inertiaY = translationY + (velocityY * 8);
        img.style.transform = `translate(${inertiaX}px, ${inertiaY}px)`;
        img.style.boxShadow = '0 0 0 rgba(0,0,0,0)';
        setTimeout(() => {
            img.style.transform = 'translate(0, 0)';
            setTimeout(() => {
                img.classList.remove('returning');
                img.style.position = '';
                img.style.margin = '';
                img.style.width = '';
                img.style.height = '';
                img.style.left = '';
                img.style.top = '';
                img.style.zIndex = '';
                img.style.pointerEvents = '';
                img.style.transform = '';
                img.style.boxShadow = '';
            }, 500);
        }, 50);
    };

    // pointerdown: store position, enable listeners, but don't drag yet
    img.addEventListener('pointerdown', (e) => {
        if (battleActive) return;
        if (img.dataset.displayLocked === 'true') return;
        wasDragging = false;
        e.preventDefault();
        const rect = img.getBoundingClientRect();
        const startLeft = rect.left;
        const startTop = rect.top;

        // lock element to its visual position before any transform resets
        img.style.transform = 'none';
        img.style.position = 'fixed';
        img.style.margin = '0';
        img.style.left = `${startLeft}px`;
        img.style.top = `${startTop}px`;
        img.style.width = rect.width + 'px';
        img.style.height = rect.height + 'px';

        // compute pointer offset relative to element
        offsetX = e.clientX - startLeft;
        offsetY = e.clientY - startTop;

        img.setPointerCapture(e.pointerId);
        isPressed = true;
        isDragging = false;
        startX = e.clientX;
        startY = e.clientY;
        currentX = e.clientX;
        currentY = e.clientY;
        lastX = e.clientX;
        lastY = e.clientY;
        velocityX = 0;
        velocityY = 0;
        translationX = 0;
        translationY = 0;
        window.addEventListener('pointermove', handlePointerMove);
    });
    window.addEventListener('pointerup', handleEndDrag);
}


let modal, modalImg, modalClose;
function setupModal() {
    modal = document.getElementById('modal');
    modalImg = document.getElementById('modal-img');
    modalClose = document.getElementById('modal-close');

    modalClose.addEventListener('click', () => closeModal());
    modal.addEventListener('click', e => {
        if (e.target === modal) closeModal();
    });

    // ESC key should dismiss while modal is visible
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && modal.classList.contains('visible')) {
            closeModal();
        }
    });
}

// Modal overlay logic for enlarged card view
let cardOverlay = null;
let cardOverlayImg = null;

function openModal(src, alt) {
    // Remove any existing overlay
    closeModal();
    // Create overlay
    cardOverlay = document.createElement('div');
    cardOverlay.className = 'card-overlay';
    cardOverlay.style.position = 'fixed';
    cardOverlay.style.inset = '0';
    cardOverlay.style.background = 'rgba(0,0,0,0.3)';
    cardOverlay.style.display = 'flex';
    cardOverlay.style.alignItems = 'center';
    cardOverlay.style.justifyContent = 'center';
    cardOverlay.style.zIndex = '9999';
    // Create enlarged card image
    cardOverlayImg = document.createElement('img');
    cardOverlayImg.src = src;
    cardOverlayImg.alt = alt;
    cardOverlayImg.style.maxWidth = '90vw';
    cardOverlayImg.style.maxHeight = '90vh';
    cardOverlayImg.style.boxShadow = '0 8px 32px rgba(0,0,0,0.25)';
    cardOverlayImg.style.borderRadius = '12px';
    cardOverlayImg.style.background = '#fff';
    cardOverlayImg.style.display = 'block';
    cardOverlay.appendChild(cardOverlayImg);
    // Overlay click closes modal ONLY if click is on overlay itself
    cardOverlay.addEventListener('click', function(e) {
        if (e.target === cardOverlay) {
            closeModal();
        }
    });
    // Prevent scroll while modal is open
    document.body.style.overflow = 'hidden';
    document.body.appendChild(cardOverlay);
}

function closeModal() {
    if (cardOverlay) {
        cardOverlay.remove();
        cardOverlay = null;
        cardOverlayImg = null;
    }
    // Restore scroll
    document.body.style.overflow = '';
    // Re-enable interactions if needed (drag/battle logic is already handled elsewhere)
}

// function closeModal() {
//     if (!modal.classList.contains('visible')) return;
//     // trigger reverse animation by removing the visible class
//     modal.classList.remove('visible');

//     // once the overlay fade‑out has completed, clear the image
//     const onTransitionEnd = (e) => {
//         if (e.target === modal && e.propertyName === 'opacity' && !modal.classList.contains('visible')) {
//             modalImg.src = '';
//             modalImg.alt = '';
//             modal.removeEventListener('transitionend', onTransitionEnd);
//         }
//     };
//     modal.addEventListener('transitionend', onTransitionEnd);
// }

// envelope state machine -------------------------------------------------
let envelopeState = 'idle';
const displayState = {
    card: null,
    originalParent: null,
    originalNextSibling: null,
    wrapper: null,
    reflection: null,
    cleanup: null
};

// battle arena globals ----------------------------------------------------
let battleActive = false;
let isFighting = false;
const battleController = {
    leftImg: null,
    rightImg: null,
    async start() {
        battleActive = true;
        isFighting = true;
        await showFightText();
        const turns = 4 + Math.floor(Math.random() * 2);
        let attackerLeft = true;
        for (let i = 0; i < turns; i++) {
            const attacker = attackerLeft ? this.leftImg : this.rightImg;
            const defender = attackerLeft ? this.rightImg : this.leftImg;
            await attackAnimation(attacker, attackerLeft ? 40 : -40);
            await shakeAnimation(defender);
            await wait(1000 + Math.random() * 1000);
            attackerLeft = !attackerLeft;
        }
        await this.declareWinner();
    },
    async declareWinner() {
        const winnerIsLeft = Math.random() < 0.5;
        const winner = winnerIsLeft ? this.leftImg : this.rightImg;
        const loser = winnerIsLeft ? this.rightImg : this.leftImg;
        await loseAnimation(loser);
        await winAnimation(winner);
        await wait(600); // victory animation duration
        winner.classList.add('battle-lose'); // fade out winner
        await wait(400); // pause before reset
        // Track a battle victory for the winning card and persist the collection.
        recordBattleWinFromImage(winner);
        this.resetBattle();
    },
    resetBattle() {
        const zone = document.getElementById('battle-zone');
        zone.querySelectorAll('.battle-slot').forEach(slot => {
            slot.innerHTML = '';
        });
        this.leftImg = null;
        this.rightImg = null;
        isFighting = false;
        battleActive = false;
        // Drag is automatically re-enabled by flag
    }
};

function wait(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function showFightText() {
    const txt = document.querySelector('#battle-zone .fight-text');
    txt.classList.add('show');
    return wait(300).then(() => txt.classList.remove('show'));
}

function attackAnimation(el, offset) {
    return new Promise(resolve => {
        el.classList.add('battle-attack');
        el.style.transform = `translateX(${offset}px)`;
        const cleanup = () => {
            el.removeEventListener('transitionend', cleanup);
            // return to original position
            el.style.transform = '';
            el.addEventListener('transitionend', () => {
                el.classList.remove('battle-attack');
                resolve();
            }, { once: true });
        };
        el.addEventListener('transitionend', cleanup, { once: true });
    });
}

function shakeAnimation(el) {
    return new Promise(resolve => {
        el.classList.add('battle-shake');
        el.addEventListener('animationend', () => {
            el.classList.remove('battle-shake');
            resolve();
        }, { once: true });
    });
}
        function displayStateCleanupOnResize() {
        }
function winAnimation(el) {
    return new Promise(resolve => {
        el.classList.add('battle-jump');
        // animation runs twice automatically via CSS
        el.addEventListener('animationend', () => {
            el.classList.remove('battle-jump');
            resolve();
        }, { once: true });
    });
}

function loseAnimation(el) {
    return new Promise(resolve => {
        el.classList.add('battle-lose');
        el.addEventListener('transitionend', () => resolve(), { once: true });
    });
}

function pointInRect(x, y, rect) {
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function tryPlaceInDisplayZone(img, x, y) {
    if (!window.matchMedia || !window.matchMedia('(min-width: 1024px)').matches) return false;
    const zone = document.getElementById('display-zone');
    const container = zone ? zone.querySelector('.display-card-container') : null;
    if (!zone || !container || !zone.classList.contains('visible')) return false;

    const rect = zone.getBoundingClientRect();
    if (!pointInRect(x, y, rect)) return false;

    if (displayState.card && displayState.card !== img) {
        closeDisplayZone();
    }

    displayState.originalParent = img.parentNode;
    displayState.originalNextSibling = img.nextSibling;
    displayState.card = img;

    if (img.parentNode) {
        img.parentNode.removeChild(img);
    }
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'display-card-wrapper enter active';
    const reflection = document.createElement('div');
    reflection.className = 'card-reflection';
    wrapper.appendChild(img);
    wrapper.appendChild(reflection);
    container.appendChild(wrapper);

    setupDisplayCardEffects(wrapper, reflection);
    displayState.wrapper = wrapper;
    displayState.reflection = reflection;

    img.classList.remove('dragging', 'returning');
    img.style.position = '';
    img.style.margin = '';
    img.style.width = '';
    img.style.height = '';
    img.style.left = '';
    img.style.top = '';
    img.style.zIndex = '';
    img.style.pointerEvents = 'auto';
    img.style.transform = '';
    img.style.boxShadow = '';
    img.dataset.displayLocked = 'true';

    zone.classList.add('active', 'visible');
    zone.classList.add('has-card');
    updateDisplayStatsFromImage(img);
    return true;
}

function tryPlaceInBattleZone(img, x, y) {
    const leftSlot = document.querySelector('#battle-zone .battle-slot.left');
    const rightSlot = document.querySelector('#battle-zone .battle-slot.right');
    const leftRect = leftSlot.getBoundingClientRect();
    const rightRect = rightSlot.getBoundingClientRect();

    if (pointInRect(x, y, leftRect) && !battleController.leftImg) {
        const clone = img.cloneNode(true);
        // remove any inline style left from dragging/resize
        clone.removeAttribute('style');
        clone.classList.remove('dragging', 'returning');
        clone.style.pointerEvents = 'none';
        clone.style.position = 'relative';
        leftSlot.appendChild(clone);
        battleController.leftImg = clone;
        checkBattleStart();
        return true;
    }
    if (pointInRect(x, y, rightRect) && !battleController.rightImg) {
        const clone = img.cloneNode(true);
        clone.removeAttribute('style');
        clone.classList.remove('dragging', 'returning');
        clone.style.pointerEvents = 'none';
        clone.style.position = 'relative';
        rightSlot.appendChild(clone);
        battleController.rightImg = clone;
        checkBattleStart();
        return true;
    }
    return false;
}

function checkBattleStart() {
    if (battleController.leftImg && battleController.rightImg && !battleActive) {
        battleController.start();
    }
}

// hook modal close to clear battle zone when fight is done
const originalCloseModal = closeModal;
function closeModal() {
    originalCloseModal();
    // after modal fully hidden, clear zone
    const handler = (e) => {
        if (e.target === modal && e.propertyName === 'opacity' && !modal.classList.contains('visible')) {
            battleController.clear();
            modal.removeEventListener('transitionend', handler);
        }
    };
    modal.addEventListener('transitionend', handler);
}


function setupEnvelope() {
    const env = document.getElementById('envelope');
    if (!env) return;
    
    // initialize to idle state with idle animation
    env.classList.add('idle');
    
    env.addEventListener('click', () => {
        // ignore clicks if not in idle state
        if (envelopeState !== 'idle') return;
        if (!hasRemainingCards()) return;
        
        handleEnvelopeClick();
    });
}

function updateEnvelopeVisibilityForAlbum() {
    const container = document.querySelector('.envelope-container');
    const envelope = document.getElementById('envelope');
    const battleZone = document.getElementById('battle-zone');
    const anyOpen = !!document.querySelector('.group.open');
    if (!container || !envelope) return;
    if (anyOpen) {
        container.classList.add('hidden-during-album');
        envelope.style.pointerEvents = 'none';
        if (battleZone) battleZone.classList.remove('hidden-when-closed');
    } else {
        container.classList.remove('hidden-during-album');
        updateEnvelopeState();
        if (battleZone) battleZone.classList.add('hidden-when-closed');
    }
}

function setupDisplayZone() {
    const zone = document.getElementById('display-zone');
    if (!zone) return;
    const closeBtn = zone.querySelector('.display-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            closeDisplayZone();
            updateDisplayZoneVisibility();
        });
    }
}

function closeDisplayZone() {
    const zone = document.getElementById('display-zone');
    const container = zone ? zone.querySelector('.display-card-container') : null;
    if (displayState.cleanup) {
        displayState.cleanup();
        displayState.cleanup = null;
    }
    if (displayState.card && displayState.originalParent) {
        const card = displayState.card;
        card.dataset.displayLocked = '';
        card.style.pointerEvents = '';
        card.style.position = '';
        card.style.margin = '';
        card.style.width = '';
        card.style.height = '';
        card.style.left = '';
        card.style.top = '';
        card.style.zIndex = '';
        card.style.transform = '';
        card.style.boxShadow = '';
        displayState.originalParent.insertBefore(card, displayState.originalNextSibling);
    }
    if (container) container.innerHTML = '';
    displayState.card = null;
    displayState.originalParent = null;
    displayState.originalNextSibling = null;
    displayState.wrapper = null;
    displayState.reflection = null;
    clearDisplayStats();
    if (zone) {
        zone.classList.remove('active');
        zone.classList.remove('has-card');
        // visibility will be handled by updateDisplayZoneVisibility
    }
}

function updateDisplayZoneVisibility() {
    const zone = document.getElementById('display-zone');
    if (!zone) return;
    const isDesktop = window.matchMedia && window.matchMedia('(min-width: 1024px)').matches;
    const anyOpen = !!document.querySelector('.group.open');
    if (!isDesktop || !anyOpen) {
        closeDisplayZone();
        zone.classList.remove('visible');
        return;
    }
    zone.classList.add('visible');
}

function setupDisplayCardEffects(wrapper, reflection) {
    const baseTransform = 'perspective(800px) rotateX(0deg) rotateY(0deg)';
    const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
    wrapper.style.transform = baseTransform;

    const handleMove = (e) => {
        const rect = wrapper.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const rotateX = clamp((e.clientY - centerY) / 20, -6, 6);
        const rotateY = clamp((centerX - e.clientX) / 20, -6, 6);
        wrapper.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

        const percentX = ((e.clientX - rect.left) / rect.width) * 100;
        const percentY = ((e.clientY - rect.top) / rect.height) * 100;
        reflection.style.background = `radial-gradient(circle at ${percentX}% ${percentY}%, rgba(255,255,255,0.45), rgba(255,255,255,0.15) 30%, transparent 60%)`;
        wrapper.classList.add('active');
    };

    const handleLeave = () => {
        wrapper.style.transform = baseTransform;
        wrapper.classList.remove('active');
    };

    const handleAnimEnd = () => {
        wrapper.classList.remove('enter');
    };

    wrapper.addEventListener('mousemove', handleMove);
    wrapper.addEventListener('mouseleave', handleLeave);
    wrapper.addEventListener('animationend', handleAnimEnd, { once: true });

    displayState.cleanup = () => {
        wrapper.removeEventListener('mousemove', handleMove);
        wrapper.removeEventListener('mouseleave', handleLeave);
    };
}

function updateDisplayStatsFromImage(img) {
    const zone = document.getElementById('display-zone');
    if (!zone) return;
    const albumEl = zone.querySelector('.stat-album');
    const winsEl = zone.querySelector('.stat-wins');
    const copiesEl = zone.querySelector('.stat-copies');
    if (!albumEl || !winsEl || !copiesEl) return;

    const info = getCardInfoFromImg(img);
    if (!info.group || info.num == null) {
        albumEl.textContent = '';
        winsEl.textContent = '';
        copiesEl.textContent = '';
        return;
    }

    const record = (collection[info.group] && collection[info.group][info.num]) || { quantity: 0, wins: 0 };
    const albumNumber = String(info.num).padStart(2, '0');
    albumEl.textContent = `Número de álbum: ${albumNumber}`;
    winsEl.textContent = `Victorias: ${record.wins || 0}`;
    copiesEl.textContent = `Copias: ${record.quantity || 0}`;
}

function clearDisplayStats() {
    const zone = document.getElementById('display-zone');
    if (!zone) return;
    const fields = zone.querySelectorAll('.stat-album, .stat-wins, .stat-copies');
    fields.forEach(el => {
        el.textContent = '';
    });
}

function recordBattleWinFromImage(img) {
    const info = getCardInfoFromImg(img);
    if (!info.group || info.num == null) return;
    const record = ensureCardRecord(info.group, info.num);
    record.wins += 1;
    saveCollection();
}

function updateEnvelopeState() {
    const envelope = document.getElementById('envelope');
    if (!envelope) return;

    if (!hasRemainingCards()) {
        envelope.classList.add('disabled');
        envelope.style.pointerEvents = 'none';
        envelope.style.display = 'none';
        const text = document.querySelector('.envelope-text') || document.querySelector('.envelope-note');
        if (text) text.textContent = 'no hay mas amigos por el momento';
    } else {
        envelope.classList.remove('disabled');
        envelope.style.pointerEvents = 'auto';
        envelope.style.display = 'block';
    }
}

function handleEnvelopeClick() {
    const env = document.getElementById('envelope');
    envelopeState = 'opening';
    
    // stop idle animations
    env.classList.remove('idle');
    
    // 1. press effect: scale(0.95) for 120ms
    env.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
        // change src to envelope-open.gif
        env.src = 'images/envelope-open.gif';
        env.style.transform = '';
        
        // after 200ms: trigger card reveal
        setTimeout(() => {
            openEnvelope();
            
            // after 400ms: animate downward and fade out
            setTimeout(() => {
                env.classList.add('hidden-envelope');
                
                // after animation completes (400ms)
                setTimeout(() => {
                    envelopeState = 'hidden';
                }, 400);
            }, 200);
        }, 200);
    }, 120);
}

// pack reveal logic ------------------------------------------------------
// overlay shows a stacked deck; click top card to reveal sequentially
function showPackOverlay(filenames) {
    const overlay = document.createElement('div');
    overlay.className = 'overlay stack-overlay';

    const stack = document.createElement('div');
    stack.className = 'card-stack';

    const isMobile = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;

    filenames.forEach((name, index) => {
        const depth = filenames.length - 1 - index;
        const offsetY = depth * 4;
        const scale = 1 - depth * 0.02;
        const img = document.createElement('img');
        img.className = 'stack-card';
        img.src = "images/" + name;
        console.log('Loading card from:', img.src);
        img.alt = name;
        img.dataset.cardName = name;
        const baseTransform = `translate(-50%, -50%) translateY(${offsetY}px) scale(${scale})`;
        img.dataset.baseTransform = baseTransform;
        img.style.transform = baseTransform;
        img.style.zIndex = String(200 + index);
        stack.appendChild(img);
    });

    overlay.appendChild(stack);
    document.body.appendChild(overlay);

    const closeOverlay = () => {
        overlay.classList.remove('visible');
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
            returnEnvelope();
        }, 300);
    };

    const revealNext = () => {
        const topCard = stack.lastElementChild;
        if (!topCard) {
            closeOverlay();
            return;
        }

        Array.from(stack.children).forEach(card => {
            card.style.pointerEvents = card === topCard ? 'auto' : 'none';
        });

        const handleReveal = () => {
            topCard.classList.add('stack-card-revealing');
            topCard.style.transform = `${topCard.dataset.baseTransform} translateX(300px) rotate(8deg)`;
            topCard.style.opacity = '0';
            topCard.addEventListener('transitionend', () => {
                addCard(topCard.dataset.cardName);
                if (topCard.parentNode === stack) {
                    stack.removeChild(topCard);
                }
                revealNext();
            }, { once: true });
        };

        const detachHandlers = () => {
            topCard.removeEventListener('click', clickHandler);
            topCard.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('pointerup', onPointerUp);
        };

        const clickHandler = () => {
            detachHandlers();
            handleReveal();
        };

        let startX = 0;
        let startY = 0;
        const SWIPE_THRESHOLD = 50;

        const onPointerDown = (e) => {
            startX = e.clientX;
            startY = e.clientY;
            window.addEventListener('pointerup', onPointerUp, { once: true });
        };

        const onPointerUp = (e) => {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
                detachHandlers();
                handleReveal();
            }
        };

        topCard.addEventListener('click', clickHandler);
        if (isMobile) {
            topCard.addEventListener('pointerdown', onPointerDown);
        }
    };

    // trigger fade-in animation
    requestAnimationFrame(() => overlay.classList.add('visible'));

    revealNext();
}


function returnEnvelope() {
    const env = document.getElementById('envelope');
    envelopeState = 'returning';
    
    // reset envelope position below viewport with closed image
    env.src = 'images/envelope-closed.gif';
    env.classList.add('hidden-envelope');
    
    // force reflow to ensure transition applies
    env.offsetHeight;
    
    // animate upward into view
    env.classList.remove('hidden-envelope');
    
    // after animation completes (400ms)
    setTimeout(() => {
        // restart idle animation
        env.classList.add('idle');
        envelopeState = 'idle';
    }, 400);
}

function openEnvelope() {
    // allow duplicates: draw from all available cards
    const shuffled = shuffleArray([...allAvailableCards]);
    const picked = shuffled.slice(0, 5);
    showPackOverlay(picked);
}

function renderCollectionToDom() {
    Object.entries(collection).forEach(([group, groupMap]) => {
        Object.keys(groupMap || {}).forEach(numKey => {
            const num = parseInt(numKey, 10);
            const record = groupMap[num];
            if (record && record.quantity > 0) {
                const filename = buildFilename(group, num);
                placeCardInSlot(group, num, filename);
            }
        });
    });
}

function saveCollection() {
    try {
        localStorage.setItem('collection', JSON.stringify(collection));
    } catch (e) {
        console.warn('Failed to save collection', e);
    }
}

function loadCollection() {
    try {
        const raw = localStorage.getItem('collection');
        if (!raw) return;
        const data = JSON.parse(raw);
        Object.keys(collection).forEach(group => {
            if (data[group]) {
                collection[group] = data[group];
            }
        });
    } catch (e) {
        console.warn('Failed to load collection', e);
    }
}

