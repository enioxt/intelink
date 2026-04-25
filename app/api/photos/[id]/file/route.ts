/**
 * GET /api/photos/[id]/file
 * Alias for /api/photos/[id] — serves the photo binary directly.
 * Separated to allow <img src="/api/photos/X/file"> with explicit path.
 */
export { GET } from '@/app/api/photos/[id]/route';
