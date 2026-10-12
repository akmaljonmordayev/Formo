import { BadRequestException } from '@nestjs/common';
import { ParseIdPipe } from './parse-id.pipe';

describe('ParseIdPipe', () => {
  const pipe = new ParseIdPipe();

  it.each([
    ['1', 1],
    ['42', 42],
    ['2147483647', 2147483647],
  ])('%s -> %d', (input, expected) => {
    expect(pipe.transform(input)).toBe(expected);
  });

  it.each(['0', '-1', '1.5', 'abc', '', ' 1', '1e3', '0x10', '2147483648', '99999999999', "1' OR '1'='1"])(
    'rad etadi: "%s"',
    (input) => {
      expect(() => pipe.transform(input)).toThrow(BadRequestException);
    },
  );
});
