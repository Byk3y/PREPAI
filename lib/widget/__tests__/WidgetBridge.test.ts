/**
 * Widget Bridge Tests
 * Manual test file for verifying bridge functionality
 *
 * Usage:
 * 1. Import this in a React Native component
 * 2. Call testWidgetBridge() from a button or useEffect
 * 3. Check console logs for results
 */

import { WidgetBridge, buildWidgetData, getPlaceholderWidgetData } from '../index';

/**
 * Test 1: Module availability
 */
export async function testModuleAvailability() {
  console.log('🧪 Test 1: Module Availability');
  console.log('  isAvailable:', WidgetBridge.isAvailable);
  console.log('  appGroupIdentifier:', WidgetBridge.appGroupIdentifier);

  if (!WidgetBridge.isAvailable) {
    console.warn('  ⚠️ Widget bridge not available (expected on non-iOS platforms)');
    return false;
  }

  console.log('  ✅ Module is available');
  return true;
}

/**
 * Test 2: Update widget data
 */
export async function testUpdateWidgetData() {
  console.log('\n🧪 Test 2: Update Widget Data');

  try {
    const testData = getPlaceholderWidgetData();
    console.log('  Sending data:', JSON.stringify(testData, null, 2));

    await WidgetBridge.updateWidgetData(testData);
    console.log('  ✅ Data updated successfully');
    return true;
  } catch (error) {
    console.error('  ❌ Update failed:', error);
    return false;
  }
}

/**
 * Test 3: Get widget data
 */
export async function testGetWidgetData() {
  console.log('\n🧪 Test 3: Get Widget Data');

  try {
    const data = await WidgetBridge.getWidgetData();

    if (data) {
      console.log('  Retrieved data:', JSON.stringify(data, null, 2));
      console.log('  ✅ Data retrieved successfully');
      return true;
    } else {
      console.warn('  ⚠️ No data found (expected if no update was made yet)');
      return false;
    }
  } catch (error) {
    console.error('  ❌ Get failed:', error);
    return false;
  }
}

/**
 * Test 4: Data validation
 */
export async function testDataValidation() {
  console.log('\n🧪 Test 4: Data Validation');

  try {
    const isValid = await WidgetBridge.isDataValid();
    console.log('  Data is valid:', isValid);

    if (isValid) {
      console.log('  ✅ Data is fresh (<24 hours old)');
      return true;
    } else {
      console.warn('  ⚠️ Data is stale or missing');
      return false;
    }
  } catch (error) {
    console.error('  ❌ Validation check failed:', error);
    return false;
  }
}

/**
 * Test 5: Build widget data from mock state
 */
export async function testBuildWidgetData() {
  console.log('\n🧪 Test 5: Build Widget Data');

  try {
    const mockUserState = {
      streak: 15,
      lastStreakDate: '2026-01-06',
      securedToday: true,
      lastSecureDate: '2026-01-06',
      sessionsToday: 3,
      petName: 'TestPet',
      petStage: 2 as const,
      nearestExam: {
        title: 'WAEC 2026',
        date: '2026-05-15',
      },
    };

    const widgetData = buildWidgetData(mockUserState);
    console.log('  Built data:', JSON.stringify(widgetData, null, 2));

    // Validate structure
    if (widgetData.streak === 15 &&
        widgetData.pet.name === 'TestPet' &&
        widgetData.pet.stage === 2 &&
        widgetData.pet.isDying === false) {
      console.log('  ✅ Widget data built correctly');

      // Try updating with built data
      await WidgetBridge.updateWidgetData(widgetData);
      console.log('  ✅ Widget updated with built data');
      return true;
    } else {
      console.error('  ❌ Widget data structure incorrect');
      return false;
    }
  } catch (error) {
    console.error('  ❌ Build failed:', error);
    return false;
  }
}

/**
 * Test 6: Reload timelines
 */
export async function testReloadTimelines() {
  console.log('\n🧪 Test 6: Reload Timelines');

  try {
    await WidgetBridge.reloadTimelines();
    console.log('  ✅ Timelines reloaded successfully');
    return true;
  } catch (error) {
    console.error('  ❌ Reload failed:', error);
    return false;
  }
}

/**
 * Test 7: Clear widget data
 */
export async function testClearWidgetData() {
  console.log('\n🧪 Test 7: Clear Widget Data');

  try {
    await WidgetBridge.clearWidgetData();
    console.log('  ✅ Data cleared successfully');

    // Verify data is gone
    const data = await WidgetBridge.getWidgetData();
    if (data === null) {
      console.log('  ✅ Verified data is cleared');
      return true;
    } else {
      console.warn('  ⚠️ Data still exists after clear');
      return false;
    }
  } catch (error) {
    console.error('  ❌ Clear failed:', error);
    return false;
  }
}

/**
 * Run all tests
 */
export async function runAllWidgetTests() {
  console.log('═══════════════════════════════════════');
  console.log('🧪 WIDGET BRIDGE TEST SUITE');
  console.log('═══════════════════════════════════════\n');

  const results = {
    moduleAvailability: await testModuleAvailability(),
    updateData: false,
    getData: false,
    validation: false,
    buildData: false,
    reloadTimelines: false,
    clearData: false,
  };

  // Only run remaining tests if module is available
  if (results.moduleAvailability) {
    results.updateData = await testUpdateWidgetData();
    results.getData = await testGetWidgetData();
    results.validation = await testDataValidation();
    results.buildData = await testBuildWidgetData();
    results.reloadTimelines = await testReloadTimelines();
    results.clearData = await testClearWidgetData();
  }

  // Summary
  console.log('\n═══════════════════════════════════════');
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('═══════════════════════════════════════');

  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;

  Object.entries(results).forEach(([name, passed]) => {
    const icon = passed ? '✅' : '❌';
    console.log(`  ${icon} ${name}`);
  });

  console.log('\n  Results:', `${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('  🎉 All tests passed!');
  } else {
    console.log('  ⚠️ Some tests failed - check logs above');
  }

  console.log('═══════════════════════════════════════\n');

  return results;
}

// Export individual tests for selective testing
export const WidgetBridgeTests = {
  runAll: runAllWidgetTests,
  moduleAvailability: testModuleAvailability,
  updateData: testUpdateWidgetData,
  getData: testGetWidgetData,
  validation: testDataValidation,
  buildData: testBuildWidgetData,
  reloadTimelines: testReloadTimelines,
  clearData: testClearWidgetData,
};

export default WidgetBridgeTests;
