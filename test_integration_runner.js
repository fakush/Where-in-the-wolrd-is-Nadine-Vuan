/**
 * Integration Test Runner - Node.js compatible
 * Tests the complete game integration without browser dependencies
 */

import { GameController } from './src/modules/GameController.js';
import { DataValidator } from './src/modules/DataValidator.js';
import fs from 'fs';
import path from 'path';

// Mock DOM elements for testing
global.document = {
    getElementById: () => null,
    createElement: () => ({ style: {}, addEventListener: () => {} }),
    addEventListener: () => {},
    body: { appendChild: () => {} }
};

global.window = {
    addEventListener: () => {},
    localStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
    },
    confirm: () => true
};

global.localStorage = global.window.localStorage;

class IntegrationTestRunner {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            warnings: 0,
            total: 0
        };
        this.gameController = null;
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const prefix = {
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        }[type] || 'ℹ️';
        
        console.log(`[${timestamp}] ${prefix} ${message}`);
        
        this.testResults.total++;
        if (type === 'success') this.testResults.passed++;
        else if (type === 'error') this.testResults.failed++;
        else if (type === 'warning') this.testResults.warnings++;
    }

    async runAllTests() {
        console.log('🧪 Starting Complete Integration Test Suite');
        console.log('=' .repeat(60));
        
        try {
            await this.testSystemInitialization();
            await this.testDataLoading();
            await this.testGameFlow();
            await this.testSessionManagement();
            await this.testRandomization();
            await this.testErrorHandling();
            
            this.generateReport();
            
        } catch (error) {
            this.log(`Critical test failure: ${error.message}`, 'error');
        }
    }

    async testSystemInitialization() {
        console.log('\n🚀 Testing System Initialization...');
        
        try {
            // Test GameController instantiation
            this.gameController = new GameController();
            this.log('GameController instantiated successfully', 'success');
            
            // Test module dependencies
            const modules = [
                'gameState', 'uiState', 'clueSystem', 'failureHandler', 
                'sessionManager', 'uiManager', 'randomizationSystem'
            ];
            
            let moduleCount = 0;
            modules.forEach(module => {
                if (this.gameController[module]) {
                    moduleCount++;
                    this.log(`${module} initialized correctly`, 'success');
                } else {
                    this.log(`${module} failed to initialize`, 'error');
                }
            });
            
            this.log(`Module initialization: ${moduleCount}/${modules.length} successful`, 
                moduleCount === modules.length ? 'success' : 'warning');
                
        } catch (error) {
            this.log(`System initialization failed: ${error.message}`, 'error');
        }
    }

    async testDataLoading() {
        console.log('\n📊 Testing Data Loading...');
        
        if (!this.gameController) {
            this.log('GameController not available for data loading test', 'error');
            return;
        }
        
        try {
            // Check if game data file exists
            const dataPath = './assets/data/game_data.json';
            if (fs.existsSync(dataPath)) {
                this.log('Game data file exists', 'success');
                
                // Read and validate data structure
                const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
                const validation = DataValidator.validateGameData(rawData);
                
                if (validation.isValid) {
                    this.log('Game data validation passed', 'success');
                    
                    // Set game data for testing
                    this.gameController.gameState.gameData = rawData.game_data || rawData;
                    
                    const cities = this.gameController.gameState.gameData.cities;
                    this.log(`Game data loaded: ${cities?.length || 0} cities`, 'success');
                    
                } else {
                    this.log(`Data validation failed: ${validation.errors.join(', ')}`, 'error');
                }
                
            } else {
                this.log('Game data file not found', 'error');
            }
            
        } catch (error) {
            this.log(`Data loading failed: ${error.message}`, 'error');
        }
    }

    async testGameFlow() {
        console.log('\n🎮 Testing Game Flow...');
        
        if (!this.gameController || !this.gameController.gameState.gameData) {
            this.log('Game data not available for flow testing', 'error');
            return;
        }
        
        try {
            // Test game initialization
            this.gameController.startGame();
            this.log('Game started successfully', 'success');
            
            // Verify initial state
            if (this.gameController.gameState.phase === 'investigation') {
                this.log('Game phase set to investigation', 'success');
            } else {
                this.log(`Unexpected game phase: ${this.gameController.gameState.phase}`, 'error');
            }
            
            // Test starting city selection
            if (this.gameController.gameState.currentCity) {
                const cityData = this.gameController.getCityData(this.gameController.gameState.currentCity);
                if (cityData) {
                    this.log(`Starting city selected: ${cityData.name}`, 'success');
                } else {
                    this.log('Invalid starting city selected', 'error');
                }
            } else {
                this.log('No starting city selected', 'error');
            }
            
            // Test clue collection
            const initialClueCount = this.gameController.gameState.collectedClues.length;
            this.gameController.collectClues();
            const newClueCount = this.gameController.gameState.collectedClues.length;
            
            if (newClueCount >= initialClueCount) {
                this.log(`Clue collection works: ${newClueCount - initialClueCount} clues added`, 'success');
            } else {
                this.log('Clue collection failed', 'error');
            }
            
            // Test travel system
            const availableCities = this.gameController.getCitiesByCriteria({ 
                excludeVisited: true, 
                excludeCurrent: true 
            });
            
            if (availableCities.length > 0) {
                const testCity = availableCities[0];
                const canTravel = this.gameController.canTravelToCity(testCity.id);
                
                if (canTravel.canTravel) {
                    this.log(`Travel validation works for ${testCity.name}`, 'success');
                } else {
                    this.log(`Cannot travel to ${testCity.name}: ${canTravel.reason}`, 'warning');
                }
            } else {
                this.log('No cities available for travel testing', 'warning');
            }
            
            // Test victory scenario
            const finalCity = this.gameController.gameState.gameData.cities.find(city => city.is_final);
            if (finalCity) {
                this.log(`Final city found: ${finalCity.name}`, 'success');
            } else {
                this.log('Final city not found in game data', 'error');
            }
            
        } catch (error) {
            this.log(`Game flow test failed: ${error.message}`, 'error');
        }
    }

    async testSessionManagement() {
        console.log('\n🔄 Testing Session Management...');
        
        if (!this.gameController) {
            this.log('GameController not available for session testing', 'error');
            return;
        }
        
        try {
            const originalSessionId = this.gameController.gameState.sessionId;
            
            // Test session independence
            const independenceTest = this.gameController.testSessionIndependence();
            if (independenceTest.errors.length === 0) {
                this.log('Session independence test passed', 'success');
            } else {
                this.log(`Session independence issues: ${independenceTest.errors.join(', ')}`, 'warning');
            }
            
            // Test complete session reset
            this.gameController.performCompleteSessionReset();
            
            if (this.gameController.gameState.sessionId !== originalSessionId) {
                this.log('Session ID changed after reset', 'success');
            } else {
                this.log('Session ID not changed after reset', 'error');
            }
            
            if (this.gameController.gameState.collectedClues.length === 0) {
                this.log('Clues cleared after reset', 'success');
            } else {
                this.log('Clues not cleared after reset', 'error');
            }
            
        } catch (error) {
            this.log(`Session management test failed: ${error.message}`, 'error');
        }
    }

    async testRandomization() {
        console.log('\n🎲 Testing Randomization System...');
        
        if (!this.gameController) {
            this.log('GameController not available for randomization testing', 'error');
            return;
        }
        
        try {
            // Test randomization system validation
            const validationResults = this.gameController.validateRandomizationSystem();
            
            if (validationResults.overallValid) {
                this.log('Randomization system validation passed', 'success');
            } else {
                this.log('Randomization system validation failed', 'error');
                validationResults.systemIntegrity.errors.forEach(error => {
                    this.log(`System integrity error: ${error}`, 'error');
                });
                validationResults.gameDataCompatibility.errors.forEach(error => {
                    this.log(`Data compatibility error: ${error}`, 'error');
                });
            }
            
            // Test starting city selection variation
            const startingCities = [];
            for (let i = 0; i < 10; i++) {
                const city = this.gameController.selectFairStartingCity();
                if (city) {
                    startingCities.push(city.id);
                }
            }
            
            const uniqueCities = new Set(startingCities);
            if (uniqueCities.size > 1) {
                this.log(`Starting city selection shows variation: ${uniqueCities.size} unique cities`, 'success');
            } else {
                this.log('Starting city selection may be too predictable', 'warning');
            }
            
        } catch (error) {
            this.log(`Randomization test failed: ${error.message}`, 'error');
        }
    }

    async testErrorHandling() {
        console.log('\n🛡️ Testing Error Handling...');
        
        if (!this.gameController) {
            this.log('GameController not available for error handling testing', 'error');
            return;
        }
        
        try {
            // Test invalid city data access
            const invalidCity = this.gameController.getCityData('nonexistent_city');
            if (invalidCity === null) {
                this.log('Invalid city access handled correctly', 'success');
            } else {
                this.log('Invalid city access not handled properly', 'error');
            }
            
            // Test invalid travel validation
            const invalidTravel = this.gameController.canTravelToCity('invalid_city');
            if (!invalidTravel.canTravel) {
                this.log('Invalid travel attempt properly rejected', 'success');
            } else {
                this.log('Invalid travel attempt not properly rejected', 'error');
            }
            
            // Test input validation with various invalid inputs
            const invalidInputs = [null, undefined, '', 123, {}, []];
            let validationPassed = 0;
            
            invalidInputs.forEach(input => {
                const result = this.gameController.canTravelToCity(input);
                if (!result.canTravel) {
                    validationPassed++;
                }
            });
            
            if (validationPassed === invalidInputs.length) {
                this.log('Input validation works for all invalid inputs', 'success');
            } else {
                this.log(`Input validation failed for ${invalidInputs.length - validationPassed} inputs`, 'error');
            }
            
        } catch (error) {
            this.log(`Error handling test failed: ${error.message}`, 'error');
        }
    }

    generateReport() {
        console.log('\n📊 Test Results Summary');
        console.log('=' .repeat(60));
        console.log(`✅ Passed: ${this.testResults.passed}`);
        console.log(`❌ Failed: ${this.testResults.failed}`);
        console.log(`⚠️ Warnings: ${this.testResults.warnings}`);
        console.log(`📊 Total: ${this.testResults.total}`);
        
        const successRate = ((this.testResults.passed / this.testResults.total) * 100).toFixed(1);
        console.log(`🎯 Success Rate: ${successRate}%`);
        
        if (this.testResults.failed === 0) {
            console.log('\n🎉 All critical tests passed! Integration is successful.');
        } else {
            console.log('\n⚠️ Some tests failed. Review the errors above.');
        }
        
        // Save report to file
        const report = {
            timestamp: new Date().toISOString(),
            results: this.testResults,
            successRate: parseFloat(successRate),
            status: this.testResults.failed === 0 ? 'PASSED' : 'FAILED'
        };
        
        fs.writeFileSync('integration-test-report.json', JSON.stringify(report, null, 2));
        console.log('\n📄 Test report saved to integration-test-report.json');
    }
}

// Run the tests
const runner = new IntegrationTestRunner();
runner.runAllTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
});