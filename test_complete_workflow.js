/**
 * Complete Workflow Integration Test
 * Tests the entire game workflow from start to finish with all systems integrated
 */

import { GameController } from './src/modules/GameController.js';
import { DataValidator } from './src/modules/DataValidator.js';
import fs from 'fs';

// Mock DOM for Node.js testing
global.document = {
    getElementById: (id) => ({
        style: {},
        classList: { add: () => {}, remove: () => {} },
        addEventListener: () => {},
        innerHTML: '',
        textContent: '',
        src: '',
        alt: '',
        disabled: false
    }),
    createElement: () => ({
        style: {},
        addEventListener: () => {},
        className: '',
        innerHTML: '',
        textContent: '',
        parentNode: { removeChild: () => {} }
    }),
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
    confirm: () => true,
    dispatchEvent: () => {}
};

global.localStorage = global.window.localStorage;
global.Image = class { constructor() { this.onload = null; this.onerror = null; } };
global.fetch = () => Promise.reject(new Error('Network not available in test'));

class CompleteWorkflowTest {
    constructor() {
        this.results = {
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
        
        this.results.total++;
        if (type === 'success') this.results.passed++;
        else if (type === 'error') this.results.failed++;
        else if (type === 'warning') this.results.warnings++;
    }

    async runCompleteWorkflowTest() {
        console.log('🧪 Complete Workflow Integration Test');
        console.log('=' .repeat(60));
        
        try {
            await this.testSystemInitialization();
            await this.testDataIntegration();
            await this.testCompleteGameWorkflow();
            await this.testErrorRecovery();
            await this.testSessionManagement();
            await this.testPerformanceIntegration();
            
            this.generateFinalReport();
            
        } catch (error) {
            this.log(`Critical workflow test failure: ${error.message}`, 'error');
            throw error;
        }
    }

    async testSystemInitialization() {
        console.log('\n🚀 Testing Complete System Initialization...');
        
        try {
            // Initialize GameController with all modules
            this.gameController = new GameController();
            this.log('GameController instantiated with all modules', 'success');
            
            // Load game data from file
            const gameDataPath = './assets/data/game_data.json';
            if (fs.existsSync(gameDataPath)) {
                const rawData = JSON.parse(fs.readFileSync(gameDataPath, 'utf8'));
                this.gameController.gameState.gameData = rawData.game_data || rawData;
                this.log('Game data loaded from file system', 'success');
            } else {
                throw new Error('Game data file not found');
            }
            
            // Validate all module integrations
            const moduleChecks = [
                { name: 'GameState', obj: this.gameController.gameState },
                { name: 'UIState', obj: this.gameController.uiState },
                { name: 'ClueSystem', obj: this.gameController.clueSystem },
                { name: 'FailureHandler', obj: this.gameController.failureHandler },
                { name: 'SessionManager', obj: this.gameController.sessionManager },
                { name: 'UIManager', obj: this.gameController.uiManager },
                { name: 'RandomizationSystem', obj: this.gameController.randomizationSystem }
            ];
            
            moduleChecks.forEach(check => {
                if (check.obj && typeof check.obj === 'object') {
                    this.log(`${check.name} properly integrated`, 'success');
                } else {
                    this.log(`${check.name} integration failed`, 'error');
                }
            });
            
            // Test cross-module references
            if (this.gameController.clueSystem.randomizationSystem) {
                this.log('ClueSystem ↔ RandomizationSystem integration verified', 'success');
            } else {
                this.log('ClueSystem ↔ RandomizationSystem integration missing', 'warning');
            }
            
            if (this.gameController.sessionManager.uiManager) {
                this.log('SessionManager ↔ UIManager integration verified', 'success');
            } else {
                this.log('SessionManager ↔ UIManager integration missing', 'warning');
            }
            
        } catch (error) {
            this.log(`System initialization failed: ${error.message}`, 'error');
            throw error;
        }
    }

    async testDataIntegration() {
        console.log('\n📊 Testing Data Integration Across All Systems...');
        
        try {
            // Validate game data structure
            const validation = DataValidator.validateGameData({ 
                game_data: this.gameController.gameState.gameData 
            });
            
            if (validation.isValid) {
                this.log('Game data structure validation passed', 'success');
            } else {
                this.log(`Data validation issues: ${validation.errors.join(', ')}`, 'warning');
            }
            
            // Test data accessibility across modules
            const cities = this.gameController.gameState.gameData.cities;
            this.log(`Game data contains ${cities.length} cities`, 'info');
            
            // Verify each city has required data for all systems
            let validCities = 0;
            cities.forEach(city => {
                const hasClues = city.clues && 
                    ['easy', 'medium', 'difficult'].every(diff => 
                        Array.isArray(city.clues[diff])
                    );
                const hasInformant = city.informant && city.informant.name;
                const hasBasicInfo = city.id && city.name && city.country;
                
                if (hasClues && hasInformant && hasBasicInfo) {
                    validCities++;
                }
            });
            
            if (validCities === cities.length) {
                this.log('All cities have complete data for all systems', 'success');
            } else {
                this.log(`${validCities}/${cities.length} cities have complete data`, 'warning');
            }
            
            // Test final city identification
            const finalCity = cities.find(city => city.is_final);
            if (finalCity) {
                this.log(`Final city identified: ${finalCity.name}`, 'success');
            } else {
                this.log('No final city found in data', 'error');
            }
            
        } catch (error) {
            this.log(`Data integration test failed: ${error.message}`, 'error');
        }
    }

    async testCompleteGameWorkflow() {
        console.log('\n🎮 Testing Complete Game Workflow Integration...');
        
        try {
            // Test 1: Game Initialization
            this.gameController.startGame();
            
            if (this.gameController.gameState.phase === 'investigation') {
                this.log('Game initialization sets correct phase', 'success');
            } else {
                this.log(`Unexpected initial phase: ${this.gameController.gameState.phase}`, 'error');
            }
            
            if (this.gameController.gameState.currentCity) {
                this.log('Starting city selected successfully', 'success');
            } else {
                this.log('No starting city selected', 'error');
            }
            
            // Test 2: Clue Collection Workflow
            const initialClueCount = this.gameController.gameState.collectedClues.length;
            this.gameController.collectClues();
            const newClueCount = this.gameController.gameState.collectedClues.length;
            
            if (newClueCount > initialClueCount) {
                this.log(`Clue collection workflow successful: +${newClueCount - initialClueCount} clues`, 'success');
            } else {
                this.log('Clue collection workflow failed', 'error');
            }
            
            // Test 3: Travel Workflow
            const availableCities = this.gameController.getCitiesByCriteria({
                excludeVisited: true,
                excludeCurrent: true,
                isFinal: false
            });
            
            if (availableCities.length > 0) {
                const testCity = availableCities[0];
                const previousCity = this.gameController.gameState.currentCity;
                
                // Test travel validation
                const canTravel = this.gameController.canTravelToCity(testCity.id);
                if (canTravel.canTravel) {
                    this.log('Travel validation workflow working', 'success');
                    
                    // Execute travel
                    this.gameController.travelToCity(testCity.id);
                    
                    if (this.gameController.gameState.currentCity === testCity.id) {
                        this.log(`Travel workflow successful: ${previousCity} → ${testCity.id}`, 'success');
                    } else {
                        this.log('Travel execution failed', 'error');
                    }
                    
                    // Verify visited cities tracking
                    if (this.gameController.gameState.visitedCities.includes(previousCity)) {
                        this.log('Visited cities tracking working', 'success');
                    } else {
                        this.log('Visited cities tracking failed', 'error');
                    }
                } else {
                    this.log(`Travel validation failed: ${canTravel.reason}`, 'error');
                }
            } else {
                this.log('No cities available for travel testing', 'warning');
            }
            
            // Test 4: Progress Tracking Integration
            const stats = this.gameController.failureHandler.calculateEnhancedStats();
            if (stats.citiesVisited > 0 && stats.cluesCollected > 0) {
                this.log('Progress tracking integration working', 'success');
            } else {
                this.log('Progress tracking integration issues', 'warning');
            }
            
            // Test 5: Victory Condition Workflow
            const finalCity = this.gameController.gameState.gameData.cities.find(city => city.is_final);
            if (finalCity) {
                // Simulate reaching final city
                const originalPhase = this.gameController.gameState.phase;
                this.gameController.gameState.currentCity = finalCity.id;
                this.gameController.triggerFinalEncounter();
                
                if (this.gameController.gameState.phase === 'conclusion' && 
                    this.gameController.gameState.hasWon) {
                    this.log('Victory condition workflow working', 'success');
                } else {
                    this.log('Victory condition workflow failed', 'error');
                }
                
                // Restore state for further testing
                this.gameController.gameState.phase = originalPhase;
                this.gameController.gameState.hasWon = false;
                this.gameController.gameState.isGameComplete = false;
            }
            
        } catch (error) {
            this.log(`Game workflow test failed: ${error.message}`, 'error');
        }
    }

    async testErrorRecovery() {
        console.log('\n🛡️ Testing Error Recovery Integration...');
        
        try {
            // Test 1: Invalid Data Handling
            const invalidCityResult = this.gameController.getCityData('nonexistent');
            if (invalidCityResult === null) {
                this.log('Invalid city data handling works', 'success');
            } else {
                this.log('Invalid city data not handled properly', 'error');
            }
            
            // Test 2: Invalid Travel Recovery
            const invalidTravelResult = this.gameController.canTravelToCity('invalid');
            if (!invalidTravelResult.canTravel) {
                this.log('Invalid travel attempt properly blocked', 'success');
            } else {
                this.log('Invalid travel attempt not blocked', 'error');
            }
            
            // Test 3: Failure Condition Integration
            const originalAttempts = this.gameController.gameState.gameStats.attemptsRemaining;
            this.gameController.gameState.gameStats.attemptsRemaining = 0;
            
            const failureCheck = this.gameController.checkFailureConditions();
            if (failureCheck.hasFailed) {
                this.log('Failure condition detection working', 'success');
            } else {
                this.log('Failure condition detection failed', 'error');
            }
            
            // Restore attempts
            this.gameController.gameState.gameStats.attemptsRemaining = originalAttempts;
            
            // Test 4: Error Handler Integration
            if (this.gameController.errorHandler) {
                this.log('Error handler properly integrated', 'success');
            } else {
                this.log('Error handler not integrated', 'error');
            }
            
        } catch (error) {
            this.log(`Error recovery test failed: ${error.message}`, 'error');
        }
    }

    async testSessionManagement() {
        console.log('\n🔄 Testing Session Management Integration...');
        
        try {
            // Test 1: Session Isolation
            const originalSessionId = this.gameController.gameState.sessionId;
            const originalClues = [...this.gameController.gameState.collectedClues];
            
            // Perform session reset
            this.gameController.performCompleteSessionReset();
            
            if (this.gameController.gameState.sessionId !== originalSessionId) {
                this.log('Session ID properly changed on reset', 'success');
            } else {
                this.log('Session ID not changed on reset', 'error');
            }
            
            if (this.gameController.gameState.collectedClues.length === 0) {
                this.log('Session data properly cleared', 'success');
            } else {
                this.log('Session data not properly cleared', 'error');
            }
            
            // Test 2: Session Independence
            const independenceTest = this.gameController.testSessionIndependence();
            if (independenceTest.errors.length === 0) {
                this.log('Session independence verified', 'success');
            } else {
                this.log(`Session independence issues: ${independenceTest.errors.join(', ')}`, 'warning');
            }
            
            // Test 3: Randomization Reset Integration
            this.gameController.randomizationSystem.initialize();
            const newSeed = this.gameController.randomizationSystem.currentSeed;
            if (newSeed) {
                this.log('Randomization system properly reset with session', 'success');
            } else {
                this.log('Randomization system reset issues', 'warning');
            }
            
        } catch (error) {
            this.log(`Session management test failed: ${error.message}`, 'error');
        }
    }

    async testPerformanceIntegration() {
        console.log('\n⚡ Testing Performance Integration...');
        
        try {
            // Test 1: Initialization Performance
            const initStart = performance.now();
            const testController = new GameController();
            const initEnd = performance.now();
            const initTime = initEnd - initStart;
            
            if (initTime < 100) { // Should initialize in under 100ms
                this.log(`System initialization performance good: ${initTime.toFixed(2)}ms`, 'success');
            } else {
                this.log(`System initialization slow: ${initTime.toFixed(2)}ms`, 'warning');
            }
            
            // Test 2: Game Operation Performance
            const operationStart = performance.now();
            for (let i = 0; i < 10; i++) {
                this.gameController.collectClues();
                this.gameController.selectFairStartingCity();
            }
            const operationEnd = performance.now();
            const operationTime = (operationEnd - operationStart) / 10;
            
            if (operationTime < 10) { // Should complete operations in under 10ms each
                this.log(`Game operations performance good: ${operationTime.toFixed(2)}ms avg`, 'success');
            } else {
                this.log(`Game operations slow: ${operationTime.toFixed(2)}ms avg`, 'warning');
            }
            
            // Test 3: Memory Usage Stability
            const memoryStart = process.memoryUsage().heapUsed;
            for (let i = 0; i < 50; i++) {
                this.gameController.performCompleteSessionReset();
                this.gameController.startGame();
            }
            const memoryEnd = process.memoryUsage().heapUsed;
            const memoryIncrease = (memoryEnd - memoryStart) / 1024 / 1024; // MB
            
            if (memoryIncrease < 5) { // Should not increase by more than 5MB
                this.log(`Memory usage stable: +${memoryIncrease.toFixed(2)}MB`, 'success');
            } else {
                this.log(`Memory usage concerning: +${memoryIncrease.toFixed(2)}MB`, 'warning');
            }
            
        } catch (error) {
            this.log(`Performance integration test failed: ${error.message}`, 'error');
        }
    }

    generateFinalReport() {
        console.log('\n📊 Complete Workflow Integration Results');
        console.log('=' .repeat(60));
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`⚠️ Warnings: ${this.results.warnings}`);
        console.log(`📊 Total: ${this.results.total}`);
        
        const successRate = ((this.results.passed / this.results.total) * 100).toFixed(1);
        console.log(`🎯 Success Rate: ${successRate}%`);
        
        // Determine integration status
        let status = 'UNKNOWN';
        let message = '';
        
        if (this.results.failed === 0) {
            if (this.results.warnings === 0) {
                status = 'EXCELLENT';
                message = '🎉 Perfect integration! All systems working flawlessly together.';
            } else if (this.results.warnings <= 2) {
                status = 'GOOD';
                message = '✅ Integration successful with minor warnings that don\'t affect functionality.';
            } else {
                status = 'ACCEPTABLE';
                message = '⚠️ Integration working but has several warnings to review.';
            }
        } else if (this.results.failed <= 2) {
            status = 'NEEDS_ATTENTION';
            message = '🔧 Integration mostly working but has some failures that need fixing.';
        } else {
            status = 'CRITICAL';
            message = '🚨 Integration has critical issues that must be resolved.';
        }
        
        console.log(`\n🏆 Integration Status: ${status}`);
        console.log(message);
        
        // Save detailed report
        const report = {
            timestamp: new Date().toISOString(),
            status: status,
            successRate: parseFloat(successRate),
            results: this.results,
            summary: message,
            recommendations: this.generateRecommendations()
        };
        
        fs.writeFileSync('complete-workflow-test-report.json', JSON.stringify(report, null, 2));
        console.log('\n📄 Complete workflow test report saved to complete-workflow-test-report.json');
        
        return status === 'EXCELLENT' || status === 'GOOD' || status === 'ACCEPTABLE';
    }

    generateRecommendations() {
        const recommendations = [];
        
        if (this.results.failed > 0) {
            recommendations.push('Fix critical failures before production deployment');
        }
        
        if (this.results.warnings > 3) {
            recommendations.push('Review and address warning conditions for optimal performance');
        }
        
        if (this.results.passed / this.results.total > 0.95) {
            recommendations.push('Integration is production-ready');
        }
        
        recommendations.push('Run browser-based tests to validate UI integration');
        recommendations.push('Consider adding automated CI/CD testing');
        
        return recommendations;
    }
}

// Run the complete workflow test
const workflowTest = new CompleteWorkflowTest();
workflowTest.runCompleteWorkflowTest()
    .then(success => {
        console.log('\n🎯 Complete workflow integration test finished');
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('\n💥 Complete workflow test failed:', error);
        process.exit(1);
    });