/**
 * Tests for utility functions
 */

import { getFilenameFromPath, formatTime } from '@/lib/utils';

describe('utils', () => {
  describe('getFilenameFromPath', () => {
    it('should extract filename from storage path', () => {
      const path = 'userId/materialId/filename.pdf';
      expect(getFilenameFromPath(path)).toBe('filename.pdf');
    });

    it('should handle paths with multiple slashes', () => {
      const path = 'user/123/material/456/document.pdf';
      expect(getFilenameFromPath(path)).toBe('document.pdf');
    });

    it('should return undefined for undefined input', () => {
      expect(getFilenameFromPath(undefined)).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(getFilenameFromPath('')).toBeUndefined();
    });

    it('should handle filename without extension', () => {
      const path = 'user/material/document';
      expect(getFilenameFromPath(path)).toBe('document');
    });

    it('should handle path with just filename', () => {
      const path = 'document.pdf';
      expect(getFilenameFromPath(path)).toBe('document.pdf');
    });
  });

  describe('formatTime', () => {
    it('should format seconds to MM:SS', () => {
      expect(formatTime(0)).toBe('0:00');
      expect(formatTime(30)).toBe('0:30');
      expect(formatTime(60)).toBe('1:00');
      expect(formatTime(90)).toBe('1:30');
      expect(formatTime(125)).toBe('2:05');
      expect(formatTime(3661)).toBe('61:01');
    });

    it('should handle decimal seconds by flooring', () => {
      expect(formatTime(30.7)).toBe('0:30');
      expect(formatTime(90.9)).toBe('1:30');
    });

    it('should pad seconds with zero', () => {
      expect(formatTime(5)).toBe('0:05');
      expect(formatTime(65)).toBe('1:05');
    });
  });
});


