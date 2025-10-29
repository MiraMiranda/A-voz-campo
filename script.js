class RadioPlayer {
    constructor() {
        this.audio = document.getElementById('radioStream');
        this.playBtn = document.getElementById('playBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.songTitle = document.querySelector('.song-title');
        this.visualizer = document.querySelector('.visualizer');
        this.bars = document.querySelectorAll('.bar');
        this.volumeIcon = document.querySelector('.volume-icon');
        
        this.isPlaying = false;
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.rafId = null;
        this.frequencyData = null;
        this.smoothedValues = null;
        
        this.init();
    }
    
    init() {
        // Event listeners
        this.playBtn.addEventListener('click', () => this.togglePlay());
        this.stopBtn.addEventListener('click', () => this.stop());
        this.volumeSlider.addEventListener('input', () => this.setVolume());
        
        // Audio events
        this.audio.addEventListener('play', () => this.onPlay());
        this.audio.addEventListener('pause', () => this.onPause());
        this.audio.addEventListener('ended', () => this.onEnded());
        this.audio.addEventListener('error', (e) => this.onError(e));
        this.audio.addEventListener('loadstart', () => this.onLoadStart());
        this.audio.addEventListener('canplay', () => this.onCanPlay());
        this.audio.addEventListener('waiting', () => this.onWaiting());
        this.audio.addEventListener('playing', () => this.onPlaying());
        
        // Initialize volume
        this.setVolume();
        
        // Setup audio visualization
        this.setupVisualizer();
        
        // Create particles
        this.createParticles();
        
        // Initialize smoothed values
        this.smoothedValues = new Array(this.bars.length).fill(0);
    }
    
    setupVisualizer() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            const source = this.audioContext.createMediaElementSource(this.audio);
            
            source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
            
            this.analyser.fftSize = 512;
            this.analyser.smoothingTimeConstant = 0.8;
            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);
            this.frequencyData = new Uint8Array(bufferLength);
            
        } catch (e) {
            console.warn('Audio visualization not supported:', e);
            this.songTitle.textContent = 'Visualização de áudio não suportada neste navegador';
        }
    }
    
    createParticles() {
        // Criar partículas no estilo folhas
        for (let i = 0; i < 12; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 2 + 's';
            particle.style.background = this.getRandomEarthColor();
            this.visualizer.appendChild(particle);
        }
    }
    
    getRandomEarthColor() {
        const colors = ['#2e7d32', '#4caf50', '#200b03ff', '#ff8f00', '#813b26ff'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }
    
    async play() {
        try {
            // Resume AudioContext if it was suspended
            if (this.audioContext && this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            await this.audio.play();
            this.isPlaying = true;
            this.updatePlayButton();
            this.startVisualization();
            
        } catch (error) {
            console.error('Error playing audio:', error);
            this.songTitle.textContent = 'Erro ao reproduzir áudio';
            this.showError('Não foi possível reproduzir o áudio. Verifique a conexão.');
        }
    }
    
    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.updatePlayButton();
        this.stopVisualization();
    }
    
    stop() {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.isPlaying = false;
        this.updatePlayButton();
        this.stopVisualization();
        this.songTitle.textContent = 'Transmissão parada';
    }
    
    setVolume() {
        const volume = this.volumeSlider.value / 100;
        this.audio.volume = volume;
        
        // Update volume icon based on level
        this.updateVolumeIcon(volume);
    }
    
    updateVolumeIcon(volume) {
        let iconPath;
        if (volume === 0) {
            iconPath = 'M3 9v6h4l5 5V4L7 9H3z';
        } else if (volume < 0.3) {
            iconPath = 'M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM3 9v6h4l5 5V4L7 9H3z';
        } else if (volume < 0.7) {
            iconPath = 'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z';
        } else {
            iconPath = 'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z';
        }
        
        this.volumeIcon.innerHTML = `<path fill="currentColor" d="${iconPath}"/>`;
    }
    
    updatePlayButton() {
        const icon = this.playBtn.querySelector('.icon');
        if (this.isPlaying) {
            // Ícone de pausa
            icon.innerHTML = '<path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
        } else {
            // Ícone de play
            icon.innerHTML = '<path fill="currentColor" d="M8 5v14l11-7z"/>';
        }
    }
    
    startVisualization() {
        if (!this.analyser) return;
        
        const animate = () => {
            this.rafId = requestAnimationFrame(animate);
            
            // Obter dados de frequência
            this.analyser.getByteFrequencyData(this.dataArray);
            
            const barCount = this.bars.length;
            const step = Math.floor(this.dataArray.length / barCount);
            
            this.bars.forEach((bar, index) => {
                // Usar múltiplas frequências para cada barra para um efeito mais suave
                const frequencies = [];
                for (let i = 0; i < 3; i++) {
                    const freqIndex = Math.min(index * step + i * 2, this.dataArray.length - 1);
                    frequencies.push(this.dataArray[freqIndex]);
                }
                
                const average = frequencies.reduce((a, b) => a + b) / frequencies.length;
                const smoothedValue = this.smoothValue(index, average);
                const height = Math.max(8, (smoothedValue / 255) * 100);
                
                // Aplicar altura com easing
                const currentHeight = parseFloat(bar.style.height) || 8;
                const newHeight = currentHeight + (height - currentHeight) * 0.2;
                
                bar.style.height = `${newHeight}%`;
                
                // Efeitos visuais baseados na intensidade
                this.applyVisualEffects(bar, smoothedValue, index);
                
                // Efeito de pico
                if (smoothedValue > 200) {
                    bar.classList.add('peak');
                    setTimeout(() => bar.classList.remove('peak'), 100);
                }
            });
            
            // Criar partículas dinâmicas baseadas na música
            this.createDynamicParticles();
        };
        
        animate();
    }
    
    smoothValue(index, newValue) {
        const smoothingFactor = 0.6;
        this.smoothedValues[index] = this.smoothedValues[index] * smoothingFactor + newValue * (1 - smoothingFactor);
        
        return this.smoothedValues[index];
    }
    
    applyVisualEffects(bar, value, index) {
        // Cores baseadas no tema agro
        let hue, saturation, lightness;
        
        if (value < 100) {
            // Verde para baixas frequências
            hue = 120 + (value / 100) * 30;
            saturation = 60 + (value / 255) * 40;
            lightness = 40 + (value / 255) * 20;
        } else if (value < 180) {
            // Amarelo/laranja para médias frequências
            hue = 40 + ((value - 100) / 80) * 20;
            saturation = 80;
            lightness = 50;
        } else {
            // Vermelho/laranja para altas frequências
            hue = 20;
            saturation = 90;
            lightness = 55;
        }
        
        bar.style.background = `linear-gradient(to top, 
            hsl(${hue}, ${saturation}%, ${lightness}%), 
            hsl(${hue}, ${saturation}%, ${lightness - 15}%)`;
        
        // Efeito de atividade
        if (value > 30) {
            bar.classList.add('active');
        } else {
            bar.classList.remove('active');
        }
        
        // Sombra dinâmica
        const shadowIntensity = value / 255;
        bar.style.boxShadow = `0 0 ${5 + shadowIntensity * 15}px 
            hsl(${hue}, ${saturation}%, ${lightness}%)`;
            
        // Opacidade baseada na intensidade
        bar.style.opacity = 0.7 + (value / 255) * 0.3;
    }
    
    createDynamicParticles() {
        // Criar partículas apenas quando a música está intensa
        const overallIntensity = this.dataArray.reduce((a, b) => a + b) / this.dataArray.length;
        
        if (overallIntensity > 80 && Math.random() > 0.8) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.background = this.getRandomEarthColor();
            particle.style.animation = `float-leaf ${1 + Math.random() * 2}s ease-in forwards`;
            particle.style.width = `${6 + Math.random() * 4}px`;
            particle.style.height = particle.style.width;
            
            this.visualizer.appendChild(particle);
            
            // Remover partícula após animação
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, 3000);
        }
    }
    
    stopVisualization() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        
        // Reset suave das barras
        this.bars.forEach((bar, index) => {
            setTimeout(() => {
                bar.style.height = '8%';
                bar.style.background = 'linear-gradient(to top, var(--verde-campo), var(--verde-claro))';
                bar.style.boxShadow = 'inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 4px rgba(0,0,0,0.2)';
                bar.style.opacity = '1';
                bar.classList.remove('active', 'peak');
            }, index * 50);
        });
    }
    
    // Event handlers
    onPlay() {
        this.isPlaying = true;
        this.updatePlayButton();
        this.songTitle.textContent = '🎵 Rádio - A voz do Campo 🎵';
        this.visualizer.classList.add('playing');
        this.visualizer.classList.remove('paused');
    }
    
    onPause() {
        this.isPlaying = false;
        this.updatePlayButton();
        this.visualizer.classList.add('paused');
        this.visualizer.classList.remove('playing');
        this.songTitle.textContent = 'Transmissão pausada';
    }
    
    onEnded() {
        this.isPlaying = false;
        this.updatePlayButton();
        this.songTitle.textContent = 'Transmissão finalizada';
        this.stopVisualization();
    }
    
    onError(e) {
        console.error('Audio error:', e);
        this.songTitle.textContent = 'Erro ao carregar a transmissão';
        this.isPlaying = false;
        this.updatePlayButton();
        this.stopVisualization();
        this.showError('Erro no áudio. Verifique o arquivo ou conexão.');
    }
    
    onLoadStart() {
        this.songTitle.innerHTML = '<span class="loading"></span> Conectando com a terra...';
    }
    
    onCanPlay() {
        if (this.isPlaying) {
            this.songTitle.textContent = '🎵 Rádio - A voz do Campo 🎵';
        } else {
            this.songTitle.textContent = 'Pronto para tocar a voz do campo';
        }
    }
    
    onWaiting() {
        this.songTitle.innerHTML = '<span class="loading"></span> Preparando a colheita...';
    }
    
    onPlaying() {
        this.songTitle.textContent = '🎵 Rádio - A voz do Campo 🎵';
    }
    
    showError(message) {
        // Create error message element
        let errorElement = document.querySelector('.error-message');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'error-message';
            errorElement.style.cssText = `
                background: #d32f2f;
                color: white;
                padding: 10px;
                border-radius: 5px;
                margin-top: 10px;
                font-size: 0.9rem;
                border: 1px solid #b71c1c;
            `;
            document.querySelector('.radio-player').appendChild(errorElement);
        }
        
        errorElement.textContent = message;
        
        // Remove error after 5 seconds
        setTimeout(() => {
            if (errorElement.parentNode) {
                errorElement.parentNode.removeChild(errorElement);
            }
        }, 5000);
    }
}

// Initialize the radio player when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const radioPlayer = new RadioPlayer();
    
    // Make player globally available for debugging
    window.radioPlayer = radioPlayer;
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            radioPlayer.togglePlay();
        }
        if (e.code === 'ArrowUp') {
            e.preventDefault();
            radioPlayer.audio.volume = Math.min(1, radioPlayer.audio.volume + 0.1);
            radioPlayer.volumeSlider.value = radioPlayer.audio.volume * 100;
            radioPlayer.setVolume();
        }
        if (e.code === 'ArrowDown') {
            e.preventDefault();
            radioPlayer.audio.volume = Math.max(0, radioPlayer.audio.volume - 0.1);
            radioPlayer.volumeSlider.value = radioPlayer.audio.volume * 100;
            radioPlayer.setVolume();
        }
    });
});