import { getCaseInsensitiveHeader } from '../src';

describe('ns-lambda-kit get case insensitive header test', () => {
    it('should return the matched header', async () => {
        const event = {
            headers: {
                'X-User-ID': '0123456789'
            }
        }
        const result = getCaseInsensitiveHeader(event, 'x-USER-id');
        expect(result).toBe('0123456789');
    });

    it('should return null for a nonexistent header', async () => {
        const event = {
            headers: {
                'X-User-ID': '0123456789'
            }
        }
        const result = getCaseInsensitiveHeader(event, 'x-password');
        expect(result).toBeNull();
    });
});
