/**
 * AssetLoader.js - Asset Loading with Error Handling
 * Handles loading of images and data with fallback mechanisms and graceful degradation
 */

export class AssetLoader {
    constructor(errorHandler) {
        this.errorHandler = errorHandler;
        this.loadedAssets = new Map();
        this.failedAssets = new Set();
        this.fallbackAssets = this.initializeFallbackAssets();
        this.loadingStates = new Map();
        this.retryAttempts = new Map();
        this.maxRetries = 2;
    }

    // Initialize fallback asset mappings
    initializeFallbackAssets() {
        return {
            // Scene images fallbacks
            'scene': 'assets/scenes/world_map.png',
            'character': 'assets/scenes/steve.png',
            'cover': 'assets/scenes/nadine_cover.png',
            'map': 'assets/scenes/world_map.png',
            
            // Specific fallback hierarchy
            'city_scene': [
                'assets/scenes/world_map.png',
                'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkNpdHkgU2NlbmU8L3RleHQ+PC9zdmc+'
            ],
            'character_portrait': [
                'assets/scenes/steve.png',
                'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxMDAiIGN5PSIxMDAiIHI9IjgwIiBmaWxsPSIjNjY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1NSUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Q2hhcmFjdGVyPC90ZXh0Pjwvc3ZnPg=='
            ]
        };
    }

    // Load image with comprehensive error handling
    async loadImage(imagePath, assetType = 'scene', options = {}) {
        const {
            timeout = 10000,
            showLoadingState = true,
            retryOnFailure = true,
            fallbackOnError = true
        } = options;

        // Check if already loaded successfully
        if (this.loadedAssets.has(imagePath)) {
            return this.loadedAssets.get(imagePath);
        }

        // Check if previously failed and we're not retrying
        if (this.failedAssets.has(imagePath) && !retryOnFailure) {
            return this.getFallbackImage(assetType, imagePath);
        }

        // Show loading state
        if (showLoadingState) {
            this.setLoadingState(imagePath, 'loading');
        }

        try {
            const image = await this.loadImageWithTimeout(imagePath, timeout);
            
            // Success - cache the result
            this.loadedAssets.set(imagePath, image);
            this.setLoadingState(imagePath, 'loaded');
            this.retryAttempts.delete(imagePath);
            
            return image;

        } catch (error) {
            console.warn(`Failed to load image: ${imagePath}`, error);
            
            // Handle retry logic
            if (retryOnFailure && this.shouldRetry(imagePath)) {
                console.log(`Retrying image load: ${imagePath}`);
                return this.retryImageLoad(imagePath, assetType, options);
            }

            // Mark as failed
            this.failedAssets.add(imagePath);
            this.setLoadingState(imagePath, 'failed');

            // Report error to error handler
            await this.errorHandler.handleError('asset', error, {
                assetType: assetType,
                assetPath: imagePath,
                operation: () => this.loadImage(imagePath, assetType, { ...options, retryOnFailure: false })
            });

            // Return fallback if enabled
            if (fallbackOnError) {
                return this.getFallbackImage(assetType, imagePath);
            }

            throw error;
        }
    }

    // Load image with timeout
    loadImageWithTimeout(imagePath, timeout) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            let timeoutId;

            const cleanup = () => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                img.onload = null;
                img.onerror = null;
            };

            img.onload = () => {
                cleanup();
                resolve(img);
            };

            img.onerror = (error) => {
                cleanup();
                reject(new Error(`Image failed to load: ${imagePath}`));
            };

            // Set timeout
            timeoutId = setTimeout(() => {
                cleanup();
                reject(new Error(`Image load timeout: ${imagePath}`));
            }, timeout);

            // Start loading
            img.src = imagePath;
        });
    }

    // Retry image loading with exponential backoff
    async retryImageLoad(imagePath, assetType, options) {
        const attempts = this.retryAttempts.get(imagePath) || 0;
        this.retryAttempts.set(imagePath, attempts + 1);

        // Exponential backoff delay
        const delay = Math.min(1000 * Math.pow(2, attempts), 5000);
        await this.delay(delay);

        return this.loadImage(imagePath, assetType, options);
    }

    // Check if should retry loading
    shouldRetry(imagePath) {
        const attempts = this.retryAttempts.get(imagePath) || 0;
        return attempts < this.maxRetries;
    }

    // Get fallback image for failed loads
    getFallbackImage(assetType, originalPath) {
        // Determine fallback strategy based on asset type and path
        let fallbackPath = this.determineFallbackPath(assetType, originalPath);
        
        // If we have a hierarchy of fallbacks, try them in order
        if (Array.isArray(fallbackPath)) {
            for (const path of fallbackPath) {
                if (!this.failedAssets.has(path)) {
                    return this.loadFallbackImage(path);
                }
            }
            // If all fallbacks failed, use the last one (usually a data URI)
            return this.loadFallbackImage(fallbackPath[fallbackPath.length - 1]);
        }

        return this.loadFallbackImage(fallbackPath);
    }

    // Determine appropriate fallback path
    determineFallbackPath(assetType, originalPath) {
        // Analyze original path to determine best fallback
        if (originalPath.includes('_pistas') || originalPath.includes('_notHere')) {
            return this.fallbackAssets.city_scene;
        } else if (originalPath.includes('steve') || originalPath.includes('nadine')) {
            return this.fallbackAssets.character_portrait;
        } else if (originalPath.includes('portada')) {
            return this.fallbackAssets.cover;
        } else if (originalPath.includes('world_map')) {
            return this.fallbackAssets.map;
        }

        // Default fallback based on asset type
        return this.fallbackAssets[assetType] || this.fallbackAssets.scene;
    }

    // Load fallback image (simpler loading without retries)
    async loadFallbackImage(fallbackPath) {
        try {
            if (fallbackPath.startsWith('data:')) {
                // Data URI - create image directly
                const img = new Image();
                img.src = fallbackPath;
                return img;
            }

            // Regular path - try to load with shorter timeout
            return await this.loadImageWithTimeout(fallbackPath, 3000);
        } catch (error) {
            console.warn(`Fallback image also failed: ${fallbackPath}`);
            // Return a minimal placeholder
            return this.createPlaceholderImage();
        }
    }

    // Create a minimal placeholder image
    createPlaceholderImage() {
        const img = new Image();
        img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIiBzdHJva2U9IiM5OTkiIHN0cm9rZS13aWR0aD0iMiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBVbmF2YWlsYWJsZTwvdGV4dD48L3N2Zz4=';
        return img;
    }

    // Load game data with enhanced error handling and fallback
    async loadGameData(dataPath = 'assets/data/game_data.json', options = {}) {
        const {
            timeout = 15000,
            retryOnFailure = true,
            fallbackData = null,
            showLoadingState = true,
            languageCode = null
        } = options;

        // Create unique asset ID for language-specific data
        const assetId = languageCode ? `game_data_${languageCode}` : 'game_data';

        if (showLoadingState) {
            this.setLoadingState(assetId, 'loading');
        }

        try {
            const data = await this.loadDataWithTimeout(dataPath, timeout);
            this.setLoadingState(assetId, 'loaded');

            // Cache language-specific data
            if (languageCode) {
                this.cacheLanguageData(languageCode, data);
            }

            return data;

        } catch (error) {
            console.warn(`Failed to load game data from ${dataPath}:`, error.message);

            // Handle retry logic
            if (retryOnFailure && this.shouldRetry(assetId)) {
                console.log(`Retrying game data load for ${dataPath}...`);
                return this.retryDataLoad(dataPath, options);
            }

            // Report error (but don't await to avoid blocking)
            this.errorHandler.handleError('network', error, {
                assetType: 'data',
                assetPath: dataPath,
                languageCode: languageCode,
                operation: () => this.loadGameData(dataPath, { ...options, retryOnFailure: false })
            }).catch(handlerError => {
                console.warn('Error handler failed:', handlerError.message);
            });

            this.setLoadingState(assetId, 'failed');

            // Try language fallback if this was a language-specific load
            if (languageCode && languageCode !== 'es') {
                console.log(`Attempting fallback to Spanish for failed language: ${languageCode}`);
                try {
                    const fallbackPath = dataPath.replace(`_${languageCode}.json`, '_es.json');
                    const fallbackData = await this.loadGameData(fallbackPath, {
                        ...options,
                        retryOnFailure: false,
                        languageCode: 'es'
                    });
                    console.log(`Using Spanish fallback data for ${languageCode}`);
                    return fallbackData;
                } catch (fallbackError) {
                    console.warn('Fallback to Spanish also failed:', fallbackError.message);
                }
            }

            // Use fallback data if available
            if (fallbackData) {
                console.log('Using provided fallback game data');
                return fallbackData;
            }

            // Create minimal fallback data structure
            console.log('Creating minimal fallback game data');
            return this.createFallbackGameData();
        }
    }

    // Load language-specific game data
    async loadLanguageSpecificData(languageCode, options = {}) {
        const languageFilePath = `assets/data/game_data.${languageCode}.json`;

        console.log(`Loading language-specific data for ${languageCode} from ${languageFilePath}`);

        return this.loadGameData(languageFilePath, {
            ...options,
            languageCode: languageCode
        });
    }

    // Cache language-specific data for faster subsequent access
    cacheLanguageData(languageCode, data) {
        if (!this.languageDataCache) {
            this.languageDataCache = new Map();
        }

        this.languageDataCache.set(languageCode, {
            data: data,
            timestamp: Date.now()
        });

        console.log(`Cached language data for ${languageCode}`);
    }

    // Get cached language data
    getCachedLanguageData(languageCode) {
        if (!this.languageDataCache) {
            return null;
        }

        const cached = this.languageDataCache.get(languageCode);
        if (cached) {
            // Check if cache is still valid (1 hour)
            const maxAge = 60 * 60 * 1000; // 1 hour in milliseconds
            if (Date.now() - cached.timestamp < maxAge) {
                console.log(`Using cached language data for ${languageCode}`);
                return cached.data;
            } else {
                // Remove expired cache
                this.languageDataCache.delete(languageCode);
                console.log(`Expired cache removed for ${languageCode}`);
            }
        }

        return null;
    }

    // Preload language-specific data for multiple languages
    async preloadLanguageData(languageCodes, options = {}) {
        const results = {
            loaded: [],
            failed: [],
            total: languageCodes.length
        };

        const loadPromises = languageCodes.map(async (languageCode) => {
            try {
                // Check cache first
                const cachedData = this.getCachedLanguageData(languageCode);
                if (cachedData) {
                    results.loaded.push(languageCode);
                    return { languageCode, success: true, fromCache: true };
                }

                // Load from file
                await this.loadLanguageSpecificData(languageCode, {
                    ...options,
                    showLoadingState: false
                });
                results.loaded.push(languageCode);
                return { languageCode, success: true, fromCache: false };
            } catch (error) {
                results.failed.push({ languageCode, error: error.message });
                return { languageCode, success: false, error };
            }
        });

        const loadResults = await Promise.allSettled(loadPromises);

        console.log(`Language data preloading complete: ${results.loaded.length}/${results.total} successful`);
        return {
            ...results,
            details: loadResults.map(result => result.value || result.reason)
        };
    }

    // Load data with timeout
    async loadDataWithTimeout(dataPath, timeout) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(dataPath, {
                signal: controller.signal,
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data;

        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error(`Data load timeout: ${dataPath}`);
            }
            
            throw error;
        }
    }

    // Retry data loading
    async retryDataLoad(dataPath, options) {
        const attempts = this.retryAttempts.get('game_data') || 0;
        this.retryAttempts.set('game_data', attempts + 1);

        // Exponential backoff delay
        const delay = Math.min(2000 * Math.pow(2, attempts), 10000);
        await this.delay(delay);

        return this.loadGameData(dataPath, options);
    }

    // Create minimal fallback game data
    createFallbackGameData() {
        return {
            game_data: {
                cities: [
                    {
                        id: 'fallback_city',
                        name: 'Emergency Location',
                        country: 'Unknown',
                        is_final: true,
                        informant: {
                            name: 'System',
                            greeting: 'Game data could not be loaded. Please refresh the page.',
                            farewell_helpful: 'Good luck!',
                            farewell_unhelpful: 'Sorry for the inconvenience.'
                        },
                        clues: {
                            easy: ['System is in offline mode'],
                            medium: ['Please check your connection'],
                            difficult: ['Refresh the page to try again']
                        },
                        not_here_response: 'Game data is not available.',
                        final_encounter: {
                            nadine_speech: 'The game data could not be loaded.',
                            steve_response: 'I need to refresh the page.',
                            victory_message: 'Please refresh to play the full game.'
                        }
                    }
                ],
                game_messages: {
                    intro: {
                        title: 'Connection Error',
                        text: 'Unable to load game data. Please check your connection and refresh.'
                    },
                    ui_text: {
                        buttons: {
                            start_game: 'Refresh Page',
                            restart: 'Refresh',
                            view_clues: 'View Error Info'
                        }
                    }
                }
            }
        };
    }

    // Preload critical assets
    async preloadCriticalAssets(assetList) {
        const loadingPromises = assetList.map(asset => {
            return this.loadImage(asset.path, asset.type, {
                showLoadingState: false,
                retryOnFailure: true,
                fallbackOnError: true
            }).catch(error => {
                console.warn(`Failed to preload ${asset.path}:`, error);
                return null; // Don't fail the entire preload process
            });
        });

        const results = await Promise.allSettled(loadingPromises);
        
        const successful = results.filter(r => r.status === 'fulfilled' && r.value !== null).length;
        const failed = results.length - successful;

        console.log(`Asset preloading complete: ${successful} successful, ${failed} failed`);
        
        return {
            successful,
            failed,
            total: results.length,
            successRate: (successful / results.length) * 100
        };
    }

    // Set loading state for UI feedback
    setLoadingState(assetId, state) {
        this.loadingStates.set(assetId, {
            state: state,
            timestamp: Date.now()
        });

        // Emit loading state event for UI updates
        this.emitLoadingStateEvent(assetId, state);
    }

    // Emit loading state event
    emitLoadingStateEvent(assetId, state) {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            const event = new CustomEvent('assetLoadingState', {
                detail: {
                    assetId: assetId,
                    state: state,
                    timestamp: Date.now()
                }
            });
            window.dispatchEvent(event);
        }
    }

    // Get loading statistics
    getLoadingStats() {
        return {
            loaded: this.loadedAssets.size,
            failed: this.failedAssets.size,
            loading: Array.from(this.loadingStates.values()).filter(s => s.state === 'loading').length,
            successRate: this.loadedAssets.size / (this.loadedAssets.size + this.failedAssets.size) * 100 || 0
        };
    }

    // Clear cache (for testing or memory management)
    clearCache() {
        this.loadedAssets.clear();
        this.failedAssets.clear();
        this.loadingStates.clear();
        this.retryAttempts.clear();

        // Clear language-specific cache
        if (this.languageDataCache) {
            this.languageDataCache.clear();
        }
    }

    // Clear language-specific cache only
    clearLanguageCache(languageCode = null) {
        if (!this.languageDataCache) {
            return;
        }

        if (languageCode) {
            this.languageDataCache.delete(languageCode);
            console.log(`Cleared language cache for ${languageCode}`);
        } else {
            this.languageDataCache.clear();
            console.log('Cleared all language cache');
        }
    }

    // Utility delay function
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Check if asset is available
    isAssetLoaded(assetPath) {
        return this.loadedAssets.has(assetPath);
    }

    // Check if asset failed to load
    isAssetFailed(assetPath) {
        return this.failedAssets.has(assetPath);
    }

    // Get current loading state
    getLoadingState(assetId) {
        return this.loadingStates.get(assetId);
    }
}