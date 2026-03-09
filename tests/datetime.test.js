import { centerDateTime, isoToDate, unionDateTime } from '../src/datetime';

test('isoToDate', () => {
  const dt = (...x) => new Date(Date.UTC(...x));
  expect(isoToDate()).toBeNull();
  expect(isoToDate(null)).toBeNull();
  expect(isoToDate(2020)).toBeNull();
  expect(isoToDate('2020')).toBeNull();
  expect(isoToDate('2020-01-01')).toBeNull();
  expect(isoToDate('2020-01-01Tboo')).toBeNull();
  expect(isoToDate('2020-01-01T12:13:14.5+07:00')).toBeNull();

  expect(isoToDate('2020-01-01T12:13:14Z')).toEqual(dt(2020, 0, 1, 12, 13, 14));
  expect(isoToDate('2020-01-01T12:13:14.Z')).toEqual(dt(2020, 0, 1, 12, 13, 14));
  expect(isoToDate('2020-01-01T12:13:14.5Z')).toEqual(dt(2020, 0, 1, 12, 13, 14, 5));
  expect(isoToDate('2020-01-01T12:13:14.523+00:00')).toEqual(dt(2020, 0, 1, 12, 13, 14, 523));

  // These is not valid according to the spec, but let's be gentle...
  expect(isoToDate('1990-12-01T23:59:59')).toEqual(dt(1990, 11, 1, 23, 59, 59));
});

const dt = (day) => new Date(Date.UTC(2022, 1, day, 0, 0, 0, 0));

test('centerDateTime', () => {
  expect(centerDateTime(dt(1), dt(3))).toEqual(dt(2));
});

test('unionDateTime', () => {
  expect(unionDateTime()).toBeNull();
  let int = [dt(1), dt(3)];
  expect(unionDateTime([int])).toEqual(int);
  expect(
    unionDateTime([
      [dt(1), dt(3)],
      [dt(2), dt(4)],
    ]),
  ).toEqual([dt(1), dt(4)]);
  expect(
    unionDateTime([
      [dt(2), dt(3)],
      [null, dt(4)],
    ]),
  ).toEqual([null, dt(4)]);
  expect(
    unionDateTime([
      [dt(2), null],
      [dt(1), dt(4)],
    ]),
  ).toEqual([dt(1), null]);
  expect(
    unionDateTime([
      [dt(2), null],
      [null, dt(4)],
    ]),
  ).toEqual([null, null]);
});
