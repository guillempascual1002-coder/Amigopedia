// drag threshold: minimum distance (pixels) before drag activates
const DRAG_THRESHOLD = 6;

// collection state: track which card numbers have been collected per group
const collection = {
    "black-angus": new Set(),
    "fuck-quesadilla": new Set(),
    "blip-city": new Set(),
    "helldivers": new Set(),
    "pym": new Set(),
    "otros": new Set()
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

// tracks which card filenames have been collected
const collectedCards = new Set();

// helper: shuffle array in place using Fisher-Yates
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// get list of cards not yet collected
function getRemainingCards() {
    return allAvailableCards.filter(card => !collectedCards.has(card));
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


    setupModal();
    setupEnvelope();
}

// convert key to display name
function humanize(key) {
    return key.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// update the counter in a section header based on collection state
function updateCounter(key) {
    const count = collection[key] ? collection[key].size : 0;
    const total = groupTotals[key] || 0;
    const counterEl = document.querySelector(`.group[data-group="${key}"] .counter`);
    if (counterEl) counterEl.textContent = `${count}/${total}`;
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

// add a single card file to its exact slot if not already present
function addCard(filename) {
    const group = parseGroup(filename);
    const num = parseSlotNumber(filename);
    if (!group || num == null) return;
    const set = collection[group];
    if (!set) return;
    if (set.has(num)) {
        console.log('already collected', filename);
        return;
    }
    set.add(num);
    collectedCards.add(filename);
    const selector = `.card-slot[data-group="${group}"][data-slot="${num}"]`;
    const slot = document.querySelector(selector);
    if (slot && !slot.querySelector('img')) {
        const img = document.createElement('img');
        img.src = "images/" + filename;
        console.log('Loading card from:', img.src);
        img.alt = filename;
        img.addEventListener('click', () => openModal(img.src, img.alt));
        enableCardDrag(img);
        slot.appendChild(img);
        // mark slot as containing a card so UI effects (gloss) only apply when present
        slot.classList.add('has-card');
    }
    updateCounter(group);
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
                img.style.position = 'fixed';
                img.style.margin = '0';
                const rect = img.getBoundingClientRect();
                img.style.width = rect.width + 'px';
                img.style.height = rect.height + 'px';
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
                img.style.pointerEvents = '';
                img.style.transform = '';
                img.style.boxShadow = '';
            }, 500);
        }, 50);
    };

    // pointerdown: store position, enable listeners, but don't drag yet
    img.addEventListener('pointerdown', (e) => {
        if (battleActive) return;
        wasDragging = false;
        e.preventDefault();
        img.setPointerCapture(e.pointerId);
        const rect = img.getBoundingClientRect();
        img.style.width = rect.width + 'px';
        img.style.height = rect.height + 'px';
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
        
        handleEnvelopeClick();
    });
}

function handleEnvelopeClick() {
    const env = document.getElementById('envelope');
    envelopeState = 'opening';
    
    // stop idle animations
    env.classList.remove('idle');
    
    // 1. press effect: scale(0.95) for 120ms
    env.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
        // change src to envelope-open.png
        env.src = 'images/envelope-open.png';
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
// overlay displays five cards in a simple centered row and assigns them on outside click
function showPackOverlay(filenames) {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';

    const container = document.createElement('div');
    container.className = 'pack-cards';

    filenames.forEach((name, idx) => {
        const img = document.createElement('img');
        img.className = 'pack-card';
        img.src = "images/" + name;
        console.log('Loading card from:', img.src);
        img.alt = name;
        img.style.transitionDelay = `${idx * 0.1}s`;
        container.appendChild(img);
    });

    overlay.appendChild(container);
    document.body.appendChild(overlay);

    // trigger fade-in animation
    requestAnimationFrame(() => overlay.classList.add('visible'));

    overlay.addEventListener('click', e => {
        if (e.target === overlay) {
            // assign each revealed card by filename
            filenames.forEach(fname => {
                addCard(fname);
            });
            // teardown
            overlay.classList.remove('visible');
            setTimeout(() => {
                document.body.removeChild(overlay);
                returnEnvelope();
            }, 300);
        }
    });
}


function returnEnvelope() {
    const env = document.getElementById('envelope');
    envelopeState = 'returning';
    
    // reset envelope position below viewport with closed image
    env.src = 'images/envelope-closed.png';
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
    // check if collection is complete
    if (collectedCards.size === allAvailableCards.length) {
        console.log('All cards collected');
        return;
    }
    // get cards not yet collected
    const remaining = getRemainingCards();
    if (remaining.length === 0) {
        return;
    }
    // shuffle and pick up to 5
    const shuffled = shuffleArray([...remaining]);
    const picked = shuffled.slice(0, 5);
    showPackOverlay(picked);
}

