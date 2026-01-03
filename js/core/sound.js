
import { getState, updateState } from './state.js';
import * as dom from './dom.js';
import * as config from './config.js';
import { toggleReversusTotalBackground } from '../ui/animations.js';

export const initializeMusic = () => {
    const state = getState();
    if (state.isMusicInitialized) return;
    updateState('isMusicInitialized', true);
    updateMusic();
};

export const playSoundEffect = (effectName) => {
    const { soundState } = getState();
    if (soundState.muted) return;

    let sfxSrc;
    let player = dom.sfxPlayer;
    const wavEffects = ['conquista', 'confusao', 'campoinverso', 'x', 'destruido', 'xael', 'jogarcarta', 'coracao'];
    const mp3Effects = ['escolhido'];
    
    const sanitizedEffectName = effectName.toLowerCase().replace(/\s/g, '');

    if (wavEffects.includes(sanitizedEffectName)) {
        sfxSrc = `${sanitizedEffectName}.wav`;
        if (sanitizedEffectName === 'xael' && dom.popupSfxPlayer) {
            player = dom.popupSfxPlayer;
        }
    } else if (mp3Effects.includes(sanitizedEffectName)) {
        sfxSrc = `${sanitizedEffectName}.mp3`;
    } else {
        sfxSrc = sanitizedEffectName + '.ogg';
    }

    if (!player) return;
    player.src = sfxSrc;

    let volume = soundState.volume;
    const effectsToBoost = ['jogarcarta', 'mais', 'menos', 'sobe', 'desce', 'pula', 'reversus', 'reversustotal', 'x', 'coracao'];

    if (sanitizedEffectName === 'confusao') {
        volume = Math.min(1.0, soundState.volume * 3.5);
    } else if (effectsToBoost.includes(sanitizedEffectName)) {
        volume = Math.min(1.0, soundState.volume * 2.2); 
    } else if (sanitizedEffectName === 'xael') {
        volume = Math.min(1.0, soundState.volume * 2.0);
    }
    
    player.volume = volume;
    player.play().catch(e => console.error(`Failed to play sound effect: ${sfxSrc}`, e));
};

function processAnnouncementQueue() {
    const { isAnnouncing, announcementQueue } = getState();
    if (isAnnouncing || announcementQueue.length === 0) return;

    updateState('isAnnouncing', true);
    const announcement = announcementQueue.shift();

    if (announcement.type === 'inversus-total') playSoundEffect('reversustotal');

    if (dom.effectAnnouncerEl) {
        dom.effectAnnouncerEl.textContent = announcement.text;
        dom.effectAnnouncerEl.className = 'effect-announcer-overlay';
        dom.effectAnnouncerEl.classList.add(announcement.type);
        dom.effectAnnouncerEl.classList.remove('hidden');
    }

    setTimeout(() => {
        if (dom.effectAnnouncerEl) dom.effectAnnouncerEl.classList.add('hidden');
        updateState('isAnnouncing', false);
        setTimeout(processAnnouncementQueue, 200);
    }, announcement.duration);
}

export const announceEffect = (text, type = 'default', duration = 1500) => {
    if (type === 'default' && ['Mais', 'Sobe', 'Menos', 'Desce', 'Reversus', 'Reversus Total', 'Pula'].includes(text)) {
        const cardName = text;
        let animationDuration = 1500;
        switch (cardName) {
            case 'Mais': case 'Sobe': type = 'positive'; break;
            case 'Menos': case 'Desce': type = 'negative'; break;
            case 'Reversus': type = 'reversus'; animationDuration = 1800; break;
            case 'Reversus Total':
                toggleReversusTotalBackground(true);
                type = 'reversus-total';
                animationDuration = 2000;
                break;
            case 'Pula': type = 'default'; break;
        }
        duration = animationDuration;
    }
    const { announcementQueue } = getState();
    announcementQueue.push({ text, type, duration });
    processAnnouncementQueue();
};

export const playStoryMusic = async (track, loop = true) => {
    if (!dom.musicPlayer) return;
    if (dom.musicPlayer.src && dom.musicPlayer.src.endsWith(track)) return;
    dom.musicPlayer.src = track;
    dom.musicPlayer.loop = loop;
    if (dom.nextTrackButton) dom.nextTrackButton.disabled = true;
    
    // Forçar inicialização ao tentar tocar uma música de história
    updateState('isMusicInitialized', true);
    await updateMusic();
};

export const stopStoryMusic = () => {
    if (!dom.musicPlayer) return;
    const { currentTrackIndex } = getState();
    if (dom.nextTrackButton) dom.nextTrackButton.disabled = false;
    dom.musicPlayer.src = config.MUSIC_TRACKS[currentTrackIndex];
    updateMusic();
};

export const updateMusic = () => {
    if (!dom.musicPlayer) return;
    const { soundState, isMusicInitialized } = getState();
    
    dom.musicPlayer.volume = soundState.volume;

    if (soundState.muted) {
        dom.musicPlayer.pause();
    } else {
        // Se houver uma música carregada e não estiver mudo, tenta tocar
        // Mesmo que isMusicInitialized seja falso, permitimos o play via ação direta
        const playPromise = dom.musicPlayer.play();
        if (playPromise !== undefined) playPromise.catch(() => {
            console.log("Auto-play bloqueado pelo navegador. Aguardando interação.");
        });
    }
};

export const changeTrack = () => {
    let { currentTrackIndex } = getState();
    currentTrackIndex = (currentTrackIndex + 1) % config.MUSIC_TRACKS.length;
    updateState('currentTrackIndex', currentTrackIndex);
    if (dom.musicPlayer) {
        dom.musicPlayer.src = config.MUSIC_TRACKS[currentTrackIndex];
        updateMusic();
    }
};

export const toggleMute = () => {
    const { soundState } = getState();
    soundState.muted = !soundState.muted;
    console.log("Mudo:", soundState.muted);
    
    if (dom.muteButton) {
        dom.muteButton.classList.toggle('muted', soundState.muted);
        dom.muteButton.textContent = soundState.muted ? '▶' : '||';
    }
    
    updateMusic();
};

export const setVolume = (value) => {
    const { soundState } = getState();
    soundState.volume = value;
    if (dom.volumeSlider) dom.volumeSlider.value = String(value);
    updateMusic();
};
