import { describe, expect, it } from 'vitest';
import { pickContactNumberFromMetadata } from './ensure-user-records';

describe('pickContactNumberFromMetadata', () => {
  it('prefers contactNumber metadata and falls back to alternate keys', () => {
    expect(pickContactNumberFromMetadata({ contactNumber: '+44 7700 900123' })).toBe('+44 7700 900123');
    expect(pickContactNumberFromMetadata({ contact_number: '+44 7700 900124' })).toBe('+44 7700 900124');
    expect(pickContactNumberFromMetadata({ contactnumber: '+44 7700 900125' })).toBe('+44 7700 900125');
  });

  it('returns an empty string when no contact metadata exists', () => {
    expect(pickContactNumberFromMetadata({ name: 'Amina' })).toBe('');
  });
});
