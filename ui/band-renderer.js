// js/ui/band-renderer.js
import * as dom from '../core/dom.js';
import { getState } from '../core/state.js';
import { t } from '../core/i18n.js';
import { updateMusic } from '../core/sound.js';

const TRACKS_CONFIG = [
    { id: 1, name: 'CONTRAVOX', file: 'CONTRAVOX.mp4', achievement: 'contravox_win' },
    { id: 2, name: 'VERSATRIX', file: 'VERSATRIX.mp4', achievement: 'versatrix_win' },
    { id: 3, name: 'REI REVERSUM', file: 'REIREVERSUM.mp4', achievement: 'reversum_win' },
    { id: 4, name: 'NECROVERSO', file: 'NECROVERSO.mp4', achievement: 'true_end_final' },
    { id: 5, name: 'THE REVERSED BAND', file: 'THEREVERSEDBAND.mp4', requiresAll: [1, 2, 3, 4] },
    { id: 6, name: 'ROBOT NARRATOR', file: 'ROBOTNARRATOR.mp4', achievement: '120%_unlocked' },
    { id: 7, name: 'INVERSUS', file: 'INVERSUS.mp4', achievement: 'inversus_win' }
];

export function renderBandPlaylist() {
    const { achievements } = getState();
    const trackList = dom.bandTrackList;
    if (!trackList) return;

    // Determine which tracks are unlocked
    const unlockedMap = {};
    TRACKS_CONFIG.forEach(track => {
        if (track.achievement) {
            unlockedMap[track.id] = achievements.has(track.achievement);
        } else if (track.requiresAll) {
            unlockedMap[track.id] = track.requiresAll.every(id => unlockedMap[id]);
        }
    });

    trackList.innerHTML = TRACKS_CONFIG.map(track => {
        const isUnlocked = unlockedMap[track.id];
        const displayName = isUnlocked ? track.name : '??????';
        const lockedClass = isUnlocked ? '' : 'locked';
        const statusIcon = isUnlocked ? '▶' : '🔒';

        return `
            <div class="band-track-item ${lockedClass}" data-track-id="${track.id}" ${isUnlocked ? '' : 'disabled'}>
                <span class="track-number">${track.id}</span>
                <span class="track-name">${displayName}</span>
                <span class="track-status">${statusIcon}</span>
            </div>
        `;
    }).join('');

    // Attach click listeners
    trackList.querySelectorAll('.band-track-item:not(.locked)').forEach(item => {
        item.addEventListener('click', () => {
            const trackId = parseInt(item.dataset.trackId);
            playBandTrack(trackId);
        });
    });
}

export function playBandTrack(trackId) {
    const track = TRACKS_CONFIG.find(t => t.id === trackId);
    if (!track) return;

    // Pause game music
    const { soundState } = getState();
    dom.musicPlayer.pause();

    // Highlight active track
    dom.bandTrackList.querySelectorAll('.band-track-item').forEach(el => el.classList.remove('active'));
    const activeItem = dom.bandTrackList.querySelector(`[data-track-id="${trackId}"]`);
    if (activeItem) activeItem.classList.add('active');

    // Show video player
    dom.bandVideoPlaceholder.classList.add('hidden');
    dom.bandVideoPlayer.src = `./${track.file}`;
    dom.bandVideoPlayer.volume = soundState.volume;
    dom.bandVideoPlayer.play().catch(e => console.error("Error playing band video:", e));
}

export function closeBandModal() {
    dom.bandModal.classList.add('hidden');
    dom.bandVideoPlayer.pause();
    dom.bandVideoPlayer.src = '';
    dom.bandVideoPlaceholder.classList.remove('hidden');
    
    // Resume game music
    updateMusic();
}
