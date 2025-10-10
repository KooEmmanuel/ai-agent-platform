import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircleIcon, XCircleIcon, ClockIcon, TrophyIcon } from '@heroicons/react/24/outline'

interface QuizQuestion {
  id: string
  type: 'mcq' | 'true_false' | 'short_answer' | 'fill_blank'
  question: string
  options?: string[]
  correct_answer: string
  explanation?: string
}

interface QuizData {
  title: string
  questions: QuizQuestion[]
  time_limit?: number
  difficulty: string
  quiz_id: string
}

interface QuizRendererProps {
  content: string
}

interface UserAnswer {
  questionId: string
  answer: string
  isCorrect?: boolean
}

export default function QuizRenderer({ content }: QuizRendererProps) {
  const [quizData, setQuizData] = useState<QuizData | null>(null)
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [quizCompleted, setQuizCompleted] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [score, setScore] = useState<{ correct: number; total: number; percentage: number } | null>(null)

  // Parse quiz content from markdown
  useEffect(() => {
    console.log('🔍 QuizRenderer: Starting quiz content parsing...')
    console.log('📄 QuizRenderer: Full content length:', content.length)
    console.log('📄 QuizRenderer: Content preview (first 500 chars):', content.substring(0, 500))
    console.log('📄 QuizRenderer: Content preview (last 200 chars):', content.substring(Math.max(0, content.length - 200)))
    
    // Quick content validation
    console.log('🔍 QuizRenderer: Content validation:')
    console.log('📋 QuizRenderer: - Contains "# Quiz:":', content.includes('# Quiz:'))
    console.log('📋 QuizRenderer: - Contains "## Question":', content.includes('## Question'))
    console.log('📋 QuizRenderer: - Contains "**Question:**":', content.includes('**Question:**'))
    console.log('📋 QuizRenderer: - Contains "**Answer:**":', content.includes('**Answer:**'))
    console.log('📋 QuizRenderer: - Contains "**Settings:**":', content.includes('**Settings:**'))
    console.log('📋 QuizRenderer: - Contains "Quiz ID":', content.includes('Quiz ID'))
    
    const parsedQuiz = parseQuizContent(content)
    console.log('✅ QuizRenderer: Parsed quiz data:', parsedQuiz)
    
    if (parsedQuiz) {
      console.log('🎉 QuizRenderer: Successfully parsed quiz with', parsedQuiz.questions?.length || 0, 'questions')
      setQuizData(parsedQuiz)
      setTimeRemaining(parsedQuiz.time_limit || null)
    } else {
      console.error('❌ QuizRenderer: Failed to parse quiz content - check parsing logic')
      console.error('❌ QuizRenderer: This will show the "Unable to load quiz questions" error')
      console.error('❌ QuizRenderer: Content analysis complete - check logs above for specific failure points')
    }
  }, [content])

  // Timer countdown
  useEffect(() => {
    if (timeRemaining && timeRemaining > 0 && !quizCompleted) {
      const timer = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (timeRemaining === 0) {
      handleSubmitQuiz()
    }
  }, [timeRemaining, quizCompleted])

  const parseQuizContent = (content: string): QuizData | null => {
    try {
      console.log('🔍 QuizRenderer: Starting parseQuizContent...')
      
      // Extract quiz title
      console.log('🔍 QuizRenderer: Looking for quiz title pattern: /# Quiz: (.+)/')
      const titleMatch = content.match(/# Quiz: (.+)/)
      if (!titleMatch) {
        console.error('❌ QuizRenderer: No quiz title found! Expected format: "# Quiz: [title]"')
        console.error('❌ QuizRenderer: Content does not start with proper quiz header')
        return null
      }
      const title = titleMatch[1]
      console.log('✅ QuizRenderer: Found quiz title:', title)

      // Extract settings
      console.log('🔍 QuizRenderer: Looking for settings section...')
      const settingsMatch = content.match(/\*\*Settings:\*\*\n([\s\S]*?)\n---/)
      const settings = settingsMatch ? settingsMatch[1] : ''
      console.log('✅ QuizRenderer: Settings section found:', settings ? 'Yes' : 'No')
      if (settings) {
        console.log('📋 QuizRenderer: Settings content:', settings)
      }

      // Extract time limit
      console.log('🔍 QuizRenderer: Looking for time limit...')
      const timeLimitMatch = settings.match(/- Time Limit: (\d+) seconds/)
      const timeLimit = timeLimitMatch ? parseInt(timeLimitMatch[1]) : undefined
      console.log('✅ QuizRenderer: Time limit:', timeLimit || 'Not specified')

      // Extract difficulty
      console.log('🔍 QuizRenderer: Looking for difficulty...')
      const difficultyMatch = settings.match(/- Difficulty: (\w+)/)
      const difficulty = difficultyMatch ? difficultyMatch[1].toLowerCase() : 'medium'
      console.log('✅ QuizRenderer: Difficulty:', difficulty)

      // Extract quiz ID
      console.log('🔍 QuizRenderer: Looking for quiz ID...')
      const quizIdMatch = content.match(/\*\*Quiz ID:\*\* (.+)/)
      const quizId = quizIdMatch ? quizIdMatch[1] : `quiz_${Date.now()}`
      console.log('✅ QuizRenderer: Quiz ID:', quizId)

      // Parse questions
      console.log('🔍 QuizRenderer: Looking for question blocks...')
      const questions: QuizQuestion[] = []
      const questionMatches = content.match(/## Question \d+\n([\s\S]*?)(?=## Question \d+|\*\*Quiz ID:\*\*)/g)

      if (questionMatches) {
        console.log(`✅ QuizRenderer: Found ${questionMatches.length} question blocks`)
        questionMatches.forEach((questionBlock, index) => {
          console.log(`🔍 QuizRenderer: Parsing question ${index + 1}...`)
          console.log(`📄 QuizRenderer: Question block preview:`, questionBlock.substring(0, 200) + '...')
          const question = parseQuestion(questionBlock, index + 1)
          if (question) {
            questions.push(question)
            console.log(`✅ QuizRenderer: Successfully parsed question ${index + 1}:`, question.type)
          } else {
            console.error(`❌ QuizRenderer: Failed to parse question ${index + 1}`)
            console.error(`❌ QuizRenderer: Question block that failed:`, questionBlock)
          }
        })
      } else {
        console.error('❌ QuizRenderer: No question blocks found!')
        console.error('❌ QuizRenderer: Expected format: "## Question [number]"')
        console.error('❌ QuizRenderer: Content structure analysis:')
        console.error('❌ QuizRenderer: - Contains "## Question":', content.includes('## Question'))
        console.error('❌ QuizRenderer: - Contains "Quiz ID":', content.includes('Quiz ID'))
        console.error('❌ QuizRenderer: - All "##" headers:', content.match(/## .+/g))
      }

      const result = {
        title,
        questions,
        time_limit: timeLimit,
        difficulty,
        quiz_id: quizId
      }
      
      console.log('🎉 QuizRenderer: Final parsed result:', result)
      console.log('📊 QuizRenderer: Total questions parsed:', questions.length)
      
      return result
    } catch (error) {
      console.error('💥 QuizRenderer: Exception in parseQuizContent:', error)
      console.error('💥 QuizRenderer: Error stack:', error.stack)
      return null
    }
  }

  const parseQuestion = (questionBlock: string, questionNumber: number): QuizQuestion | null => {
    try {
      console.log(`🔍 QuizRenderer: Parsing question ${questionNumber}...`)
      console.log(`📄 QuizRenderer: Question block:`, questionBlock)
      
      // Extract question type
      console.log(`🔍 QuizRenderer: Looking for question type...`)
      const typeMatch = questionBlock.match(/\*\*Type:\*\* (.+)/)
      const type = typeMatch ? typeMatch[1].toLowerCase().replace(' ', '_') as QuizQuestion['type'] : 'mcq'
      console.log(`✅ QuizRenderer: Question type:`, type)

      // Extract question text - handle the actual format (no **Question:** marker)
      console.log(`🔍 QuizRenderer: Looking for question text...`)
      // Remove the "## Question X" header first
      const contentWithoutHeader = questionBlock.replace(/^## Question \d+\n/, '')
      // Extract text until we hit the first option or end
      const questionMatch = contentWithoutHeader.match(/^([\s\S]*?)(?=\n- [A-D]\)|$)/)
      const question = questionMatch ? questionMatch[1].trim() : ''
      console.log(`✅ QuizRenderer: Question text:`, question ? 'Found' : 'NOT FOUND')
      if (question) {
        console.log(`📝 QuizRenderer: Question content:`, question)
      }

      // Extract options for MCQ and True/False
      console.log(`🔍 QuizRenderer: Looking for options...`)
      const options: string[] = []
      if (type === 'mcq' || type === 'true_false') {
        // Look for options in format "- A) text" or "- B) text"
        const optionMatches = questionBlock.match(/- [A-D]\) (.+)/g)
        if (optionMatches) {
          options.push(...optionMatches.map(match => match.replace(/- [A-D]\) /, '')))
        }
        console.log(`✅ QuizRenderer: Found ${options.length} options:`, options)
      } else {
        console.log(`✅ QuizRenderer: No options needed for type:`, type)
      }

      // Extract correct answer - look for it after the options
      console.log(`🔍 QuizRenderer: Looking for correct answer...`)
      // For now, we'll need to infer the correct answer or look for a different pattern
      // The current format doesn't seem to have explicit **Answer:** markers
      const correct_answer = '' // We'll need to handle this differently
      console.log(`✅ QuizRenderer: Correct answer:`, correct_answer ? 'Found' : 'NOT FOUND - Need to implement answer detection')
      if (correct_answer) {
        console.log(`📝 QuizRenderer: Answer content:`, correct_answer)
      }

      // Extract explanation
      console.log(`🔍 QuizRenderer: Looking for explanation...`)
      const explanationMatch = questionBlock.match(/\*\*Explanation:\*\* ([\s\S]*?)(?=\n\n|$)/)
      const explanation = explanationMatch ? explanationMatch[1].trim() : ''
      console.log(`✅ QuizRenderer: Explanation:`, explanation ? 'Found' : 'Not provided')

      // Validate that we have the essential data
      if (!question) {
        console.error(`❌ QuizRenderer: Question ${questionNumber} has no question text - this will cause parsing to fail`)
        console.error(`❌ QuizRenderer: Question block that failed:`, questionBlock)
        return null
      }

      if (!correct_answer) {
        console.warn(`⚠️ QuizRenderer: Question ${questionNumber} has no correct answer - quiz will work but won't show correct answers`)
      }

      const result = {
        id: `q${questionNumber}`,
        type,
        question,
        options: options.length > 0 ? options : undefined,
        correct_answer,
        explanation
      }
      
      console.log(`✅ QuizRenderer: Successfully parsed question ${questionNumber}:`, result)
      return result
    } catch (error) {
      console.error(`💥 QuizRenderer: Exception parsing question ${questionNumber}:`, error)
      console.error(`💥 QuizRenderer: Error stack:`, error.stack)
      console.error(`💥 QuizRenderer: Question block that caused error:`, questionBlock)
      return null
    }
  }

  const handleAnswerSelect = (questionId: string, answer: string, event?: React.MouseEvent) => {
    // Prevent any default behavior that might cause scrolling or form submission
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    
    setUserAnswers(prev => {
      const existing = prev.find(a => a.questionId === questionId)
      if (existing) {
        return prev.map(a => a.questionId === questionId ? { ...a, answer } : a)
      } else {
        return [...prev, { questionId, answer }]
      }
    })
  }

  const handleSubmitQuiz = () => {
    if (!quizData) return

    // Calculate score
    let correct = 0
    const scoredAnswers = userAnswers.map(userAnswer => {
      const question = quizData.questions.find(q => q.id === userAnswer.questionId)
      const isCorrect = question && userAnswer.answer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim()
      if (isCorrect) correct++
      
      return {
        ...userAnswer,
        isCorrect
      }
    })

    setUserAnswers(scoredAnswers)
    setScore({
      correct,
      total: quizData.questions.length,
      percentage: Math.round((correct / quizData.questions.length) * 100)
    })
    setQuizCompleted(true)
    setShowResults(true)
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getScoreColor = (percentage: number): string => {
    if (percentage >= 80) return 'text-green-600'
    if (percentage >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreIcon = (percentage: number) => {
    if (percentage >= 80) return <TrophyIcon className="w-8 h-8 text-yellow-500" />
    if (percentage >= 60) return <CheckCircleIcon className="w-8 h-8 text-yellow-500" />
    return <XCircleIcon className="w-8 h-8 text-red-500" />
  }

  if (!quizData) {
    return null // Not a quiz, let markdown renderer handle it
  }

  const currentQuestion = quizData.questions[currentQuestionIndex]
  
  // Safety check for currentQuestion
  if (!currentQuestion) {
    return (
      <div className="quiz-container bg-white rounded-lg shadow-lg border border-gray-200 p-6 max-w-4xl mx-auto">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Quiz Error</h1>
          <p className="text-gray-600">Unable to load quiz questions. Please try again.</p>
        </div>
      </div>
    )
  }

  const userAnswer = userAnswers.find(a => a.questionId === currentQuestion.id)

  return (
    <div 
      className="quiz-container bg-white rounded-lg shadow-lg border border-gray-200 p-6 max-w-4xl mx-auto" 
      style={{ minHeight: '400px' }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Quiz Header */}
      <div className="quiz-header mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">{quizData.title}</h1>
          {timeRemaining !== null && (
            <div className="flex items-center space-x-2 text-red-600">
              <ClockIcon className="w-5 h-5" />
              <span className="font-mono text-lg">{formatTime(timeRemaining)}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Difficulty: <span className="capitalize font-medium">{quizData.difficulty}</span></span>
          <span>Question {currentQuestionIndex + 1} of {quizData.questions.length}</span>
        </div>
      </div>

      {!showResults ? (
        <>
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-blue-600 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${((currentQuestionIndex + 1) / quizData.questions.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Current Question */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="question-container mb-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {currentQuestion.question}
              </h3>

              {/* Question Type Specific Rendering */}
              {currentQuestion.type === 'mcq' && currentQuestion.options && (
                <div className="space-y-3">
                  {currentQuestion.options.map((option, index) => (
                    <label
                      key={index}
                      className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        userAnswer?.answer === option
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleAnswerSelect(currentQuestion.id, option, e)
                      }}
                    >
                      <input
                        type="radio"
                        name={`question-${currentQuestion.id}`}
                        value={option}
                        checked={userAnswer?.answer === option}
                        onChange={(e) => handleAnswerSelect(currentQuestion.id, e.target.value)}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                        userAnswer?.answer === option
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {userAnswer?.answer === option && (
                          <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                        )}
                      </div>
                      <span className="text-gray-900">{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {currentQuestion.type === 'true_false' && currentQuestion.options && (
                <div className="space-y-3">
                  {currentQuestion.options.map((option, index) => (
                    <label
                      key={index}
                      className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        userAnswer?.answer === option
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleAnswerSelect(currentQuestion.id, option, e)
                      }}
                    >
                      <input
                        type="radio"
                        name={`question-${currentQuestion.id}`}
                        value={option}
                        checked={userAnswer?.answer === option}
                        onChange={(e) => handleAnswerSelect(currentQuestion.id, e.target.value)}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                        userAnswer?.answer === option
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {userAnswer?.answer === option && (
                          <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                        )}
                      </div>
                      <span className="text-gray-900">{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {(currentQuestion.type === 'short_answer' || currentQuestion.type === 'fill_blank') && (
                <div>
                  <textarea
                    value={userAnswer?.answer || ''}
                    onChange={(e) => handleAnswerSelect(currentQuestion.id, e.target.value)}
                    placeholder="Enter your answer..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <button
              onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <div className="flex space-x-2">
              {currentQuestionIndex === quizData.questions.length - 1 ? (
                <button
                  onClick={handleSubmitQuiz}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Submit Quiz
                </button>
              ) : (
                <button
                  onClick={() => setCurrentQuestionIndex(Math.min(quizData.questions.length - 1, currentQuestionIndex + 1))}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Results Screen */
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="results-container text-center"
        >
          <div className="mb-6">
            {getScoreIcon(score!.percentage)}
            <h2 className="text-2xl font-bold text-gray-900 mt-4 mb-2">Quiz Complete!</h2>
            <div className={`text-4xl font-bold ${getScoreColor(score!.percentage)}`}>
              {score!.percentage}%
            </div>
            <p className="text-gray-600 mt-2">
              You got {score!.correct} out of {score!.total} questions correct
            </p>
          </div>

          {/* Detailed Results */}
          <div className="space-y-4 mb-6">
            {quizData.questions.map((question, index) => {
              const userAnswer = userAnswers.find(a => a.questionId === question.id)
              return (
                <div
                  key={question.id}
                  className={`p-4 rounded-lg border-2 ${
                    userAnswer?.isCorrect
                      ? 'border-green-200 bg-green-50'
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900">Question {index + 1}</h4>
                    {userAnswer?.isCorrect ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircleIcon className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <p className="text-gray-700 mb-2">{question.question}</p>
                  <div className="text-sm">
                    <p><strong>Your answer:</strong> {userAnswer?.answer || 'No answer'}</p>
                    <p><strong>Correct answer:</strong> {question.correct_answer}</p>
                    {question.explanation && (
                      <p className="mt-2 text-gray-600"><strong>Explanation:</strong> {question.explanation}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <button
            onClick={() => {
              setShowResults(false)
              setCurrentQuestionIndex(0)
              setUserAnswers([])
              setQuizCompleted(false)
              setScore(null)
              setTimeRemaining(quizData.time_limit || null)
            }}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retake Quiz
          </button>
        </motion.div>
      )}
    </div>
  )
}
