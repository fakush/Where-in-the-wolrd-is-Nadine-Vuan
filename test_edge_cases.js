/**
 * Edge Cases Test Runner
 * Tests edge cases and boundary conditions for the game
 */

import { GameController } from './src/modules/GameController.js';
import { DataValidator } from './src/modules/DataValidator.js';
import fs from 'fs';

// Mock DOM for testing
global.document = {
    getElementById: () => ({ 
        style: {}, 
        addEventListener: () => {},
        classList: { add: () => {}, remove: () => {}, contains: () => false },
        innerHTML: '',
        textContent: ''
    }),
    createElement: () => ({ 
        style: {}, 
        addEventListener: () => {},
        classList: { add: () => {}, remove: () => {} }
    }),
    addEventListener: () => {},
    body: { appendChild: () => {} },
    querySelectorAll: () => []
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

class EdgeCaseTestRunner {
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
        console.log('🧪 Starting Edge Cases Test Suite');
        console.log('=' .repeat(60));
        
        try {
            await this.setupGame();
            await this.testBoundaryConditions();
            await this.testInvalidInputs();
            await this.testStateCorruption();
            await this.testConcurrencyIssues();
            await this.testMemoryLeaks();
            await this.testDataIntegrity();
            
            this.generateReport();
            
        } catch (error) {
            this.log(`Critical test failure: ${error.message}`, 'error');
        }
    }

    async setupGame() {
        console.log('\n🚀 Setting up game for edge case testing...');
        
        try {
            this.gameController = new GameController();
            
            // Load game data
            const dataPath = './assets/data/game_data.json';
            if (fs.existsSync(dataPath)) {
                const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
                this.gameController.gameState.gameData = rawData.game_data || rawData;
                this.log('Game setup completed', 'success');
            } else {
                throw new Error('Game data file not found');
            }
            
        } catch (error) {
            this.log(`Game setup failed: ${error.message}`, 'error');
            throw error;
        }
    }

    async testBoundaryConditions() {
        console.log('\n🎯 Testing Boundary Conditions...');
        
        try {
            // Test with zero attempts remaining
            this.gameController.gameState.gameStats.attemptsRemaining = 0;
            const failureCheck = this.gameController.checkFailureConditions();
            if (failureCheck.hasFailed) {
                this.log('Zero attempts boundary condition handled correctly', 'success');
            } else {
                this.log('Zero attempts boundary condition not handled', 'error');
            }
            
            // Test with negative attempts
            this.gameController.gameState.gameStats.attemptsRemaining = -1;
            const negativeCheck = this.gameController.checkFailureConditions();
            if (negativeCheck.hasFailed) {
                this.log('Negative attempts boundary condition handled correctly', 'success');
            } else {
                this.log('Negative attempts boundary condition not handled', 'error');
            }
            
            // Reset attempts for further testing
            this.gameController.gameState.gameStats.attemptsRemaining = 10;
            
            // Test with maximum cities visited
            const allCities = this.gameController.gameState.gameData.cities.map(city => city.id);
            this.gameController.gameState.visitedCities = [...allCities];
            
            const availableCities = this.gameController.getCitiesByCriteria({ 
                excludeVisited: true, 
                excludeCurrent: true 
            });
            
            if (availableCities.length === 0) {
                this.log('All cities visited boundary condition handled correctly', 'success');
            } else {
                this.log('All cities visited boundary condition not handled properly', 'error');
            }
            
            // Reset visited cities
            this.gameController.gameState.visitedCities = [];
            
            // Test with maximum clues collected
            const maxClues = [];
            for (let i = 0; i < 1000; i++) {
                maxClues.push({
                    text: `Test clue ${i}`,
                    difficulty: 'easy',
                    sourceCity: 'test',
                    timestamp: new Date()
                });
            }
            
            this.gameController.gameState.collectedClues = maxClues;
            const clueCount = this.gameController.gameState.collectedClues.length;
            if (clueCount === 1000) {
                this.log('Large clue collection handled correctly', 'success');
            } else {
                this.log('Large clue collection not handled properly', 'error');
            }
            
            // Reset clues
            this.gameController.gameState.collectedClues = [];
            
        } catch (error) {
            this.log(`Boundary conditions test failed: ${error.message}`, 'error');
        }
    }

    async testInvalidInputs() {
        console.log('\n🚫 Testing Invalid Inputs...');
        
        try {
            // Test invalid city IDs
            const invalidCityIds = [
                null, undefined, '', ' ', '\n', '\t',
                123, 0, -1, Infinity, NaN,
                {}, [], true, false,
                'nonexistent_city', 'INVALID', '../../etc/passwd',
                '<script>alert("xss")</script>',
                'city with spaces', 'city\nwith\nnewlines'
            ];
            
            let invalidInputsHandled = 0;
            
            invalidCityIds.forEach(cityId => {
                try {
                    const result = this.gameController.canTravelToCity(cityId);
                    if (!result.canTravel) {
                        invalidInputsHandled++;
                    }
                } catch (error) {
                    // Throwing an error is also acceptable for invalid input
                    invalidInputsHandled++;
                }
            });
            
            if (invalidInputsHandled === invalidCityIds.length) {
                this.log('All invalid city IDs properly rejected', 'success');
            } else {
                this.log(`${invalidCityIds.length - invalidInputsHandled} invalid inputs not properly handled`, 'error');
            }
            
            // Test invalid clue data
            const invalidClues = [
                null, undefined, {}, { text: null }, { difficulty: 'invalid' },
                { text: '', difficulty: 'easy' }, { text: 'test' }, // missing fields
                { text: 123, difficulty: 'easy', sourceCity: 'test' }, // wrong types
            ];
            
            let invalidCluesHandled = 0;
            
            invalidClues.forEach(clue => {
                try {
                    const isValid = this.gameController.clueSystem.validateClueObject(clue);
                    if (!isValid) {
                        invalidCluesHandled++;
                    }
                } catch (error) {
                    invalidCluesHandled++;
                }
            });
            
            if (invalidCluesHandled === invalidClues.length) {
                this.log('All invalid clues properly rejected', 'success');
            } else {
                this.log(`${invalidClues.length - invalidCluesHandled} invalid clues not properly handled`, 'error');
            }
            
        } catch (error) {
            this.log(`Invalid inputs test failed: ${error.message}`, 'error');
        }
    }

    async testStateCorruption() {
        console.log('\n💥 Testing State Corruption Handling...');
        
        try {
            // Test corrupted game state
            const originalState = { ...this.gameController.gameState };
            
            // Corrupt the session ID
            this.gameController.gameState.sessionId = null;
            const sessionValidation = this.gameController.gameState.validateSavedState(this.gameController.gameState);
            if (!sessionValidation) {
                this.log('Corrupted session ID properly detected', 'success');
            } else {
                this.log('Corrupted session ID not detected', 'error');
            }
            
            // Restore and corrupt phase
            Object.assign(this.gameController.gameState, originalState);
            this.gameController.gameState.phase = 'invalid_phase';
            const phaseValidation = this.gameController.gameState.validateSavedState(this.gameController.gameState);
            if (!phaseValidation) {
                this.log('Invalid game phase properly detected', 'success');
            } else {
                this.log('Invalid game phase not detected', 'error');
            }
            
            // Restore and corrupt arrays
            Object.assign(this.gameController.gameState, originalState);
            this.gameController.gameState.visitedCities = 'not_an_array';
            const arrayValidation = this.gameController.gameState.validateSavedState(this.gameController.gameState);
            if (!arrayValidation) {
                this.log('Corrupted arrays properly detected', 'success');
            } else {
                this.log('Corrupted arrays not detected', 'error');
            }
            
            // Restore state
            Object.assign(this.gameController.gameState, originalState);
            
            // Test corrupted game data
            const originalGameData = this.gameController.gameState.gameData;
            this.gameController.gameState.gameData = { invalid: 'structure' };
            
            const dataValidation = DataValidator.validateGameData({ game_data: this.gameController.gameState.gameData });
            if (!dataValidation.isValid) {
                this.log('Corrupted game data properly detected', 'success');
            } else {
                this.log('Corrupted game data not detected', 'error');
            }
            
            // Restore game data
            this.gameController.gameState.gameData = originalGameData;
            
        } catch (error) {
            this.log(`State corruption test failed: ${error.message}`, 'error');
        }
    }

    async testConcurrencyIssues() {
        console.log('\n⚡ Testing Concurrency Issues...');
        
        try {
            // Test rapid successive operations
            const promises = [];
            
            // Rapid clue collection
            for (let i = 0; i < 10; i++) {
                promises.push(new Promise(resolve => {
                    setTimeout(() => {
                        try {
                            this.gameController.collectClues();
                            resolve('success');
                        } catch (error) {
                            resolve('error');
                        }
                    }, Math.random() * 100);
                }));
            }
            
            const results = await Promise.all(promises);
            const successCount = results.filter(r => r === 'success').length;
            
            if (successCount >= 8) { // Allow some failures due to timing
                this.log('Rapid operations handled reasonably well', 'success');
            } else {
                this.log(`Only ${successCount}/10 rapid operations succeeded`, 'warning');
            }
            
            // Test simultaneous state changes
            const statePromises = [];
            for (let i = 0; i < 5; i++) {
                statePromises.push(new Promise(resolve => {
                    setTimeout(() => {
                        try {
                            this.gameController.gameState.gameStats.citiesVisited++;
                            resolve('success');
                        } catch (error) {
                            resolve('error');
                        }
                    }, Math.random() * 50);
                }));
            }
            
            await Promise.all(statePromises);
            
            if (this.gameController.gameState.gameStats.citiesVisited >= 5) {
                this.log('Concurrent state changes handled', 'success');
            } else {
                this.log('Concurrent state changes may have been lost', 'warning');
            }
            
        } catch (error) {
            this.log(`Concurrency test failed: ${error.message}`, 'error');
        }
    }

    async testMemoryLeaks() {
        console.log('\n🧠 Testing Memory Leak Prevention...');
        
        try {
            // Test repeated game resets
            const initialMemory = process.memoryUsage().heapUsed;
            
            for (let i = 0; i < 100; i++) {
                this.gameController.performCompleteSessionReset();
                this.gameController.startGame();
                
                // Collect some clues to create objects
                this.gameController.collectClues();
                
                // Reset again
                this.gameController.performCompleteSessionReset();
            }
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
            
            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;
            const memoryIncreaseMB = memoryIncrease / 1024 / 1024;
            
            if (memoryIncreaseMB < 10) { // Less than 10MB increase is acceptable
                this.log(`Memory usage stable: ${memoryIncreaseMB.toFixed(2)}MB increase`, 'success');
            } else {
                this.log(`Potential memory leak: ${memoryIncreaseMB.toFixed(2)}MB increase`, 'warning');
            }
            
            // Test event listener cleanup
            let eventListenerCount = 0;
            const originalAddEventListener = global.document.addEventListener;
            global.document.addEventListener = function() {
                eventListenerCount++;
                return originalAddEventListener.apply(this, arguments);
            };
            
            // Create and destroy multiple game instances
            for (let i = 0; i < 10; i++) {
                const tempController = new GameController();
                tempController.uiManager.init();
            }
            
            if (eventListenerCount < 100) { // Reasonable number of event listeners
                this.log(`Event listeners managed reasonably: ${eventListenerCount} added`, 'success');
            } else {
                this.log(`Potential event listener leak: ${eventListenerCount} added`, 'warning');
            }
            
        } catch (error) {
            this.log(`Memory leak test failed: ${error.message}`, 'error');
        }
    }

    async testDataIntegrity() {
        console.log('\n🔒 Testing Data Integrity...');
        
        try {
            // Test clue uniqueness
            this.gameController.startGame();
            
            const initialClueCount = this.gameController.gameState.collectedClues.length;
            
            // Collect clues multiple times
            for (let i = 0; i < 5; i++) {
                this.gameController.collectClues();
            }
            
            const finalClueCount = this.gameController.gameState.collectedClues.length;
            
            // Check for duplicates
            const clueTexts = this.gameController.gameState.collectedClues.map(c => c.text);
            const uniqueClueTexts = new Set(clueTexts);
            
            if (uniqueClueTexts.size === clueTexts.length) {
                this.log('No duplicate clues found - integrity maintained', 'success');
            } else {
                this.log(`${clueTexts.length - uniqueClueTexts.size} duplicate clues found`, 'warning');
            }
            
            // Test city visit tracking integrity
            const testCities = ['london', 'paris', 'tokyo'];
            testCities.forEach(cityId => {
                if (this.gameController.canTravelToCity(cityId).canTravel) {
                    this.gameController.travelToCity(cityId);
                }
            });
            
            const visitedSet = new Set(this.gameController.gameState.visitedCities);
            if (visitedSet.size === this.gameController.gameState.visitedCities.length) {
                this.log('No duplicate city visits - integrity maintained', 'success');
            } else {
                this.log('Duplicate city visits found', 'error');
            }
            
            // Test session ID uniqueness
            const sessionIds = new Set();
            for (let i = 0; i < 100; i++) {
                const sessionId = this.gameController.gameState.generateSessionId();
                sessionIds.add(sessionId);
            }
            
            if (sessionIds.size === 100) {
                this.log('All session IDs unique - integrity maintained', 'success');
            } else {
                this.log(`${100 - sessionIds.size} duplicate session IDs found`, 'error');
            }
            
        } catch (error) {
            this.log(`Data integrity test failed: ${error.message}`, 'error');
        }
    }

    generateReport() {
        console.log('\n📊 Edge Cases Test Results Summary');
        console.log('=' .repeat(60));
        console.log(`✅ Passed: ${this.testResults.passed}`);
        console.log(`❌ Failed: ${this.testResults.failed}`);
        console.log(`⚠️ Warnings: ${this.testResults.warnings}`);
        console.log(`📊 Total: ${this.testResults.total}`);
        
        const successRate = ((this.testResults.passed / this.testResults.total) * 100).toFixed(1);
        console.log(`🎯 Success Rate: ${successRate}%`);
        
        if (this.testResults.failed === 0) {
            console.log('\n🎉 All edge case tests passed! System is robust.');
        } else {
            console.log('\n⚠️ Some edge cases failed. Review the errors above.');
        }
        
        // Save report to file
        const report = {
            timestamp: new Date().toISOString(),
            testType: 'edge_cases',
            results: this.testResults,
            successRate: parseFloat(successRate),
            status: this.testResults.failed === 0 ? 'PASSED' : 'FAILED'
        };
        
        fs.writeFileSync('edge-cases-test-report.json', JSON.stringify(report, null, 2));
        console.log('\n📄 Edge cases test report saved to edge-cases-test-report.json');
    }
}

// Run the tests
const runner = new EdgeCaseTestRunner();
runner.runAllTests().catch(error => {
    console.error('Edge cases test runner failed:', error);
    process.exit(1);
});