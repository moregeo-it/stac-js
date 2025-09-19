# stac-js

Simple drop-in JavaScript classes with utilities for working with data from STAC objects in a read-only manner.
It is basically just a wrapper/facade on top of a single STAC object deserialized from JSON.
It doesn't handle relationships between files, actually this library is completely unaware of any files and doesn't even handle loading them from HTTP or a file system.
As such the library works in principle both in the browser and in NodeJS.
This library won't help you if you want to create or update a STAC catalog (like PySTAC would).

- **Package version:** 0.1.9
- **STAC versions:** >= 0.6.0 (through [stac-migrate](https://github.com/stac-utils/stac-migrate)).
- **Documentation:** <https://stac-js.moregeo.it/>

## Usage

Automatically instantiate the right class through the factory:

```js
import create from 'stac-js';
// const create = import('stac-js'); // Import for NodeJS

const stac = {
  stac_version: "1.1.0",
  type: "Collection",
  id: "example",
  // ...
};
const obj = create(stac); // Migrates data to the latest version
```

Directly instantiate `Asset`, `Catalog`, `Collection`, `CollectionCollection`, `Item` or `ItemCollection` through the class constructors:

```js
import { Collection } from 'stac-js'; // or Catalog or Item
// const { Collection } = import('stac-js'); // Import for NodeJS

const stac = {
  stac_version: "1.1.0",
  type: "Collection",
  id: "example",
  // ...
};
const obj = new Collection(stac); // Does NOT migrate to the latest version
```

You can then use the object, check whether it's STAC and call some methods, for example:

```js
import { STAC } from 'stac-js';
// const { STAC } = import('stac-js'); // Import for NodeJS

if (obj instanceof STAC) {
  obj.isCollection();
  obj.getBoundingBox();
  obj.getTemporalExtent();
  obj.getThumbnails();
  obj.getItemLinks();
  obj.getDefaultGeoTIFF();
  // ...
}
```

The classes are drop-in replacements, which means you can still access the objects as before:

```js
console.log(stac.id === obj.id);
```

To better visualize the available classes (blue), interfaces (yellow) and the inheritance, please consult the simplified class diagram below:

![Class diagram for stac-js](classes.png)

**Note:** This library is purely written based on ES6 classes and doesn't do any transpiling etc.
If you use this library, your environment either needs to support ES6 classes or you need to take measures yourself to transpile back to whatever is supported by your environment (e.g. through Babel for the browser).
