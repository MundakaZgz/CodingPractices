import { describe, it, expect } from 'vitest';
import deduplicate from '../src/deduplicate.ts';

describe('deduplicate', () => {
  it('returns an empty array for empty input', () => {
    expect(deduplicate([], 1000)).toEqual([]);
  });

  it('accepts the first event and rejects duplicates within the window', () => {
    const events = [
      { id: 'a', timestamp: 0 },
      { id: 'a', timestamp: 100 },
      { id: 'a', timestamp: 200 },
    ];

    expect(deduplicate(events, 1000)).toEqual([{ id: 'a', timestamp: 0 }]);
  });

  it('accepts an event exactly at the window boundary', () => {
    const events = [
      { id: 'a', timestamp: 0 },
      { id: 'a', timestamp: 1000 },
    ];

    expect(deduplicate(events, 1000)).toEqual([
      { id: 'a', timestamp: 0 },
      { id: 'a', timestamp: 1000 },
    ]);
  });

  it('keeps the example scenario order and accepted events', () => {
    const events = [
      { id: 'a', timestamp: 0 },
      { id: 'b', timestamp: 100 },
      { id: 'a', timestamp: 400 },
      { id: 'a', timestamp: 1000 },
      { id: 'b', timestamp: 1050 },
    ];

    expect(deduplicate(events, 1000)).toEqual([
      { id: 'a', timestamp: 0 },
      { id: 'b', timestamp: 100 },
      { id: 'a', timestamp: 1000 },
    ]);
  });

  it('keeps only one event when timestamps are the same', () => {
    const events = [
      { id: 'a', timestamp: 0 },
      { id: 'a', timestamp: 0 }
    ];

    expect(deduplicate(events, 1000)).toEqual([
      { id: 'a', timestamp: 0 }
    ]);
  });

  it('does not miss different events with the same timestamp', () => {
    const events = [
      { id: 'a', timestamp: 0 },
      { id: 'b', timestamp: 0 }
    ];

    expect(deduplicate(events, 1000)).toEqual([
      { id: 'a', timestamp: 0 },
      { id: 'b', timestamp: 0 }
    ]);
  })
});