import { isMediaType } from '../src/mediatypes';
import { geotiffMediaTypes } from '../src/mediatypes';

test('isMediaType', () => {
  expect(isMediaType(undefined, geotiffMediaTypes)).toBeFalsy();
  expect(isMediaType('', geotiffMediaTypes)).toBeFalsy();
  expect(isMediaType('', geotiffMediaTypes)).toBeFalsy();
  expect(isMediaType('image/tiff', geotiffMediaTypes)).toBeFalsy();
  expect(isMediaType('image/tiff', [])).toBeFalsy();

  expect(isMediaType('image/png', 'image/png')).toBeTruthy();
  expect(isMediaType('image/tiff; application=geotiff', geotiffMediaTypes)).toBeTruthy();
  // expect(isMediaType("image/tiff;application=geotiff", ["image/tiff; application=geotiff"])).toBeTruthy(); // todo: Should this work?

  expect(isMediaType(undefined, geotiffMediaTypes, true)).toBeTruthy();
});
