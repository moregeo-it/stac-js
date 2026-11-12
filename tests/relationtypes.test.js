import { hierarchical } from '../src/relationtypes';

test('catalogs and children are hierarchical relation types', () => {
  // The catalogs relation type of the Multi-Tenant Catalogs extension links to a
  // recursive (sub-)catalog registry and thus is hierarchical.
  // The children relation type of the API Children extension links to the child
  // catalogs and collections of a catalog and thus is hierarchical, too.
  expect(hierarchical).toContain('catalogs');
  expect(hierarchical).toContain('children');
});
