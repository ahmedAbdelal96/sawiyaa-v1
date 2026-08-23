import {
  permissionDefinitions,
  rolePermissionBundles,
} from './auth.permissions';

describe('canonical permission definitions', () => {
  it('contains unique permission keys and the direct-create permission', () => {
    const keys = permissionDefinitions.map((permission) => permission.key);

    expect(keys).toHaveLength(69);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain('practitionerApplications.approve');
    expect(keys).toContain('practitionerPublication.read');
    expect(keys).toContain('practitionerPublication.write');
  });

  it('grants every canonical permission to SUPER_ADMIN', () => {
    const superAdmin = rolePermissionBundles.find(
      (bundle) => bundle.role === 'SUPER_ADMIN',
    );

    expect(superAdmin?.permissions).toEqual(
      permissionDefinitions.map((permission) => permission.key),
    );
  });
});
