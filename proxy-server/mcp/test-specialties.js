/**
 * Unit tests for dynamic specialty system
 * Tests custom tag parsing, deduplication, and validation
 */

// Test 1: Custom tag parsing and formatting
console.log("Test 1: Custom Tag Parsing\n" + "=".repeat(50));

function parseCustomTags(input) {
  return input
    .split(",")
    .map((s) => s.trim().toLowerCase().replace(/\s+/g, "-"))
    .filter((s) => s.length > 0 && /^[a-z0-9-]+$/.test(s));
}

const testCases = [
  {
    input: "Data Science, HR",
    expected: ["data-science", "hr"],
  },
  {
    input: "blockchain dev, Smart Contract Auditing",
    expected: ["blockchain-dev", "smart-contract-auditing"],
  },
  {
    input: "video-editing, podcast editing, Music Production",
    expected: ["video-editing", "podcast-editing", "music-production"],
  },
  {
    input: "3d modeling, Game Design, Voice Acting",
    expected: ["3d-modeling", "game-design", "voice-acting"],
  },
  {
    input: "  customer-support  , sales , project management  ",
    expected: ["customer-support", "sales", "project-management"],
  },
  {
    input: "Invalid!@#, Valid-Tag, Another_Invalid",
    expected: ["valid-tag"],
  },
];

let passed = 0;
let failed = 0;

testCases.forEach((test, i) => {
  const result = parseCustomTags(test.input);
  const success = JSON.stringify(result) === JSON.stringify(test.expected);
  
  if (success) {
    console.log(`✅ Test ${i + 1} passed`);
    console.log(`   Input: "${test.input}"`);
    console.log(`   Result: [${result.join(", ")}]\n`);
    passed++;
  } else {
    console.log(`❌ Test ${i + 1} failed`);
    console.log(`   Input: "${test.input}"`);
    console.log(`   Expected: [${test.expected.join(", ")}]`);
    console.log(`   Got: [${result.join(", ")}]\n`);
    failed++;
  }
});

console.log(`Results: ${passed} passed, ${failed} failed\n`);

// Test 2: Deduplication
console.log("Test 2: Deduplication\n" + "=".repeat(50));

function dedupeSpecialties(specialties) {
  return [...new Set(specialties)];
}

const dedupeTests = [
  {
    input: ["accounting", "legal", "accounting"],
    expected: ["accounting", "legal"],
  },
  {
    input: ["blockchain-dev", "blockchain-dev", "security"],
    expected: ["blockchain-dev", "security"],
  },
  {
    input: ["data-science", "ai-training", "data-science", "ai-training"],
    expected: ["data-science", "ai-training"],
  },
];

let dedupePassed = 0;
let dedupeFailed = 0;

dedupeTests.forEach((test, i) => {
  const result = dedupeSpecialties(test.input);
  const success = JSON.stringify(result) === JSON.stringify(test.expected);
  
  if (success) {
    console.log(`✅ Dedupe Test ${i + 1} passed`);
    console.log(`   Input: [${test.input.join(", ")}]`);
    console.log(`   Result: [${result.join(", ")}]\n`);
    dedupePassed++;
  } else {
    console.log(`❌ Dedupe Test ${i + 1} failed`);
    console.log(`   Input: [${test.input.join(", ")}]`);
    console.log(`   Expected: [${test.expected.join(", ")}]`);
    console.log(`   Got: [${result.join(", ")}]\n`);
    dedupeFailed++;
  }
});

console.log(`Results: ${dedupePassed} passed, ${dedupeFailed} failed\n`);

// Test 3: Specialty validation
console.log("Test 3: Specialty Validation\n" + "=".repeat(50));

function isValidSpecialty(specialty) {
  return specialty && /^[a-z0-9-]+$/.test(specialty);
}

const validationTests = [
  { input: "accounting", valid: true },
  { input: "blockchain-dev", valid: true },
  { input: "data-science", valid: true },
  { input: "3d-modeling", valid: true },
  { input: "Accounting", valid: false }, // uppercase
  { input: "data_science", valid: false }, // underscore
  { input: "ai/ml", valid: false }, // slash
  { input: "web3.0", valid: false }, // period
  { input: "blockchain dev", valid: false }, // space
  { input: "valid-tag-123", valid: true },
];

let validationPassed = 0;
let validationFailed = 0;

validationTests.forEach((test, i) => {
  const result = isValidSpecialty(test.input);
  const success = result === test.valid;
  
  if (success) {
    console.log(`✅ Validation Test ${i + 1} passed`);
    console.log(`   Input: "${test.input}" -> ${result ? "valid" : "invalid"}\n`);
    validationPassed++;
  } else {
    console.log(`❌ Validation Test ${i + 1} failed`);
    console.log(`   Input: "${test.input}"`);
    console.log(`   Expected: ${test.valid ? "valid" : "invalid"}`);
    console.log(`   Got: ${result ? "valid" : "invalid"}\n`);
    validationFailed++;
  }
});

console.log(`Results: ${validationPassed} passed, ${validationFailed} failed\n`);

// Test 4: Integration test - full workflow
console.log("Test 4: Full Workflow\n" + "=".repeat(50));

function processSpecialtyInput(selectedCheckboxes, customInput) {
  let specialties = [...selectedCheckboxes];
  
  // Add custom tags
  if (specialties.includes("custom")) {
    const customTags = parseCustomTags(customInput);
    specialties = specialties.filter((s) => s !== "custom").concat(customTags);
  }
  
  // Deduplicate
  specialties = [...new Set(specialties)];
  
  return specialties;
}

const workflowTests = [
  {
    checkboxes: ["accounting", "legal"],
    custom: "",
    expected: ["accounting", "legal"],
    description: "No custom tags",
  },
  {
    checkboxes: ["accounting", "custom"],
    custom: "blockchain-dev, smart-contract-auditing",
    expected: ["accounting", "blockchain-dev", "smart-contract-auditing"],
    description: "Common + custom tags",
  },
  {
    checkboxes: ["design", "custom"],
    custom: "video-editing, Design",
    expected: ["design", "video-editing"],
    description: "Deduplication (checkbox + custom)",
  },
  {
    checkboxes: ["custom"],
    custom: "data science, AI Training, Machine Learning",
    expected: ["data-science", "ai-training", "machine-learning"],
    description: "Only custom tags with spaces",
  },
];

let workflowPassed = 0;
let workflowFailed = 0;

workflowTests.forEach((test, i) => {
  const result = processSpecialtyInput(test.checkboxes, test.custom);
  const success = JSON.stringify(result.sort()) === JSON.stringify(test.expected.sort());
  
  if (success) {
    console.log(`✅ Workflow Test ${i + 1} passed`);
    console.log(`   ${test.description}`);
    console.log(`   Checkboxes: [${test.checkboxes.join(", ")}]`);
    console.log(`   Custom input: "${test.custom}"`);
    console.log(`   Result: [${result.join(", ")}]\n`);
    workflowPassed++;
  } else {
    console.log(`❌ Workflow Test ${i + 1} failed`);
    console.log(`   ${test.description}`);
    console.log(`   Checkboxes: [${test.checkboxes.join(", ")}]`);
    console.log(`   Custom input: "${test.custom}"`);
    console.log(`   Expected: [${test.expected.join(", ")}]`);
    console.log(`   Got: [${result.join(", ")}]\n`);
    workflowFailed++;
  }
});

console.log(`Results: ${workflowPassed} passed, ${workflowFailed} failed\n`);

// Summary
console.log("=" .repeat(50));
console.log("SUMMARY");
console.log("=".repeat(50));

const totalPassed = passed + dedupePassed + validationPassed + workflowPassed;
const totalFailed = failed + dedupeFailed + validationFailed + workflowFailed;
const total = totalPassed + totalFailed;

console.log(`Total tests: ${total}`);
console.log(`Passed: ${totalPassed} (${((totalPassed / total) * 100).toFixed(1)}%)`);
console.log(`Failed: ${totalFailed}`);

if (totalFailed === 0) {
  console.log("\n🎉 All tests passed!");
  process.exit(0);
} else {
  console.log(`\n⚠️  ${totalFailed} test(s) failed`);
  process.exit(1);
}
