import { supabase } from './supabase';
import { splitFileIntoChunks, mergeChunks, needsChunking } from './chunking';

// Types
export interface Project {
    code: string;
    created_at: string;
}

export interface Repo {
    id: string;
    project_code: string;
    name: string;
    description: string | null;
    created_at: string;
}

export interface FileRecord {
    id: string;
    repo_id: string;
    project_code: string;
    name: string;
    type: string | null;
    size: number;
    storage_path: string | null;
    created_at: string;
    // Chunking fields
    is_chunked: boolean;
    chunk_count: number | null;
    parent_file_id: string | null;
    chunk_index: number | null;
}

// Storage limit (1GB in bytes)
const STORAGE_LIMIT = 1024 * 1024 * 1024; // 1GB
const WARNING_THRESHOLD = 0.8; // Warn at 80%

// Reserved admin code - never generate this
const ADMIN_CODE = '1977';

// Generate unique 4-digit code (excluding admin code)
const generateCode = (): string => {
    let code: string;
    do {
        code = Math.floor(1000 + Math.random() * 9000).toString();
    } while (code === ADMIN_CODE);
    return code;
};

// ==================== STORAGE USAGE ====================

export const getStorageUsage = async (projectCode: string): Promise<{ used: number; limit: number; percentage: number }> => {
    const { data, error } = await supabase
        .from('files')
        .select('size')
        .eq('project_code', projectCode);

    if (error) throw error;

    const used = data?.reduce((sum, file) => sum + (file.size || 0), 0) || 0;
    const percentage = (used / STORAGE_LIMIT) * 100;

    return { used, limit: STORAGE_LIMIT, percentage };
};

export const isStorageWarning = async (projectCode: string): Promise<boolean> => {
    const { percentage } = await getStorageUsage(projectCode);
    return percentage >= WARNING_THRESHOLD * 100;
};

// ==================== PROJECT OPERATIONS ====================

export const createProject = async (): Promise<string> => {
    let code = generateCode();
    let attempts = 0;

    while (attempts < 10) {
        const { data: existing } = await supabase
            .from('projects')
            .select('code')
            .eq('code', code)
            .single();

        if (!existing) {
            const { error } = await supabase
                .from('projects')
                .insert({ code });

            if (error) throw error;
            return code;
        }

        code = generateCode();
        attempts++;
    }

    throw new Error('Failed to generate unique code');
};

export const getProject = async (code: string): Promise<Project | null> => {
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('code', code)
        .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
};

export const validateProjectCode = async (code: string): Promise<boolean> => {
    const project = await getProject(code);
    return project !== null;
};

// ==================== REPO OPERATIONS ====================

export const createRepo = async (projectCode: string, name: string, description: string = ''): Promise<Repo> => {
    const { data, error } = await supabase
        .from('repos')
        .insert({
            project_code: projectCode,
            name,
            description: description || null
        })
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const getRepos = async (projectCode: string): Promise<Repo[]> => {
    const { data, error } = await supabase
        .from('repos')
        .select('*')
        .eq('project_code', projectCode)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
};

// Admin: Get ALL repos from all projects
export const getAllRepos = async (): Promise<Repo[]> => {
    const { data, error } = await supabase
        .from('repos')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
};

// Admin: Get total storage usage across all projects
export const getTotalStorageUsage = async (): Promise<{ used: number; limit: number; percentage: number }> => {
    const { data, error } = await supabase
        .from('files')
        .select('size');

    if (error) throw error;

    const used = data?.reduce((sum, file) => sum + (file.size || 0), 0) || 0;
    const percentage = (used / STORAGE_LIMIT) * 100;

    return { used, limit: STORAGE_LIMIT, percentage };
};

export const getRepo = async (repoId: string): Promise<Repo | null> => {
    const { data, error } = await supabase
        .from('repos')
        .select('*')
        .eq('id', repoId)
        .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
};

export const deleteRepo = async (repoId: string): Promise<void> => {
    // First get all files to delete from storage
    const files = await getRepoFiles(repoId);

    // Delete files from storage
    for (const file of files) {
        if (file.storage_path) {
            await supabase.storage.from('files').remove([file.storage_path]);
        }
    }

    // Delete repo (files will cascade delete)
    const { error } = await supabase
        .from('repos')
        .delete()
        .eq('id', repoId);

    if (error) throw error;
};

// ==================== FILE OPERATIONS ====================

export const uploadFile = async (
    projectCode: string,
    repoId: string,
    file: File | Blob,
    fileName: string,
    onProgress?: (progress: number, bytesUploaded: number, totalBytes: number) => void
): Promise<FileRecord> => {
    // Check storage limit
    const { percentage } = await getStorageUsage(projectCode);
    if (percentage >= 100) {
        throw new Error('Storage limit reached. Please delete some files.');
    }

    const fileType = file.type || 'application/octet-stream';

    // Check if file needs chunking (> 45MB)
    if (needsChunking(file)) {
        return uploadChunkedFile(projectCode, repoId, file, fileName, fileType, onProgress);
    }

    // Standard upload for small files
    const fileId = crypto.randomUUID();
    const storagePath = `${projectCode}/${fileId}`;

    const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(storagePath, file);

    if (uploadError) throw uploadError;
    if (onProgress) onProgress(100, file.size, file.size);

    // Save metadata
    const { data, error } = await supabase
        .from('files')
        .insert({
            repo_id: repoId,
            project_code: projectCode,
            name: fileName,
            type: fileType,
            size: file.size,
            storage_path: storagePath,
            is_chunked: false,
            chunk_count: null,
            parent_file_id: null,
            chunk_index: null
        })
        .select()
        .single();

    if (error) throw error;
    return data;
};

// Upload a large file as multiple chunks
const uploadChunkedFile = async (
    projectCode: string,
    repoId: string,
    file: File | Blob,
    fileName: string,
    fileType: string,
    onProgress?: (progress: number, bytesUploaded: number, totalBytes: number) => void
): Promise<FileRecord> => {
    const chunks = splitFileIntoChunks(file);
    const parentFileId = crypto.randomUUID();
    let uploadedChunks = 0;
    let bytesUploaded = 0;
    const totalBytes = file.size;

    // First, create the parent file record
    const { data: parentFile, error: parentError } = await supabase
        .from('files')
        .insert({
            id: parentFileId,
            repo_id: repoId,
            project_code: projectCode,
            name: fileName,
            type: fileType,
            size: file.size,
            storage_path: null, // Parent has no direct storage
            is_chunked: true,
            chunk_count: chunks.length,
            parent_file_id: null,
            chunk_index: null
        })
        .select()
        .single();

    if (parentError) throw parentError;

    // Upload each chunk
    for (const chunk of chunks) {
        const chunkId = crypto.randomUUID();
        const storagePath = `${projectCode}/${parentFileId}/chunk_${chunk.index}`;

        // Upload chunk to storage
        const { error: uploadError } = await supabase.storage
            .from('files')
            .upload(storagePath, chunk.blob);

        if (uploadError) {
            // Cleanup on failure
            console.error('Chunk upload failed:', uploadError);
            throw uploadError;
        }

        // Save chunk metadata
        const { error: chunkError } = await supabase
            .from('files')
            .insert({
                id: chunkId,
                repo_id: repoId,
                project_code: projectCode,
                name: `${fileName}.chunk.${chunk.index}`,
                type: fileType,
                size: chunk.size,
                storage_path: storagePath,
                is_chunked: false,
                chunk_count: null,
                parent_file_id: parentFileId,
                chunk_index: chunk.index
            });

        if (chunkError) throw chunkError;

        uploadedChunks++;
        bytesUploaded += chunk.size;
        if (onProgress) {
            const progress = Math.round((bytesUploaded / totalBytes) * 100);
            onProgress(progress, bytesUploaded, totalBytes);
        }
    }

    return parentFile;
};

export const getRepoFiles = async (repoId: string): Promise<FileRecord[]> => {
    const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('repo_id', repoId)
        .is('parent_file_id', null) // Only get top-level files, not chunks
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
};

export const deleteFile = async (fileId: string, storagePath: string | null, isChunked: boolean = false): Promise<void> => {
    if (isChunked) {
        // Get all chunks for this file
        const { data: chunks } = await supabase
            .from('files')
            .select('id, storage_path')
            .eq('parent_file_id', fileId);

        // Delete each chunk from storage
        if (chunks) {
            for (const chunk of chunks) {
                if (chunk.storage_path) {
                    await supabase.storage.from('files').remove([chunk.storage_path]);
                }
            }
        }

        // Delete chunk metadata
        await supabase
            .from('files')
            .delete()
            .eq('parent_file_id', fileId);
    } else if (storagePath) {
        // Delete single file from storage
        await supabase.storage.from('files').remove([storagePath]);
    }

    // Delete main file metadata
    const { error } = await supabase
        .from('files')
        .delete()
        .eq('id', fileId);

    if (error) throw error;
};

export const downloadFile = async (
    file: FileRecord,
    onProgress?: (progress: number, downloaded: number, total: number) => void
): Promise<void> => {
    let blob: Blob;

    if (file.is_chunked && file.chunk_count) {
        // Get all chunks in order
        const { data: chunks, error: chunksError } = await supabase
            .from('files')
            .select('*')
            .eq('parent_file_id', file.id)
            .order('chunk_index', { ascending: true });

        if (chunksError) throw chunksError;
        if (!chunks || chunks.length === 0) throw new Error('No chunks found');

        // Download each chunk with progress
        const chunkBlobs: Blob[] = [];
        let downloadedBytes = 0;
        const totalBytes = file.size;

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            if (!chunk.storage_path) continue;

            const { data, error } = await supabase.storage
                .from('files')
                .download(chunk.storage_path);

            if (error) throw error;
            chunkBlobs.push(data);

            downloadedBytes += chunk.size || data.size;
            if (onProgress) {
                const progress = Math.round((downloadedBytes / totalBytes) * 100);
                onProgress(progress, downloadedBytes, totalBytes);
            }
        }

        // Merge chunks back into original file
        blob = await mergeChunks(chunkBlobs, file.type || 'application/octet-stream');
    } else if (file.storage_path) {
        // For single files, we can't track progress easily, so just report 50% -> 100%
        if (onProgress) onProgress(50, file.size / 2, file.size);

        const { data, error } = await supabase.storage
            .from('files')
            .download(file.storage_path);

        if (error) throw error;
        blob = data;
        if (onProgress) onProgress(100, file.size, file.size);
    } else {
        throw new Error('No storage path found');
    }

    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
};

export const getFileUrl = (storagePath: string): string => {
    const { data } = supabase.storage.from('files').getPublicUrl(storagePath);
    return data.publicUrl;
};
