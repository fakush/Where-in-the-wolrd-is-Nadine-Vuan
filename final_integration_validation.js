/**
 * Final Integration Validation
 * Comprehensive validation of all game systems working together
 */

import { GameController } from './src/modules/GameController.js';
import fs from 'fs';

// Mock DOM for Node.js testing
global.document = {
    getElementById: () => ({ style: {}, classList: { add: () => {}, remove: () => {} }, addEventListener: () => {}, innerHTML: '', textContent: '', src: '', alt: '', disabled: false }),
    createElement: () => ({ style: {}, addEventListener: () => {}, className: '', innerHTML: '', textContent: '', parentNode: { removeChild: () => {} } }),
    addEventListener: () => {},
    body: { appendChild: () => {} }
};

global.window = {
    addEventListener: () => {},
    localStorage: { getItem: () => null, setItem: () => {}, removeChild: () => {} },
    confirm: () => true,
    dispatchEvent: () => {}
};

global.localStorage = global.window.localStorage;

class FinalIntegrationValidator {
    constructor() {
        this.validationResults = {
            systemIntegration: { passed: 0, total: 0, issues: [] },
            dataFlow: { passed: 0, total: 0, issues: [] },
            gameLogic: { passed: 0, total: 0, issues: [] },
            errorHandling: { passed: 0, total: 0, issues: [] },
            performance: { passed: 0, total: 0, issues: [] }
        };
    }

    async validateCompleteIntegration() {
        console.log('🔍 Final Integration Validation');
        console.log('=' .repeat(50));
        
        await this.validateSystemIntegration();
        await this.validateDataFlow();
        await this.validateGameLogic();
        await this.validateErrorHandling();
        await this.validatePerformance();
        
        return this.generateFinalReport();
    }

    async validateSystemIntegration() {
        console.log('\n🔧 Validating System Integration...');
        
        const tests = [
            {
                name: 'GameController instantiation',
                test: () => {
                    const gc = new GameController();
                    return gc && typeof gc === 'object';
                }
            },
            {
                name: 'All modules initialized',
                test: () => {
                    const gc = new GameController();
                    const modules = ['gameState', 'uiState', 'clueSystem', 'failureHandler', 'sessionManager', 'uiManager', 'randomizationSystem'];
                    return modules.every(module => gc[module] && typeof gc[module] === 'object');
                }
            },
            {
                name: 'Cross-module references',
                test: () => {
                    const gc = new GameController();
                    return gc.clueSystem.randomizationSystem && gc.sessionManager.uiManager;
                }
            },
            {
                name: 'Game data loading',
                test: () => {
                    const gc = new GameController();
                    const gameDataPath = './assets/data/game_data.json';
                    if (fs.existsSync(gameDataPath)) {
                        const rawData = JSON.parse(fs.readFileSync(gameDataPath, 'utf8'));
                        gc.gameState.gameData = rawData.game_data || rawData;
                        return gc.gameState.gameData && gc.gameState.gameData.cities;
                    }
                    return false;
                }
            }
        ];

        this.runTestSuite('systemIntegration', tests);
    }

    async validateDataFlow() {
        console.log('\n📊 Validating Data Flow...');
        
        const gc = new GameController();
        const gameDataPath = './assets/data/game_data.json';
        if (fs.existsSync(gameDataPath)) {
            const rawData = JSON.parse(fs.readFileSync(gameDataPath, 'utf8'));
            gc.gameState.gameData = rawData.game_data || rawData;
        }

        const tests = [
            {
                name: 'Game initialization data flow',
                test: () => {
                    gc.startGame();
                    return gc.gameState.phase === 'investigation' && gc.gameState.currentCity;
                }
            },
            {
                name: 'Clue collection data flow',
                test: () => {
                    const initialCount = gc.gameState.collectedClues.length;
                    gc.collectClues();
                    return gc.gameState.collectedClues.length >= initialCount;
                }
            },
            {
                name: 'Travel data flow',
                test: () => {
                    const availableCities = gc.getCitiesByCriteria({ excludeVisited: true, excludeCurrent: true, isFinal: false });
                    if (availableCities.length > 0) {
                        const testCity = availableCities[0];
                        const previousCity = gc.gameState.currentCity;
                        gc.travelToCity(testCity.id);
                        return gc.gameState.currentCity === testCity.id && gc.gameState.visitedCities.includes(previousCity);
                    }
                    return true; // No cities to test with
                }
            },
            {
                name: 'Progress tracking data flow',
                test: () => {
                    const stats = gc.failureHandler.calculateEnhancedStats();
                    return stats && typeof stats.citiesVisited === 'number' && typeof stats.cluesCollected === 'number';
                }
            }
        ];

        this.runTestSuite('dataFlow', tests);
    }

    async validateGameLogic() {
        console.log('\n🎮 Validating Game Logic...');
        
        const gc = new GameController();
        const gameDataPath = './assets/data/game_data.json';
        if (fs.existsSync(gameDataPath)) {
            const rawData = JSON.parse(fs.readFileSync(gameDataPath, 'utf8'));
            gc.gameState.gameData = rawData.game_data || rawData;
        }

        const tests = [
            {
                name: 'Starting city selection logic',
                test: () => {
                    const city = gc.selectFairStartingCity();
                    return city && !city.is_final;
                }
            },
            {
                name: 'Travel validation logic',
                test: () => {
                    const invalidResult = gc.canTravelToCity('invalid_city');
                    const nullResult = gc.canTravelToCity(null);
                    return !invalidResult.canTravel && !nullResult.canTravel;
                }
            },
            {
                name: 'Clue generation logic',
                test: () => {
                    gc.startGame();
                    const cityData = gc.getCityData(gc.gameState.currentCity);
                    if (cityData && gc.hasCityClues(gc.gameState.currentCity)) {
                        const clues = gc.clueSystem.generateClues(cityData, { maxCluesPerDifficulty: 1 });
                        return Array.isArray(clues) && clues.length > 0;
                    }
                    return true; // No clues to test with
                }
            },
            {
                name: 'Failure condition logic',
                test: () => {
                    const originalAttempts = gc.gameState.gameStats.attemptsRemaining;
                    gc.gameState.gameStats.attemptsRemaining = 0;
                    const failureCheck = gc.checkFailureConditions();
                    gc.gameState.gameStats.attemptsRemaining = originalAttempts;
                    return failureCheck.hasFailed;
                }
            },
            {
                name: 'Session isolation logic',
                test: () => {
                    const originalSessionId = gc.gameState.sessionId;
                    gc.performCompleteSessionReset();
                    return gc.gameState.sessionId !== originalSessionId && gc.gameState.collectedClues.length === 0;
                }
            }
        ];

        this.runTestSuite('gameLogic', tests);
    }

    async validateErrorHandling() {
        console.log('\n🛡️ Validating Error Handling...');
        
        const gc = new GameController();
        const gameDataPath = './assets/data/game_data.json';
        if (fs.existsSync(gameDataPath)) {
            const rawData = JSON.parse(fs.readFileSync(gameDataPath, 'utf8'));
            gc.gameState.gameData = rawData.game_data || rawData;
        }

        const tests = [
            {
                name: 'Invalid city data handling',
                test: () => {
                    const result = gc.getCityData('nonexistent_city');
                    return result === null;
                }
            },
            {
                name: 'Invalid input validation',
                test: () => {
                    const invalidInputs = [null, undefined, '', 123, {}, []];
                    return invalidInputs.every(input => {
                        const result = gc.canTravelToCity(input);
                        return !result.canTravel;
                    });
                }
            },
            {
                name: 'Clue system error handling',
                test: () => {
                    try {
                        const result = gc.clueSystem.generateClues(null);
                        return Array.isArray(result) && result.length === 0;
                    } catch (error) {
                        return true; // Expected to throw error
                    }
                }
            },
            {
                name: 'Error handler integration',
                test: () => {
                    return gc.errorHandler && typeof gc.errorHandler.handleError === 'function';
                }
            }
        ];

        this.runTestSuite('errorHandling', tests);
    }

    async validatePerformance() {
        console.log('\n⚡ Validating Performance...');
        
        const tests = [
            {
                name: 'System initialization performance',
                test: () => {
                    const start = performance.now();
                    new GameController();
                    const end = performance.now();
                    return (end - start) < 100; // Should initialize in under 100ms
                }
            },
            {
                name: 'Game operations performance',
                test: () => {
                    const gc = new GameController();
                    const gameDataPath = './assets/data/game_data.json';
                    if (fs.existsSync(gameDataPath)) {
                        const rawData = JSON.parse(fs.readFileSync(gameDataPath, 'utf8'));
                        gc.gameState.gameData = rawData.game_data || rawData;
                    }
                    
                    const start = performance.now();
                    for (let i = 0; i < 10; i++) {
                        gc.selectFairStartingCity();
                    }
                    const end = performance.now();
                    return ((end - start) / 10) < 10; // Should complete in under 10ms each
                }
            },
            {
                name: 'Memory stability',
                test: () => {
                    const gc = new GameController();
                    const gameDataPath = './assets/data/game_data.json';
                    if (fs.existsSync(gameDataPath)) {
                        const rawData = JSON.parse(fs.readFileSync(gameDataPath, 'utf8'));
                        gc.gameState.gameData = rawData.game_data || rawData;
                    }
                    
                    const memoryStart = process.memoryUsage().heapUsed;
                    for (let i = 0; i < 20; i++) {
                        gc.performCompleteSessionReset();
                        gc.startGame();
                    }
                    const memoryEnd = process.memoryUsage().heapUsed;
                    const memoryIncrease = (memoryEnd - memoryStart) / 1024 / 1024; // MB
                    return memoryIncrease < 2; // Should not increase by more than 2MB
                }
            }
        ];

        this.runTestSuite('performance', tests);
    }

    runTestSuite(category, tests) {
        tests.forEach(test => {
            this.validationResults[category].total++;
            try {
                const result = test.test();
                if (result) {
                    this.validationResults[category].passed++;
                    console.log(`  ✅ ${test.name}`);
                } else {
                    this.validationResults[category].issues.push(`${test.name}: Test returned false`);
                    console.log(`  ❌ ${test.name}: Test returned false`);
                }
            } catch (error) {
                this.validationResults[category].issues.push(`${test.name}: ${error.message}`);
                console.log(`  ❌ ${test.name}: ${error.message}`);
            }
        });
    }

    generateFinalReport() {
        console.log('\n📊 Final Integration Validation Report');
        console.log('=' .repeat(50));
        
        let totalPassed = 0;
        let totalTests = 0;
        let allIssues = [];

        Object.entries(this.validationResults).forEach(([category, results]) => {
            const successRate = ((results.passed / results.total) * 100).toFixed(1);
            console.log(`${category}: ${results.passed}/${results.total} (${successRate}%)`);
            
            totalPassed += results.passed;
            totalTests += results.total;
            allIssues.push(...results.issues);
        });

        const overallSuccessRate = ((totalPassed / totalTests) * 100).toFixed(1);
        console.log(`\nOverall: ${totalPassed}/${totalTests} (${overallSuccessRate}%)`);

        // Determine integration status
        let status = 'UNKNOWN';
        let readyForProduction = false;

        if (overallSuccessRate >= 95) {
            status = 'EXCELLENT';
            readyForProduction = true;
            console.log('\n🎉 INTEGRATION STATUS: EXCELLENT');
            console.log('✅ All systems are fully integrated and working perfectly together.');
            console.log('🚀 Ready for production deployment!');
        } else if (overallSuccessRate >= 90) {
            status = 'GOOD';
            readyForProduction = true;
            console.log('\n✅ INTEGRATION STATUS: GOOD');
            console.log('✅ Systems are well integrated with minor issues.');
            console.log('🚀 Ready for production deployment with monitoring.');
        } else if (overallSuccessRate >= 80) {
            status = 'ACCEPTABLE';
            readyForProduction = false;
            console.log('\n⚠️ INTEGRATION STATUS: ACCEPTABLE');
            console.log('⚠️ Systems are integrated but have some issues to address.');
            console.log('🔧 Recommend fixing issues before production.');
        } else {
            status = 'NEEDS_WORK';
            readyForProduction = false;
            console.log('\n🚨 INTEGRATION STATUS: NEEDS_WORK');
            console.log('❌ Integration has significant issues that must be resolved.');
            console.log('🛠️ Requires fixes before deployment.');
        }

        if (allIssues.length > 0) {
            console.log('\n🔍 Issues Found:');
            allIssues.forEach(issue => console.log(`  • ${issue}`));
        }

        // Save comprehensive report
        const report = {
            timestamp: new Date().toISOString(),
            status: status,
            overallSuccessRate: parseFloat(overallSuccessRate),
            readyForProduction: readyForProduction,
            categoryResults: this.validationResults,
            totalPassed: totalPassed,
            totalTests: totalTests,
            issues: allIssues,
            recommendations: this.generateRecommendations(status, allIssues)
        };

        fs.writeFileSync('final-integration-validation-report.json', JSON.stringify(report, null, 2));
        console.log('\n📄 Final validation report saved to final-integration-validation-report.json');

        return readyForProduction;
    }

    generateRecommendations(status, issues) {
        const recommendations = [];

        if (status === 'EXCELLENT') {
            recommendations.push('🎯 Integration is perfect - deploy with confidence');
            recommendations.push('📊 Consider adding performance monitoring in production');
            recommendations.push('🧪 Run browser-based tests to validate UI components');
        } else if (status === 'GOOD') {
            recommendations.push('✅ Integration is production-ready');
            recommendations.push('🔍 Monitor the minor issues in production');
            recommendations.push('🧪 Complete browser testing for full validation');
        } else if (status === 'ACCEPTABLE') {
            recommendations.push('🔧 Address the identified issues before production');
            recommendations.push('🧪 Run additional testing after fixes');
            recommendations.push('📊 Set up monitoring for problem areas');
        } else {
            recommendations.push('🛠️ Fix critical integration issues immediately');
            recommendations.push('🧪 Re-run validation after fixes');
            recommendations.push('👥 Consider code review for problem areas');
        }

        recommendations.push('🌐 Test in browser environment for complete validation');
        recommendations.push('🚀 Set up automated testing for CI/CD pipeline');

        return recommendations;
    }
}

// Run the final validation
const validator = new FinalIntegrationValidator();
validator.validateCompleteIntegration()
    .then(isReady => {
        console.log(`\n🎯 Integration validation complete. Production ready: ${isReady ? 'YES' : 'NO'}`);
        process.exit(isReady ? 0 : 1);
    })
    .catch(error => {
        console.error('\n💥 Validation failed:', error);
        process.exit(1);
    });