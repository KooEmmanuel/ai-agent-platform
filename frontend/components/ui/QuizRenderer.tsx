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
    console.log('QuizRenderer: Parsing quiz content:', content.substring(0, 200) + '...')
    const parsedQuiz = parseQuizContent(content)
    console.log('QuizRenderer: Parsed quiz data:', parsedQuiz)
    if (parsedQuiz) {
      setQuizData(parsedQuiz)
      setTimeRemaining(parsedQuiz.time_limit || null)
    } else {
      console.log('QuizRenderer: Failed to parse quiz content')
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
      // Extract quiz title
      const titleMatch = content.match(/# Quiz: (.+)/)
      if (!titleMatch) return null

      const title = titleMatch[1]

      // Extract settings
      const settingsMatch = content.match(/\*\*Settings:\*\*\n([\s\S]*?)\n---/)
      const settings = settingsMatch ? settingsMatch[1] : ''

      // Extract time limit
      const timeLimitMatch = settings.match(/- Time Limit: (\d+) seconds/)
      const timeLimit = timeLimitMatch ? parseInt(timeLimitMatch[1]) : undefined

      // Extract difficulty
      const difficultyMatch = settings.match(/- Difficulty: (\w+)/)
      const difficulty = difficultyMatch ? difficultyMatch[1].toLowerCase() : 'medium'

      // Extract quiz ID
      const quizIdMatch = content.match(/\*\*Quiz ID:\*\* (.+)/)
      const quizId = quizIdMatch ? quizIdMatch[1] : `quiz_${Date.now()}`

      // Parse questions
      const questions: QuizQuestion[] = []
      const questionMatches = content.match(/## Question \d+\n([\s\S]*?)(?=## Question \d+|\*\*Quiz ID:\*\*)/g)

      if (questionMatches) {
        console.log(`QuizRenderer: Found ${questionMatches.length} question blocks`)
        questionMatches.forEach((questionBlock, index) => {
          console.log(`QuizRenderer: Parsing question ${index + 1}:`, questionBlock.substring(0, 100) + '...')
          const question = parseQuestion(questionBlock, index + 1)
          if (question) {
            questions.push(question)
            console.log(`QuizRenderer: Successfully parsed question ${index + 1}`)
          } else {
            console.log(`QuizRenderer: Failed to parse question ${index + 1}`)
          }
        })
      } else {
        console.log('QuizRenderer: No question blocks found')
      }

      return {
        title,
        questions,
        time_limit: timeLimit,
        difficulty,
        quiz_id: quizId
      }
    } catch (error) {
      console.error('Error parsing quiz content:', error)
      return null
    }
  }

  const parseQuestion = (questionBlock: string, questionNumber: number): QuizQuestion | null => {
    try {
      // Extract question type
      const typeMatch = questionBlock.match(/\*\*Type:\*\* (.+)/)
      const type = typeMatch ? typeMatch[1].toLowerCase().replace(' ', '_') as QuizQuestion['type'] : 'mcq'

      // Extract question text - handle multi-line questions
      const questionMatch = questionBlock.match(/\*\*Question:\*\* ([\s\S]*?)(?=\n\n|\*\*Answer:\*\*|\*\*Explanation:\*\*|- \[ \])/)
      const question = questionMatch ? questionMatch[1].trim() : ''

      // Extract options for MCQ and True/False
      const options: string[] = []
      if (type === 'mcq' || type === 'true_false') {
        const optionMatches = questionBlock.match(/- \[ \] (.+)/g)
        if (optionMatches) {
          options.push(...optionMatches.map(match => match.replace('- [ ] ', '')))
        }
      }

      // Extract correct answer
      const answerMatch = questionBlock.match(/\*\*Answer:\*\* ([\s\S]*?)(?=\n\n|\*\*Explanation:\*\*|$)/)
      const correct_answer = answerMatch ? answerMatch[1].trim() : ''

      // Extract explanation
      const explanationMatch = questionBlock.match(/\*\*Explanation:\*\* ([\s\S]*?)(?=\n\n|$)/)
      const explanation = explanationMatch ? explanationMatch[1].trim() : ''

      // Validate that we have the essential data
      if (!question) {
        console.warn(`Question ${questionNumber} has no question text`)
        return null
      }

      return {
        id: `q${questionNumber}`,
        type,
        question,
        options: options.length > 0 ? options : undefined,
        correct_answer,
        explanation
      }
    } catch (error) {
      console.error('Error parsing question:', error)
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
