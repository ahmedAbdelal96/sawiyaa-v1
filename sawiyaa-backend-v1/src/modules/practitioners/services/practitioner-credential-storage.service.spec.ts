import { promises as fs } from 'fs';
import * as path from 'path';
import { PractitionerCredentialStorageService } from './practitioner-credential-storage.service';

describe('PractitionerCredentialStorageService', () => {
  const service = new PractitionerCredentialStorageService();

  it.each([
    ['application/pdf', '.pdf'],
    ['image/jpeg', '.jpg'],
    ['image/png', '.png'],
    ['image/webp', '.webp'],
  ])('stores %s under the canonical profile credential contract', async (mimeType, extension) => {
    const result = await service.saveCredentialFile({
      practitionerProfileId: 'storage-contract-test',
      mimeType,
      fileBuffer: Buffer.from('test-file'),
    });

    expect(result.fileUrl).toMatch(new RegExp(`^/uploads/practitioners/storage-contract-test/credentials/[^/]+\\${extension}$`));
    expect(await service.statSafeFile(result.absolutePath)).not.toBeNull();
    await service.deleteCredential(result.fileUrl);
  });

  it('rejects external URLs and traversal outside uploads', async () => {
    expect(service.resolveAbsolutePathFromFileUrl('https://files.local/file.pdf')).toBeNull();
    expect(service.resolveAbsolutePathFromFileUrl('/uploads/../storage/secret.pdf')).toBeNull();
    expect(service.resolveAbsolutePathFromFileUrl('/uploads/practitioners/a/credentials/file.pdf')).toBe(
      path.resolve(process.cwd(), 'uploads/practitioners/a/credentials/file.pdf'),
    );
  });

  afterAll(async () => {
    await fs.rm(path.resolve(process.cwd(), 'uploads/practitioners/storage-contract-test'), {
      recursive: true,
      force: true,
    });
  });
});
