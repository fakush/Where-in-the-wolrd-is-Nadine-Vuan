/**
 * NetworkMonitor.js - Network Status Monitoring
 * Monitors network connectivity and provides feedback for asset loading issues
 */

export class NetworkMonitor {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.isOnline = navigator.onLine;
        this.connectionQuality = 'good';
        this.statusIndicator = null;
        this.setupNetworkListeners();
        this.createStatusIndicator();
    }

    // Setup network event listeners
    setupNetworkListeners() {
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => {
                this.handleOnlineStatus(true);
            });

            window.addEventListener('offline', () => {
                this.handleOnlineStatus(false);
            });

            // Monitor connection quality through performance
            this.monitorConnectionQuality();
        }
    }

    // Handle online/offline status changes
    handleOnlineStatus(isOnline) {
        this.isOnline = isOnline;
        this.updateStatusIndicator();

        if (isOnline) {
            this.uiManager?.showFeedbackMessage(
                'Connection restored. Game assets will load normally.',
                'success',
                { duration: 3000 }
            );
        } else {
            this.uiManager?.showFeedbackMessage(
                'Connection lost. Game will continue with cached assets.',
                'warning',
                { duration: 5000, persistent: true }
            );
        }
    }

    // Monitor connection quality through timing
    monitorConnectionQuality() {
        if (!this.isOnline) return;

        const startTime = performance.now();
        
        // Test with a small image request
        const testImage = new Image();
        testImage.onload = () => {
            const loadTime = performance.now() - startTime;
            this.assessConnectionQuality(loadTime);
        };
        
        testImage.onerror = () => {
            this.connectionQuality = 'poor';
            this.updateStatusIndicator();
        };

        // Use a small, likely cached image for testing
        testImage.src = 'assets/scenes/world_map.png?' + Date.now();
        
        // Timeout after 5 seconds
        setTimeout(() => {
            if (testImage.complete === false) {
                this.connectionQuality = 'poor';
                this.updateStatusIndicator();
            }
        }, 5000);
    }

    // Assess connection quality based on load time
    assessConnectionQuality(loadTime) {
        if (loadTime < 1000) {
            this.connectionQuality = 'good';
        } else if (loadTime < 3000) {
            this.connectionQuality = 'moderate';
        } else {
            this.connectionQuality = 'poor';
        }

        this.updateStatusIndicator();

        // Show warning for poor connection
        if (this.connectionQuality === 'poor') {
            this.uiManager?.showFeedbackMessage(
                'Slow connection detected. Images may take longer to load.',
                'warning',
                { duration: 4000 }
            );
        }
    }

    // Create network status indicator
    createStatusIndicator() {
        if (typeof document === 'undefined') return;

        this.statusIndicator = document.createElement('div');
        this.statusIndicator.className = 'network-status';
        this.statusIndicator.innerHTML = `
            <span class="status-icon">📶</span>
            <span class="status-text">Online</span>
        `;
        
        document.body.appendChild(this.statusIndicator);
        this.updateStatusIndicator();
    }

    // Update status indicator
    updateStatusIndicator() {
        if (!this.statusIndicator) return;

        this.statusIndicator.className = 'network-status';
        
        if (!this.isOnline) {
            this.statusIndicator.className += ' offline';
            this.statusIndicator.innerHTML = `
                <span class="status-icon">📵</span>
                <span class="status-text">Offline</span>
            `;
        } else if (this.connectionQuality === 'poor') {
            this.statusIndicator.className += ' slow';
            this.statusIndicator.innerHTML = `
                <span class="status-icon">🐌</span>
                <span class="status-text">Slow Connection</span>
            `;
        } else {
            // Hide indicator for good connections
            this.statusIndicator.style.display = 'none';
            return;
        }

        this.statusIndicator.style.display = 'block';
    }

    // Get current network status
    getNetworkStatus() {
        return {
            isOnline: this.isOnline,
            connectionQuality: this.connectionQuality,
            shouldShowWarnings: !this.isOnline || this.connectionQuality === 'poor'
        };
    }

    // Check if should use aggressive caching
    shouldUseAggressiveCaching() {
        return !this.isOnline || this.connectionQuality === 'poor';
    }

    // Check if should reduce asset quality
    shouldReduceAssetQuality() {
        return this.connectionQuality === 'poor';
    }

    // Destroy network monitor
    destroy() {
        if (this.statusIndicator && this.statusIndicator.parentNode) {
            this.statusIndicator.parentNode.removeChild(this.statusIndicator);
        }

        if (typeof window !== 'undefined') {
            window.removeEventListener('online', this.handleOnlineStatus);
            window.removeEventListener('offline', this.handleOnlineStatus);
        }
    }
}