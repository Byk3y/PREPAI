/**
 * AhaMoment Constants
 * Simple recognition-based memory demo with active recall questions
 */

// ============================================
// FACTS POOL - Simple, memorable facts with Q&A
// ============================================
const ALL_FACTS = [
    {
        fact: 'Honey never spoils',
        keyword: 'Honey',
        question: 'What never spoils?',
        answer: 'Honey',
        wrongOptions: ['Milk', 'Salt', 'Sugar'],
    },
    {
        fact: 'Octopuses have 3 hearts',
        keyword: 'Octopuses',
        question: 'How many hearts do octopuses have?',
        answer: '3',
        wrongOptions: ['2', '4', '5'],
    },
    {
        fact: 'Bananas are berries',
        keyword: 'Bananas',
        question: 'What fruit is actually a berry?',
        answer: 'Bananas',
        wrongOptions: ['Strawberries', 'Apples', 'Oranges'],
    },
    {
        fact: 'Koalas sleep 22 hours a day',
        keyword: 'Koalas',
        question: 'How many hours do koalas sleep?',
        answer: '22',
        wrongOptions: ['12', '16', '18'],
    },
    {
        fact: 'Sloths can hold their breath for 40 minutes',
        keyword: 'Sloths',
        question: 'How long can sloths hold their breath?',
        answer: '40 minutes',
        wrongOptions: ['10 minutes', '20 minutes', '60 minutes'],
    },
    {
        fact: 'The Eiffel Tower grows 6 inches in summer',
        keyword: 'Eiffel Tower',
        question: 'How much does the Eiffel Tower grow in summer?',
        answer: '6 inches',
        wrongOptions: ['2 inches', '12 inches', '18 inches'],
    },
    {
        fact: 'Cows have best friends',
        keyword: 'Cows',
        question: 'What kind of relationships do cows have?',
        answer: 'Best friends',
        wrongOptions: ['Enemies', 'No relationships', 'Only family bonds'],
    },
    {
        fact: 'Dolphins sleep with one eye open',
        keyword: 'Dolphins',
        question: 'How do dolphins sleep?',
        answer: 'With one eye open',
        wrongOptions: ['Both eyes closed', 'On their backs', 'Standing up'],
    },
    {
        fact: 'A jiffy is 1/100th of a second',
        keyword: 'jiffy',
        question: 'How long is a jiffy?',
        answer: '1/100th of a second',
        wrongOptions: ['1 minute', '1 second', '1/10th of a second'],
    },
    {
        fact: 'Pineapples take 2 years to grow',
        keyword: 'Pineapples',
        question: 'How long does it take to grow a pineapple?',
        answer: '2 years',
        wrongOptions: ['6 months', '1 year', '3 months'],
    },
];

// Distractor facts (false or commonly misbelieved)
const DISTRACTOR_FACTS = [
    'Cats have 9 lives',
    'The sun is a planet',
    'Fish can fly',
    'The Great Wall is visible from space',
    'Lightning never strikes twice',
    'Goldfish have 3-second memory',
    'We only use 10% of our brain',
    'Bulls hate the color red',
];

// Phase types
export type Phase =
    | 'intro'
    | 'showFacts'
    | 'distraction'
    | 'passiveTest'
    | 'passiveResult'
    | 'brigoIntro'
    | 'activeRecall'
    | 'activeTest'
    | 'finalResult';

export interface Fact {
    fact: string;
    keyword: string;
    question: string;
    answer: string;
    wrongOptions: string[];
}

export interface RandomFacts {
    facts: Fact[];
    distractors: string[];
}

/**
 * Get random facts for the demo
 */
export function getRandomFacts(count: number = 5): RandomFacts {
    // Shuffle and pick facts
    const shuffledFacts = [...ALL_FACTS]
        .sort(() => Math.random() - 0.5)
        .slice(0, count);

    // Shuffle and pick distractors (same count)
    const shuffledDistractors = [...DISTRACTOR_FACTS]
        .sort(() => Math.random() - 0.5)
        .slice(0, count);

    return {
        facts: shuffledFacts,
        distractors: shuffledDistractors,
    };
}

// Legacy exports
export const DISTRACTOR_FACTS_EXPORT = DISTRACTOR_FACTS;
export const PASSIVE_FACTS = ALL_FACTS.slice(0, 5);
export const ACTIVE_FACTS = ALL_FACTS.slice(0, 5);
