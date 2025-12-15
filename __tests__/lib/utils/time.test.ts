/**
 * Tests for time utility functions
 */

import { formatMinutes, formatTime, formatDuration } from '@/lib/utils/time';

describe('time utils', () => {
  describe('formatMinutes', () => {
    it('should format minutes less than 60', () => {
      expect(formatMinutes(0)).toBe('0 min');
      expect(formatMinutes(15)).toBe('15 min');
      expect(formatMinutes(30)).toBe('30 min');
      expect(formatMinutes(59)).toBe('59 min');
    });

    it('should format 60 minutes as 1 hour', () => {
      expect(formatMinutes(60)).toBe('1 hour');
    });

    it('should format hours correctly', () => {
      expect(formatMinutes(120)).toBe('2 hours');
      expect(formatMinutes(180)).toBe('3 hours');
      expect(formatMinutes(240)).toBe('4 hours');
    });

    it('should round down hours', () => {
      expect(formatMinutes(90)).toBe('1 hour');
      expect(formatMinutes(150)).toBe('2 hours');
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

  describe('formatDuration', () => {
    it('should format seconds to human-readable duration', () => {
      expect(formatDuration(0)).toBe('0m 0s');
      expect(formatDuration(30)).toBe('0m 30s');
      expect(formatDuration(60)).toBe('1m 0s');
      expect(formatDuration(90)).toBe('1m 30s');
      expect(formatDuration(125)).toBe('2m 5s');
      expect(formatDuration(3661)).toBe('61m 1s');
    });

    it('should handle decimal seconds by flooring', () => {
      expect(formatDuration(30.7)).toBe('0m 30s');
      expect(formatDuration(90.9)).toBe('1m 30s');
    });
  });
});
