import React from 'react'
import QuizRenderer from './QuizRenderer'

// Sample quiz content for testing
const sampleQuizContent = `# Quiz: JavaScript Fundamentals

**Settings:**
- Questions: 3
- Time Limit: No time limit
- Difficulty: Medium

---

## Question 1
**Type:** Mcq
**Question:** What is the correct way to declare a variable in JavaScript?

- [ ] var myVar = 10;
- [ ] let myVar = 10;
- [ ] const myVar = 10;
- [ ] All of the above

**Answer:** All of the above
**Explanation:** JavaScript supports var, let, and const for variable declaration, each with different scoping rules.

---

## Question 2
**Type:** True False
**Question:** JavaScript is a statically typed language.

- [ ] True
- [ ] False

**Answer:** False
**Explanation:** JavaScript is a dynamically typed language, meaning variable types are determined at runtime.

---

## Question 3
**Type:** Short Answer
**Question:** What does DOM stand for?

**Answer:** Document Object Model
**Explanation:** The DOM is a programming interface for web documents that represents the page structure.

---

**Quiz ID:** quiz_test_123
**Total Questions:** 3`

export default function QuizTest() {
  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Quiz Renderer Test</h1>
        <QuizRenderer content={sampleQuizContent} />
      </div>
    </div>
  )
}
