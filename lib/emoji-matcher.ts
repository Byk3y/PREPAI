/**
 * Emoji Matcher - Topic-relevant emoji from notebook title
 * Pure keyword-based matching with priority system
 */

interface EmojiRule {
  keywords: string[];
  emoji: string;
  priority: number; // Higher = matched first
}

const EMOJI_RULES: EmojiRule[] = [
  // STEM - High Priority (specific subjects)
  { keywords: ['physics', 'quantum', 'mechanics', 'thermodynamics'], emoji: '⚛️', priority: 100 },
  { keywords: ['chemistry', 'organic', 'molecule', 'chemical'], emoji: '🧪', priority: 100 },
  { keywords: ['biology', 'anatomy', 'genetics', 'dna', 'cell'], emoji: '🧬', priority: 100 },
  { keywords: ['math', 'calculus', 'algebra', 'geometry', 'trigonometry'], emoji: '📐', priority: 100 },
  { keywords: ['computer science', 'programming', 'algorithm', 'coding', 'developer', 'software'], emoji: '💻', priority: 100 },
  { keywords: ['ai', 'artificial intelligence', 'machine learning', 'llm', 'automation'], emoji: '🤖', priority: 105 },

  // Sciences - Medium-High Priority
  { keywords: ['science', 'experiment', 'lab', 'laboratory'], emoji: '🔬', priority: 85 },
  { keywords: ['astronomy', 'space', 'planet', 'stars', 'universe'], emoji: '🌌', priority: 85 },
  { keywords: ['geology', 'earth', 'rocks', 'minerals'], emoji: '🪨', priority: 85 },

  // Humanities & Social Sciences - High Priority
  { keywords: ['history', 'historical', 'ancient', 'medieval'], emoji: '📜', priority: 90 },
  { keywords: ['geography', 'map', 'country', 'continent'], emoji: '🌍', priority: 90 },
  { keywords: ['literature', 'novel', 'poetry', 'shakespeare'], emoji: '📖', priority: 90 },
  { keywords: ['philosophy', 'ethics', 'logic'], emoji: '🤔', priority: 90 },
  { keywords: ['psychology', 'behavior', 'brain', 'mental'], emoji: '🧠', priority: 90 },
  { keywords: ['economics', 'market', 'finance', 'trade'], emoji: '💰', priority: 90 },
  { keywords: ['sociology', 'society', 'culture'], emoji: '👥', priority: 90 },

  // Languages - Medium-High Priority
  { keywords: ['english', 'grammar', 'vocabulary', 'writing'], emoji: '📝', priority: 85 },
  { keywords: ['spanish', 'español'], emoji: '🇪🇸', priority: 85 },
  { keywords: ['french', 'français'], emoji: '🇫🇷', priority: 85 },
  { keywords: ['chinese', 'mandarin'], emoji: '🇨🇳', priority: 85 },
  { keywords: ['japanese'], emoji: '🇯🇵', priority: 85 },
  { keywords: ['language', 'linguistics'], emoji: '🌐', priority: 80 },

  // Arts - Medium-High Priority
  { keywords: ['art', 'painting', 'design', 'drawing'], emoji: '🎨', priority: 85 },
  { keywords: ['music', 'musical', 'instrument', 'piano', 'guitar'], emoji: '🎵', priority: 85 },
  { keywords: ['theater', 'drama', 'acting', 'play'], emoji: '🎭', priority: 85 },

  // Professional Fields - High Priority
  { keywords: ['medicine', 'medical', 'health', 'doctor'], emoji: '⚕️', priority: 90 },
  { keywords: ['law', 'legal', 'court', 'justice'], emoji: '⚖️', priority: 90 },
  { keywords: ['business', 'management', 'marketing'], emoji: '💼', priority: 85 },
  { keywords: ['engineering', 'engineer'], emoji: '⚙️', priority: 85 },

  // Test Prep - Very High Priority
  { keywords: ['sat', 'act', 'gre', 'mcat', 'lsat', 'gmat'], emoji: '✍️', priority: 95 },
  { keywords: ['ap biology', 'ap chemistry', 'ap physics'], emoji: '🎓', priority: 95 },
  { keywords: ['ap', 'advanced placement'], emoji: '🎓', priority: 92 },

  // Specific Topics - Medium Priority
  { keywords: ['climate', 'environment', 'ecology'], emoji: '🌱', priority: 80 },
  { keywords: ['nutrition', 'diet', 'food'], emoji: '🥗', priority: 80 },
  { keywords: ['fitness', 'exercise', 'workout'], emoji: '💪', priority: 80 },
  { keywords: ['politics', 'government', 'political'], emoji: '🏛️', priority: 80 },
  { keywords: ['religion', 'theology', 'spiritual'], emoji: '🕉️', priority: 80 },
  { keywords: ['productivity', 'workflow', 'habit', 'habits', 'agency'], emoji: '🚀', priority: 85 },
  { keywords: ['emotions', 'mood', 'feeling', 'self-help'], emoji: '🌿', priority: 85 },

  // General Academic - Low Priority (fallbacks)
  { keywords: ['study', 'notes', 'lecture', 'class'], emoji: '📚', priority: 50 },
  { keywords: ['exam', 'test', 'quiz', 'midterm', 'final'], emoji: '📝', priority: 50 },
  { keywords: ['homework', 'assignment'], emoji: '✏️', priority: 50 },
  { keywords: ['research', 'paper', 'essay'], emoji: '📄', priority: 50 },
];

const DEFAULT_EMOJI = '📚';

/**
 * Get topic-relevant emoji based on notebook title
 * Uses keyword matching with priority system
 *
 * @param title - The notebook title to analyze
 * @returns Emoji string (e.g., '📜', '🧬', '📚')
 *
 * @example
 * getTopicEmoji('AP Biology Notes') // Returns '🎓'
 * getTopicEmoji('The Industrial Revolution') // Returns '📜'
 * getTopicEmoji('Random Notes') // Returns '📚' (default)
 */
export function getTopicEmoji(title: string): string {
  if (!title?.trim()) return DEFAULT_EMOJI;

  const normalized = title.toLowerCase().trim();

  // Sort rules by priority (highest first)
  const sortedRules = [...EMOJI_RULES].sort((a, b) => b.priority - a.priority);

  // Find first matching rule
  for (const rule of sortedRules) {
    for (const keyword of rule.keywords) {
      // Use regex with word boundaries to avoid partial matches (e.g. 'ap' in 'applications')
      // \b matches word boundaries, making sure 'ap' is it's own word
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'i');

      if (regex.test(normalized)) {
        return rule.emoji;
      }
    }
  }

  // No match found, return default
  return DEFAULT_EMOJI;
}
