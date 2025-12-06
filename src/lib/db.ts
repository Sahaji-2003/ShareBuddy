import { supabase } from './supabase';

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
    onProgress?: (progress: number) => void
): Promise<FileRecord> => {
    // Check storage limit
    const { percentage } = await getStorageUsage(projectCode);
    if (percentage >= 100) {
        throw new Error('Storage limit reached. Please delete some files.');
    }

    const fileId = crypto.randomUUID();
    const storagePath = `${projectCode}/${fileId}`;

    // For large files (> 6MB), use resumable upload
    const CHUNK_SIZE = 6 * 1024 * 1024; // 6MB chunks

    if (file.size > CHUNK_SIZE) {
        // Use resumable upload (TUS protocol)
        await uploadResumable(storagePath, file, onProgress);
    } else {
        // Standard upload for small files
        const { error: uploadError } = await supabase.storage
            .from('files')
            .upload(storagePath, file);

        if (uploadError) throw uploadError;
        if (onProgress) onProgress(100);
    }

    // Save metadata
    const { data, error } = await supabase
        .from('files')
        .insert({
            repo_id: repoId,
            project_code: projectCode,
            name: fileName,
            type: file.type || 'application/octet-stream',
            size: file.size,
            storage_path: storagePath
        })
        .select()
        .single();

    if (error) throw error;
    return data;
};

// Resumable upload for large files using TUS protocol
const uploadResumable = (
    storagePath: string,
    file: File | Blob,
    onProgress?: (progress: number) => void
): Promise<void> => {
    return new Promise((resolve, reject) => {
        const projectId = import.meta.env.VITE_SUPABASE_URL?.replace('https://', '').split('.')[0];
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        // Dynamic import to avoid SSR issues
        import('tus-js-client').then(({ Upload }) => {
            const upload = new Upload(file, {
                endpoint: `https://${projectId}.supabase.co/storage/v1/upload/resumable`,
                retryDelays: [0, 3000, 5000, 10000, 20000],
                headers: {
                    authorization: `Bearer ${anonKey}`,
                    'x-upsert': 'true'
                },
                uploadDataDuringCreation: true,
                removeFingerprintOnSuccess: true,
                metadata: {
                    bucketName: 'files',
                    objectName: storagePath,
                    contentType: file.type || 'application/octet-stream',
                    cacheControl: '3600'
                },
                chunkSize: 6 * 1024 * 1024, // 6MB chunks
                onError: (error) => {
                    console.error('Upload failed:', error);
                    reject(error);
                },
                onProgress: (bytesUploaded, bytesTotal) => {
                    const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
                    if (onProgress) onProgress(percentage);
                },
                onSuccess: () => {
                    if (onProgress) onProgress(100);
                    resolve();
                }
            });

            // Check for previous uploads to resume
            upload.findPreviousUploads().then((previousUploads) => {
                if (previousUploads.length) {
                    upload.resumeFromPreviousUpload(previousUploads[0]);
                }
                upload.start();
            });
        }).catch(reject);
    });
};

export const getRepoFiles = async (repoId: string): Promise<FileRecord[]> => {
    const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('repo_id', repoId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
};

export const deleteFile = async (fileId: string, storagePath: string | null): Promise<void> => {
    // Delete from storage
    if (storagePath) {
        await supabase.storage.from('files').remove([storagePath]);
    }

    // Delete metadata
    const { error } = await supabase
        .from('files')
        .delete()
        .eq('id', fileId);

    if (error) throw error;
};

export const downloadFile = async (storagePath: string, fileName: string): Promise<void> => {
    const { data, error } = await supabase.storage
        .from('files')
        .download(storagePath);

    if (error) throw error;

    // Create download link
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
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
