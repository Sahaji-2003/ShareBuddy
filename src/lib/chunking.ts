// File chunking utilities for splitting large files < 50MB limit

const CHUNK_SIZE = 45 * 1024 * 1024; // 45MB (safe margin under 50MB)

export interface ChunkInfo {
    index: number;
    totalChunks: number;
    size: number;
    blob: Blob;
}

/**
 * Split a large file into chunks
 * Each chunk is less than 50MB to fit Supabase free tier limit
 */
export const splitFileIntoChunks = (file: File | Blob): ChunkInfo[] => {
    const chunks: ChunkInfo[] = [];
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const blob = file.slice(start, end);

        chunks.push({
            index: i,
            totalChunks,
            size: blob.size,
            blob,
        });
    }

    return chunks;
};

/**
 * Merge chunks back into original file
 * Preserves exact byte order for data integrity
 */
export const mergeChunks = async (blobs: Blob[], mimeType: string): Promise<Blob> => {
    return new Blob(blobs, { type: mimeType });
};

/**
 * Check if a file needs to be chunked
 */
export const needsChunking = (file: File | Blob): boolean => {
    return file.size > CHUNK_SIZE;
};

/**
 * Get the chunk size constant
 */
export const getChunkSize = (): number => CHUNK_SIZE;
