/**
 * Node.js test script for fair randomization system
 * Tests the randomization functionality without browser dependencies
 */

// Mock browser APIs for Node.js environment
global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
};

global.console = console;

// Import the modules (we'll need to adjust paths for Node.js)
import { RandomizationSystem } from './src/modules/RandomizationSystem.js';

// Mock game data for testing
const mockGameData = {
    cities: [
        { id: 'tokyo', name: 'Tokyo', country: 'Japan', is_final: false },
        { id: 'london', name: 'London', country: 'UK', is_final: false },
        { id: 'roma', name: 'Roma', country: 'Italy', is_final: false },
        { id: 'sydney', name: 'Sydney', country: 'Australia', is_final: false },
        { id: 'newYork', name: 'New York', country: 'USA', is_final: false },
        { id: 'mexico', name: 'Mexico City', country: 'Mexico', is_final: false },
        { id: 'reykjavik', name: 'Reykjavik', country: 'Iceland', is_final: false },
        { id: 'bangkok', name: 'Bangkok', country: 'Thailand', is_final: false },
        { id: 'marruecos', name: 'Marrakech', country: 'Morocco', is_final: false },
        { id: 'estambul', name: 'Istanbul', country: 'Turkey', is_final: false },
        { id: 'buenosAires', name: 'Buenos Aires', country: 'Argentina', is_final: true }
    ]
};

// Mock GameState for testing
class MockGameState {
    constructor() {
        this.gameData = mockGameData;
    }
}

// Test functions
function testStartingCityFairness() {
    console.log('\n🎲 Testing Starting City Selection Fairness...');
    
    const gameState = new MockGameState();
    const randomizationSystem = new RandomizationSystem(gameState);
    randomizationSystem.initialize();
    
    const iterations = 100;
    const selections = {};
    const nonFinalCities = mockGameData.cities.filter(city => !city.is_final);
    
    // Initialize counters
    nonFinalCities.forEach(city => {
        selections[city.id] = 0;
    });
    
    // Run test
    for (let i = 0; i < iterations; i++) {
        const selectedCity = randomizationSystem.selectRandomStartingCity(mockGameData.cities);
        if (selectedCity && selectedCity.id) {
            selections[selectedCity.id]++;
        }
    }
    
    // Calculate fairness
    const expectedFrequency = iterations / nonFinalCities.length;
    let totalDeviation = 0;
    
    console.log('\nStarting City Selection Results:');
    console.log('City ID\t\tSelections\tExpected\tDeviation');
    console.log('-'.repeat(50));
    
    Object.entries(selections).forEach(([cityId, count]) => {
        const deviation = Math.abs(count - expectedFrequency);
        totalDeviation += deviation;
        console.log(`${cityId.padEnd(12)}\t${count}\t\t${expectedFrequency.toFixed(1)}\t\t${deviation.toFixed(1)}`);
    });
    
    const fairnessScore = 1 - (totalDeviation / iterations);
    const isBalanced = fairnessScore >= 0.7;
    
    console.log(`\nFairness Score: ${(fairnessScore * 100).toFixed(1)}%`);
    console.log(`Balance Status: ${isBalanced ? 'BALANCED ✅' : 'UNBALANCED ❌'}`);
    
    return { fairnessScore, isBalanced, selections };
}

function testRouteGeneration() {
    console.log('\n🗺️  Testing Route Generation...');
    
    const gameState = new MockGameState();
    const randomizationSystem = new RandomizationSystem(gameState);
    randomizationSystem.initialize();
    
    const iterations = 50;
    const cityAppearances = {};
    const nonFinalCities = mockGameData.cities.filter(city => !city.is_final);
    let validRoutes = 0;
    
    // Initialize counters
    nonFinalCities.forEach(city => {
        cityAppearances[city.id] = 0;
    });
    
    // Test route generation
    for (let i = 0; i < iterations; i++) {
        const selectedCities = randomizationSystem.balancedRandomSelection(
            nonFinalCities, 
            4, 
            { ensureUniqueness: true }
        );
        
        if (selectedCities && selectedCities.length === 4) {
            validRoutes++;
            selectedCities.forEach(city => {
                cityAppearances[city.id]++;
            });
        }
    }
    
    // Calculate fairness
    const totalAppearances = Object.values(cityAppearances).reduce((sum, count) => sum + count, 0);
    const expectedAppearances = totalAppearances / nonFinalCities.length;
    let totalDeviation = 0;
    
    console.log('\nRoute Generation Results:');
    console.log('City ID\t\tAppearances\tExpected\tDeviation');
    console.log('-'.repeat(50));
    
    Object.entries(cityAppearances).forEach(([cityId, count]) => {
        const deviation = Math.abs(count - expectedAppearances);
        totalDeviation += deviation;
        console.log(`${cityId.padEnd(12)}\t${count}\t\t${expectedAppearances.toFixed(1)}\t\t${deviation.toFixed(1)}`);
    });
    
    const fairnessScore = totalAppearances > 0 ? 1 - (totalDeviation / totalAppearances) : 0;
    const isBalanced = fairnessScore >= 0.6;
    
    console.log(`\nRoute Fairness Score: ${(fairnessScore * 100).toFixed(1)}%`);
    console.log(`Valid Routes: ${validRoutes}/${iterations} (${(validRoutes/iterations*100).toFixed(1)}%)`);
    console.log(`Balance Status: ${isBalanced ? 'BALANCED ✅' : 'UNBALANCED ❌'}`);
    
    return { fairnessScore, isBalanced, validRoutes, totalRoutes: iterations };
}

function testSystemIntegrity() {
    console.log('\n🔧 Testing System Integrity...');
    
    const gameState = new MockGameState();
    const randomizationSystem = new RandomizationSystem(gameState);
    randomizationSystem.initialize();
    
    // Test random number generation
    const randomNumbers = [];
    for (let i = 0; i < 10; i++) {
        const num = randomizationSystem.getRandom();
        randomNumbers.push(num);
    }
    
    const validNumbers = randomNumbers.every(num => 
        typeof num === 'number' && num >= 0 && num < 1
    );
    
    const uniqueNumbers = new Set(randomNumbers).size;
    const hasVariety = uniqueNumbers > 1;
    
    console.log('Random Number Generation:');
    console.log(`Generated numbers: ${randomNumbers.map(n => n.toFixed(4)).join(', ')}`);
    console.log(`Valid range (0-1): ${validNumbers ? '✅' : '❌'}`);
    console.log(`Number variety: ${hasVariety ? '✅' : '❌'} (${uniqueNumbers} unique values)`);
    
    // Test validation
    const validation = randomizationSystem.validateRandomizationIntegrity();
    console.log(`\nSystem Validation: ${validation.isValid ? '✅ VALID' : '❌ INVALID'}`);
    
    if (validation.errors.length > 0) {
        console.log('Errors:');
        validation.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    if (validation.warnings.length > 0) {
        console.log('Warnings:');
        validation.warnings.forEach(warning => console.log(`  - ${warning}`));
    }
    
    return { 
        isValid: validation.isValid, 
        validNumbers, 
        hasVariety, 
        errors: validation.errors.length,
        warnings: validation.warnings.length 
    };
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Fair Randomization System Test Suite');
    console.log('=' .repeat(60));
    
    try {
        const startingCityResults = testStartingCityFairness();
        const routeResults = testRouteGeneration();
        const systemResults = testSystemIntegrity();
        
        // Overall assessment
        console.log('\n📊 Overall Assessment');
        console.log('=' .repeat(30));
        
        const overallScore = (
            (startingCityResults.fairnessScore * 0.4) +
            (routeResults.fairnessScore * 0.4) +
            (systemResults.isValid ? 0.2 : 0)
        );
        
        const quality = overallScore >= 0.8 ? 'EXCELLENT' : 
                       overallScore >= 0.6 ? 'GOOD' : 
                       overallScore >= 0.4 ? 'FAIR' : 'POOR';
        
        console.log(`Starting City Fairness: ${startingCityResults.isBalanced ? '✅' : '❌'} (${(startingCityResults.fairnessScore * 100).toFixed(1)}%)`);
        console.log(`Route Generation Fairness: ${routeResults.isBalanced ? '✅' : '❌'} (${(routeResults.fairnessScore * 100).toFixed(1)}%)`);
        console.log(`System Integrity: ${systemResults.isValid ? '✅' : '❌'}`);
        console.log(`Overall Quality: ${quality} (${(overallScore * 100).toFixed(1)}%)`);
        
        // Recommendations
        console.log('\n💡 Recommendations:');
        if (startingCityResults.fairnessScore < 0.7) {
            console.log('  - Consider improving starting city selection algorithm');
        }
        if (routeResults.fairnessScore < 0.6) {
            console.log('  - Enhance route generation balance');
        }
        if (!systemResults.isValid) {
            console.log('  - Fix system integrity issues');
        }
        if (overallScore >= 0.8) {
            console.log('  - System is performing excellently! 🎉');
        }
        
        console.log('\n✅ Test suite completed successfully!');
        
    } catch (error) {
        console.error('❌ Test suite failed:', error.message);
        console.error(error.stack);
    }
}

// Run the tests
runAllTests();