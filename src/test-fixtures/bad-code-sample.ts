/**
 * Bad Code Sample for OpenCode Style Checker Testing
 * This file intentionally contains all style violations for testing purposes
 */

// Violation: no-any (line 8)
function processUser(user: any): string {
  // Violation: no-let (line 10)
  let result = "";
  
  // Violation: no-else (line 14)
  if (user.isActive) {
    // Violation: no-let (line 15), single-word (userName)
    let userName = user.name;
    result = `Welcome, ${userName}!`;
  } else {
    result = "User is inactive";
  }
  
  // Violation: no-try-catch (line 21)
  try {
    // Violation: no-destructure (line 23)
    const { email } = user;
    console.log(email);
  } catch (e) {
    console.error(e);
  }
  
  return result;
}

// Another example with multiple violations
function validateData(data: any): boolean {
  let isValid = false;
  
  if (data.value > 0) {
    isValid = true;
  } else {
    isValid = false;
  }
  
  return isValid;
}

export const BAD_CODE_SAMPLE = `
function processUser(user: any): string {
  let result = "";
  
  if (user.isActive) {
    let userName = user.name;
    result = \`Welcome, \${userName}!\`;
  } else {
    result = "User is inactive";
  }
  
  try {
    const { email } = user;
    console.log(email);
  } catch (e) {
    console.error(e);
  }
  
  return result;
}
`;

export const EXPECTED_COMPLIANT_CODE = `
interface User {
  isActive: boolean;
  name: string;
  email: string;
}

function processUser(user: User): string {
  if (!user.isActive) return "User is inactive";
  
  const name = user.name;
  const email = user.email;
  console.log(email);
  
  return \`Welcome, \${name}!\`;
}
`;

export { processUser, validateData };
