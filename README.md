# stac-js

Simple drop-in JavaScript classes with utilities for working with data from STAC objects in a read-only manner.
It is basically just a wrapper/facade on top of a single STAC object deserialized from JSON.
It doesn't handle relationships between files, actually this library is completely unaware of any files and doesn't even handle loading them from HTTP or a file system.
As such the library works in principle both in the browser and in NodeJS.
This library won't help you if you want to create or update a STAC catalog (like PySTAC would).

- **Package version:** 0.2.2
- **STAC versions:** >= 0.6.0 (through [stac-migrate](https://github.com/stac-utils/stac-migrate)).
- **Documentation:** <https://stac-js.moregeo.it/>

## Usage

Automatically instantiate the right class through the factory:

```js
import create from 'stac-js';
// const create = require('stac-js'); // Import for NodeJS

const stac = {
  stac_version: '1.1.0',
  type: 'Collection',
  id: 'example',
  // ...
};
const obj = create(stac); // Migrates data to the latest version
```

Directly instantiate `Asset`, `Catalog`, `Collection`, `CollectionCollection`, `Item` or `ItemCollection` through the class constructors:

```js
import { Collection } from 'stac-js'; // or Catalog or Item
// const { Collection } = require('stac-js'); // Import for NodeJS

const stac = {
  stac_version: '1.1.0',
  type: 'Collection',
  id: 'example',
  // ...
};
const obj = new Collection(stac); // Does NOT migrate to the latest version
```

You can then use the object, check whether it's STAC and call some methods, for example:

```js
import { STAC } from 'stac-js';
// const { STAC } = require('stac-js'); // Import for NodeJS

if (obj?.isSTAC()) {
  obj.isCollection();
  obj.getBoundingBox();
  obj.getTemporalExtent();
  obj.getThumbnails();
  obj.getItemLinks();
  obj.getDefaultGeoTIFF();
  // ...
}
```

> [!CAUTION]
> Using `instanceof` can break when multiple versions of stac-js end up in the same bundle (e.g. via transitive dependencies).
> Each version has its own class identity, so `instanceof` checks across versions will return `false`.
> Consider using the `is...()` helper methods such as `isSTAC()` and `isItem()` instead.

The classes are drop-in replacements, which means you can still access the objects as before:

```js
console.log(stac.id === obj.id);
```

To better visualize the available classes (blue), interfaces (yellow) and the inheritance, please consult the simplified class diagram below:

![Class diagram for stac-js](classes.png)

> [!NOTE]
> This library is purely written based on ES6 classes and doesn't do any transpiling etc.
> If you use this library, your environment either needs to support ES6 classes or you need to take measures yourself to transpile back to whatever is supported by your environment (e.g. through Babel for the browser).

## Development

```bash
# Run tests
npm test

# Lint source code
npm run lint

# Format the source code
npm run format

# Lint JSDoc comments
npm run docs:lint

# Generate API documentation
npm run docs

# Run all checks (docs:lint + lint + test)
npm run check
```
