/**
 * MarkdownText - Renders markdown-formatted text with bold and italic support
 * Supports: **bold**, *italic*, and regular text
 */

import React from 'react';
import { Text, TextProps } from 'react-native';

interface MarkdownTextProps extends TextProps {
  children: string;
}

export const MarkdownText: React.FC<MarkdownTextProps> = ({ children, style, ...props }) => {
  // Parse markdown and create styled text segments
  const parseMarkdown = (text: string): React.ReactNode[] => {
    const segments: React.ReactNode[] = [];
    let currentIndex = 0;
    let key = 0;

    // Regex to match **bold** and *italic* (non-greedy)
    const markdownRegex = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
    let match;

    while ((match = markdownRegex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > currentIndex) {
        const beforeText = text.substring(currentIndex, match.index);
        if (beforeText) {
          segments.push(
            <Text key={key++} style={style}>
              {beforeText}
            </Text>
          );
        }
      }

      // Handle the match
      if (match[1].startsWith('**')) {
        // Bold text: **text**
        segments.push(
          <Text key={key++} style={[style, { fontWeight: '700' }]}>
            {match[2]}
          </Text>
        );
      } else if (match[1].startsWith('*')) {
        // Italic text: *text*
        segments.push(
          <Text key={key++} style={[style, { fontStyle: 'italic' }]}>
            {match[3]}
          </Text>
        );
      }

      currentIndex = match.index + match[0].length;
    }

    // Add remaining text after last match
    if (currentIndex < text.length) {
      const remainingText = text.substring(currentIndex);
      if (remainingText) {
        segments.push(
          <Text key={key++} style={style}>
            {remainingText}
          </Text>
        );
      }
    }

    // If no markdown found, return original text
    if (segments.length === 0) {
      return [
        <Text key={0} style={style}>
          {text}
        </Text>,
      ];
    }

    return segments;
  };

  const textContent = typeof children === 'string' ? children : String(children);
  const parsedContent = parseMarkdown(textContent);

  return (
    <Text style={style} {...props}>
      {parsedContent}
    </Text>
  );
};

