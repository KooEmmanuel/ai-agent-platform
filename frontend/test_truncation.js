// Test the truncation function
function truncateName(name, maxLength = 20) {
  if (name.length <= maxLength) return name
  return name.substring(0, maxLength) + '...'
}

// Test cases
const testNames = [
  "Short Name",
  "This is a medium length name",
  "https://www.kwickflow.com/",
  "Very Long Collection Name That Should Be Truncated",
  "Another Very Long Collection Name With Special Characters @#$%^&*()"
]

console.log("Testing collection name truncation:")
testNames.forEach(name => {
  console.log(`"${name}" -> "${truncateName(name)}"`)
}) 