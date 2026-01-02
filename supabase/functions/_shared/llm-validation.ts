/**
 * LLM Response Validation Utilities
 * Validates JSON responses from LLM to prevent malicious or malformed data
 */

import { validateString, validateUUIDArray } from './validation.ts';

/**
 * Validate flashcard structure from LLM response
 */
export function validateFlashcard(fc: any, index: number): { isValid: boolean; error?: string; sanitized?: any } {
  if (!fc || typeof fc !== 'object') {
    return {
      isValid: false,
      error: `Flashcard ${index} is not an object`,
    };
  }

  // Validate question
  const questionResult = validateString(fc.question, {
    fieldName: 'question',
    required: true,
    minLength: 3,
    maxLength: 500,
  });
  if (!questionResult.isValid) {
    return {
      isValid: false,
      error: `Flashcard ${index}: ${questionResult.error}`,
    };
  }

  // Validate answer
  const answerResult = validateString(fc.answer, {
    fieldName: 'answer',
    required: true,
    minLength: 1,
    maxLength: 2000,
  });
  if (!answerResult.isValid) {
    return {
      isValid: false,
      error: `Flashcard ${index}: ${answerResult.error}`,
    };
  }

  // Validate explanation (optional)
  let sanitizedExplanation = null;
  if (fc.explanation) {
    const explanationResult = validateString(fc.explanation, {
      fieldName: 'explanation',
      required: false,
      maxLength: 3000,
    });
    if (!explanationResult.isValid) {
      return {
        isValid: false,
        error: `Flashcard ${index}: ${explanationResult.error}`,
      };
    }
    sanitizedExplanation = explanationResult.sanitized;
  }

  // Validate tags (optional array)
  let sanitizedTags: string[] = [];
  if (fc.tags) {
    if (!Array.isArray(fc.tags)) {
      return {
        isValid: false,
        error: `Flashcard ${index}: tags must be an array`,
      };
    }
    if (fc.tags.length > 10) {
      return {
        isValid: false,
        error: `Flashcard ${index}: too many tags (max 10)`,
      };
    }
    for (let i = 0; i < fc.tags.length; i++) {
      const tagResult = validateString(fc.tags[i], {
        fieldName: `tag ${i}`,
        required: true,
        maxLength: 50,
        allowNewlines: false,
      });
      if (!tagResult.isValid) {
        return {
          isValid: false,
          error: `Flashcard ${index}: ${tagResult.error}`,
        };
      }
      sanitizedTags.push(tagResult.sanitized!);
    }
  }

  return {
    isValid: true,
    sanitized: {
      question: questionResult.sanitized,
      answer: answerResult.sanitized,
      explanation: sanitizedExplanation,
      tags: sanitizedTags,
    },
  };
}

/**
 * Validate quiz question structure from LLM response
 */
export function validateQuizQuestion(q: any, index: number): { isValid: boolean; error?: string; sanitized?: any } {
  if (!q || typeof q !== 'object') {
    return {
      isValid: false,
      error: `Quiz question ${index} is not an object`,
    };
  }

  // Validate question text
  const questionResult = validateString(q.question, {
    fieldName: 'question',
    required: true,
    minLength: 10,
    maxLength: 1000,
  });
  if (!questionResult.isValid) {
    return {
      isValid: false,
      error: `Question ${index}: ${questionResult.error}`,
    };
  }

  // Validate options (must be object with A, B, C, D)
  if (!q.options || typeof q.options !== 'object') {
    return {
      isValid: false,
      error: `Question ${index}: options must be an object`,
    };
  }

  const requiredOptions = ['A', 'B', 'C', 'D'];
  const sanitizedOptions: Record<string, string> = {};

  for (const letter of requiredOptions) {
    const optionResult = validateString(q.options[letter], {
      fieldName: `option ${letter}`,
      required: true,
      maxLength: 500,
    });
    if (!optionResult.isValid) {
      return {
        isValid: false,
        error: `Question ${index}: ${optionResult.error}`,
      };
    }
    sanitizedOptions[letter] = optionResult.sanitized!;
  }

  // Validate correct answer
  if (!q.correct || !requiredOptions.includes(q.correct)) {
    return {
      isValid: false,
      error: `Question ${index}: correct answer must be A, B, C, or D`,
    };
  }

  // Validate hint (optional)
  let sanitizedHint = null;
  if (q.hint) {
    const hintResult = validateString(q.hint, {
      fieldName: 'hint',
      required: false,
      maxLength: 500,
    });
    if (!hintResult.isValid) {
      return {
        isValid: false,
        error: `Question ${index}: ${hintResult.error}`,
      };
    }
    sanitizedHint = hintResult.sanitized;
  }

  // Validate explanations (optional)
  let sanitizedExplanations: Record<string, string> | null = null;
  if (q.explanations) {
    if (typeof q.explanations !== 'object') {
      return {
        isValid: false,
        error: `Question ${index}: explanations must be an object`,
      };
    }

    sanitizedExplanations = {};
    for (const letter of requiredOptions) {
      if (q.explanations[letter]) {
        const explResult = validateString(q.explanations[letter], {
          fieldName: `explanation ${letter}`,
          required: false,
          maxLength: 1000,
        });
        if (!explResult.isValid) {
          return {
            isValid: false,
            error: `Question ${index}: ${explResult.error}`,
          };
        }
        sanitizedExplanations[letter] = explResult.sanitized!;
      }
    }

    // If explanations object exists but doesn't have all 4 letters, set to null
    if (Object.keys(sanitizedExplanations).length !== 4) {
      sanitizedExplanations = null;
    }
  }

  return {
    isValid: true,
    sanitized: {
      question: questionResult.sanitized,
      options: sanitizedOptions,
      correct: q.correct,
      hint: sanitizedHint,
      explanations: sanitizedExplanations,
    },
  };
}

/**
 * Validate flashcards array from LLM response
 */
export function validateFlashcardsResponse(
  parsed: any,
  expectedCount: number
): { isValid: boolean; error?: string; sanitized?: any } {
  if (!parsed || typeof parsed !== 'object') {
    return {
      isValid: false,
      error: 'Response is not a valid object',
    };
  }

  // Validate flashcards array exists
  if (!parsed.flashcards || !Array.isArray(parsed.flashcards)) {
    return {
      isValid: false,
      error: 'Response missing flashcards array',
    };
  }

  // Validate count
  if (parsed.flashcards.length === 0) {
    return {
      isValid: false,
      error: 'Flashcards array is empty',
    };
  }

  if (parsed.flashcards.length > 100) {
    return {
      isValid: false,
      error: `Too many flashcards (${parsed.flashcards.length}, max 100)`,
    };
  }

  // Validate title
  const titleResult = validateString(parsed.title || '', {
    fieldName: 'title',
    required: false,
    maxLength: 200,
    allowNewlines: false,
  });

  // Validate each flashcard
  const sanitizedFlashcards = [];
  for (let i = 0; i < parsed.flashcards.length; i++) {
    const fcResult = validateFlashcard(parsed.flashcards[i], i);
    if (!fcResult.isValid) {
      return {
        isValid: false,
        error: fcResult.error,
      };
    }
    sanitizedFlashcards.push(fcResult.sanitized);
  }

  return {
    isValid: true,
    sanitized: {
      title: titleResult.sanitized || 'Untitled',
      flashcards: sanitizedFlashcards,
    },
  };
}

/**
 * Validate quiz response from LLM
 */
export function validateQuizResponse(
  parsed: any,
  expectedCount: number
): { isValid: boolean; error?: string; sanitized?: any } {
  if (!parsed || typeof parsed !== 'object') {
    return {
      isValid: false,
      error: 'Response is not a valid object',
    };
  }

  // Validate quiz object exists
  if (!parsed.quiz || typeof parsed.quiz !== 'object') {
    return {
      isValid: false,
      error: 'Response missing quiz object',
    };
  }

  // Validate questions array
  if (!parsed.quiz.questions || !Array.isArray(parsed.quiz.questions)) {
    return {
      isValid: false,
      error: 'Quiz missing questions array',
    };
  }

  // Validate count
  if (parsed.quiz.questions.length === 0) {
    return {
      isValid: false,
      error: 'Questions array is empty',
    };
  }

  if (parsed.quiz.questions.length > 50) {
    return {
      isValid: false,
      error: `Too many questions (${parsed.quiz.questions.length}, max 50)`,
    };
  }

  // Validate title
  const titleResult = validateString(parsed.quiz.title || '', {
    fieldName: 'title',
    required: false,
    maxLength: 200,
    allowNewlines: false,
  });

  // Validate each question
  const sanitizedQuestions = [];
  for (let i = 0; i < parsed.quiz.questions.length; i++) {
    const qResult = validateQuizQuestion(parsed.quiz.questions[i], i);
    if (!qResult.isValid) {
      return {
        isValid: false,
        error: qResult.error,
      };
    }
    sanitizedQuestions.push(qResult.sanitized);
  }

  return {
    isValid: true,
    sanitized: {
      quiz: {
        title: titleResult.sanitized || 'Untitled Quiz',
        questions: sanitizedQuestions,
      },
    },
  };
}
