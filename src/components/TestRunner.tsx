/**
 * Test Runner Component
 * 
 * Accessible from Admin Panel to run comprehensive tests.
 * Shows visual results for all component and E2E tests.
 */

import { useState } from 'react';
import { 
  runAllTests,
  type TestResult as ComponentTestResult
} from '../tests/componentTests';
import {
  runAllE2ETests,
  runTestCategory,
  type TestResult as E2ETestResult
} from '../tests/e2eTests';
import { 
  Beaker, 
  CheckCircle, 
  XCircle, 
  Play, 
  Loader2,
  Shield,
  ShoppingBag,
  Palette,
  Package,
  HardDrive,
  Navigation,
  CreditCard,
  Lock,
  ClipboardList,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface TestGroup {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  testNames: string[];
}

const COMPONENT_TEST_GROUPS: TestGroup[] = [
  { 
    id: 'connection', 
    name: 'Connection', 
    icon: <Shield className="w-4 h-4" />, 
    description: 'Supabase and auth connectivity',
    testNames: ['Supabase Connection', 'Auth Session Check'] 
  },
  { 
    id: 'rls', 
    name: 'RLS Policies', 
    icon: <Shield className="w-4 h-4" />, 
    description: 'Row Level Security validation',
    testNames: ['RLS - Check Admin Role'] 
  },
  { 
    id: 'products', 
    name: 'Products', 
    icon: <ShoppingBag className="w-4 h-4" />, 
    description: 'Product CRUD operations',
    testNames: ['Products - List', 'Products - Create', 'Products - Update', 'Products - Delete'] 
  },
  { 
    id: 'patches', 
    name: 'Patches', 
    icon: <Palette className="w-4 h-4" />, 
    description: 'Patch CRUD operations',
    testNames: ['Patches - List', 'Patches - Create', 'Patches - Update', 'Patches - Delete'] 
  },
  { 
    id: 'orders', 
    name: 'Orders', 
    icon: <Package className="w-4 h-4" />, 
    description: 'Order management',
    testNames: ['Orders - List', 'Orders - Create'] 
  },
  { 
    id: 'storage', 
    name: 'Storage', 
    icon: <HardDrive className="w-4 h-4" />, 
    description: 'Storage bucket verification',
    testNames: ['Storage - Check Buckets'] 
  },
];

const E2E_TEST_GROUPS: TestGroup[] = [
  { 
    id: 'navigation', 
    name: 'Navigation', 
    icon: <Navigation className="w-4 h-4" />, 
    description: 'Page navigation and content loading',
    testNames: ['Landing Page - Load', 'Navigation - Products Available', 'Navigation - Patches Available', 'Navigation - Customize Page', 'Navigation - Auth Pages'] 
  },
  { 
    id: 'checkout', 
    name: 'Checkout Flow', 
    icon: <CreditCard className="w-4 h-4" />, 
    description: 'Cart and checkout process',
    testNames: ['Checkout - Cart Operations', 'Checkout - Order Creation', 'Checkout - Order Status Flow'] 
  },
  { 
    id: 'stripe', 
    name: 'Stripe', 
    icon: <CreditCard className="w-4 h-4" />, 
    description: 'Payment integration tests',
    testNames: ['Stripe - Configuration Check', 'Stripe - Edge Function Available', 'Stripe - Webhook Endpoint', 'Stripe - Currency Settings'] 
  },
  { 
    id: 'security', 
    name: 'Security', 
    icon: <Lock className="w-4 h-4" />, 
    description: 'RLS, auth, and protection tests',
    testNames: ['Security - Products RLS', 'Security - Order Isolation', 'Security - Admin Requires Auth', 'Security - Payment Intent Protection', 'Security - Amount Validation'] 
  },
  { 
    id: 'audit', 
    name: 'Audit', 
    icon: <ClipboardList className="w-4 h-4" />, 
    description: 'Audit logging and tracking',
    testNames: ['Audit - Order Creation Trail', 'Audit - User Profile'] 
  },
];

type TestType = 'component' | 'e2e';
type CombinedResult = (ComponentTestResult | E2ETestResult) & { testType: TestType };

export function TestRunner() {
  const [results, setResults] = useState<CombinedResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<TestType>('component');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const handleRunAll = async () => {
    setIsRunning(true);
    setResults([]);
    
    if (activeTab === 'component') {
      const componentResults = await runAllTests();
      setResults(componentResults.map(r => ({ ...r, testType: 'component' })));
    } else {
      const e2eResults = await runAllE2ETests();
      setResults(e2eResults.map(r => ({ ...r, testType: 'e2e' })));
    }
    
    setIsRunning(false);
  };

  const handleRunCategory = async (category: string) => {
    setIsRunning(true);
    setResults([]);
    
    const e2eResults = await runTestCategory(category as any);
    setResults(e2eResults.map(r => ({ ...r, testType: 'e2e' })));
    
    setIsRunning(false);
  };

  const currentGroups = activeTab === 'component' ? COMPONENT_TEST_GROUPS : E2E_TEST_GROUPS;
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  const getTestResult = (testName: string) => {
    return results.find(r => r.name === testName);
  };

  const getGroupResults = (group: TestGroup) => {
    return group.testNames.map(t => getTestResult(t)).filter(Boolean) as CombinedResult[];
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Beaker className="w-6 h-6 text-white" />
            <div>
              <h2 className="text-lg font-bold text-white">Test Suite</h2>
              <p className="text-indigo-100 text-sm">Component & E2E Testing</p>
            </div>
          </div>
          <button
            onClick={handleRunAll}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRunning ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Running...</>
            ) : (
              <><Play className="w-4 h-4" /> Run All {activeTab === 'component' ? 'Component' : 'E2E'} Tests</>
            )}
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => { setActiveTab('component'); setResults([]); }}
          className={`flex-1 px-6 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'component' 
              ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Component Tests ({COMPONENT_TEST_GROUPS.length} groups)
        </button>
        <button
          onClick={() => { setActiveTab('e2e'); setResults([]); }}
          className={`flex-1 px-6 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'e2e' 
              ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          E2E Tests ({E2E_TEST_GROUPS.length} groups)
        </button>
      </div>

      {/* Summary Stats */}
      {results.length > 0 && (
        <div className="grid grid-cols-3 border-b border-gray-200 bg-gray-50">
          <div className="px-6 py-4 border-r border-gray-200">
            <div className="text-2xl font-bold text-green-600">{passedCount}</div>
            <div className="text-sm text-gray-500">Passed</div>
          </div>
          <div className="px-6 py-4 border-r border-gray-200">
            <div className={`text-2xl font-bold ${failedCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
              {failedCount}
            </div>
            <div className="text-sm text-gray-500">Failed</div>
          </div>
          <div className="px-6 py-4">
            <div className="text-2xl font-bold text-gray-800">{totalDuration.toFixed(0)}ms</div>
            <div className="text-sm text-gray-500">Duration</div>
          </div>
        </div>
      )}

      {/* Test Groups */}
      <div className="divide-y divide-gray-100">
        {currentGroups.map((group) => {
          const groupResults = getGroupResults(group);
          const groupFailed = groupResults.filter(r => !r.passed).length;
          const isComplete = groupResults.length === group.testNames.length;
          const isExpanded = expandedGroups.has(group.id);

          return (
            <div key={group.id} className="bg-white">
              {/* Group Header */}
              <div 
                className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => toggleGroup(group.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      {group.icon}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">{group.name}</span>
                      <p className="text-xs text-gray-500">{group.description}</p>
                    </div>
                    {isComplete && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        groupFailed > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {groupFailed > 0 ? `${groupFailed} failed` : 'All passed'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {activeTab === 'e2e' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRunCategory(group.id);
                        }}
                        disabled={isRunning}
                        className="px-3 py-1 text-xs bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 disabled:opacity-50"
                      >
                        Run
                      </button>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Individual Tests - Collapsible */}
              {isExpanded && (
                <div className="px-6 pb-4">
                  <div className="ml-11 space-y-2">
                    {group.testNames.map((testName) => {
                      const result = getTestResult(testName);
                      return (
                        <div 
                          key={testName}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            result ? (result.passed ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100') : 'bg-gray-50 border border-gray-100'
                          }`}
                        >
                          <span className={`text-sm font-medium ${
                            result ? (result.passed ? 'text-green-800' : 'text-red-800') : 'text-gray-500'
                          }`}>
                            {testName}
                          </span>
                          {result && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">{result.duration.toFixed(0)}ms</span>
                              {result.passed ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-600" />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {results.length === 0 && !isRunning && (
        <div className="px-6 py-12 text-center">
          <Beaker className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">
            No {activeTab === 'component' ? 'component' : 'E2E'} tests have been run yet
          </p>
          <p className="text-sm text-gray-400">Click "Run All Tests" to start testing</p>
        </div>
      )}

      {/* Running State */}
      {isRunning && results.length === 0 && (
        <div className="px-6 py-12 text-center">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Running {activeTab === 'component' ? 'component' : 'E2E'} tests...</p>
          <p className="text-sm text-gray-400 mt-2">This may take a few seconds</p>
        </div>
      )}

      {/* Error Details */}
      {results.filter(r => !r.passed).length > 0 && (
        <div className="px-6 py-4 bg-red-50 border-t border-red-100">
          <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            Failed Tests ({results.filter(r => !r.passed).length})
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {results.filter(r => !r.passed).map((result, idx) => (
              <div key={idx} className="p-3 bg-white rounded-lg border border-red-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">
                    {result.testType === 'e2e' && 'category' in result ? (result as any).category : 'component'}
                  </span>
                  <span className="font-medium text-red-800">{result.name}</span>
                </div>
                <div className="text-sm text-red-600 mt-1">{result.error}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default TestRunner;
