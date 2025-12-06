import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    deleteDoc,
    query,
    where,
    orderBy,
    Timestamp
} from 'firebase/firestore';
import {
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from 'firebase/storage';
import { db, storage } from './firebase';

// Types
export interface Project {
    code: string;
    createdAt: Date;
}

export interface Repo {
    id: string;
    projectCode: string;
    name: string;
    description: string;
    createdAt: Date;
}

export interface FileRecord {
    id: string;
    repoId: string;
    projectCode: string;
    name: string;
    type: string;
    size: number;
    storagePath: string;
    downloadUrl: string;
    createdAt: Date;
}

// Generate unique 4-digit code
const generateCode = (): string => {
    return Math.floor(1000 + Math.random() * 9000).toString();
};

// ==================== PROJECT OPERATIONS ====================

export const createProject = async (): Promise<string> => {
    let code = generateCode();
    let attempts = 0;

    // Keep trying until we find an unused code
    while (attempts < 10) {
        const projectRef = doc(db, 'projects', code);
        const projectSnap = await getDoc(projectRef);

        if (!projectSnap.exists()) {
            await setDoc(projectRef, {
                code,
                createdAt: Timestamp.now()
            });
            return code;
        }

        code = generateCode();
        attempts++;
    }

    throw new Error('Failed to generate unique code');
};

export const getProject = async (code: string): Promise<Project | null> => {
    const projectRef = doc(db, 'projects', code);
    const projectSnap = await getDoc(projectRef);

    if (!projectSnap.exists()) {
        return null;
    }

    const data = projectSnap.data();
    return {
        code: data.code,
        createdAt: data.createdAt.toDate()
    };
};

export const validateProjectCode = async (code: string): Promise<boolean> => {
    const project = await getProject(code);
    return project !== null;
};

// ==================== REPO OPERATIONS ====================

export const createRepo = async (projectCode: string, name: string, description: string = ''): Promise<Repo> => {
    const id = crypto.randomUUID();
    const repo: Repo = {
        id,
        projectCode,
        name,
        description,
        createdAt: new Date()
    };

    await setDoc(doc(db, 'repos', id), {
        ...repo,
        createdAt: Timestamp.now()
    });

    return repo;
};

export const getRepos = async (projectCode: string): Promise<Repo[]> => {
    const q = query(
        collection(db, 'repos'),
        where('projectCode', '==', projectCode),
        orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: data.id,
            projectCode: data.projectCode,
            name: data.name,
            description: data.description,
            createdAt: data.createdAt.toDate()
        };
    });
};

export const getRepo = async (repoId: string): Promise<Repo | null> => {
    const repoRef = doc(db, 'repos', repoId);
    const repoSnap = await getDoc(repoRef);

    if (!repoSnap.exists()) {
        return null;
    }

    const data = repoSnap.data();
    return {
        id: data.id,
        projectCode: data.projectCode,
        name: data.name,
        description: data.description,
        createdAt: data.createdAt.toDate()
    };
};

export const deleteRepo = async (repoId: string): Promise<void> => {
    // First delete all files in the repo
    const files = await getRepoFiles(repoId);

    for (const file of files) {
        await deleteFile(file.id, file.storagePath);
    }

    // Then delete the repo
    await deleteDoc(doc(db, 'repos', repoId));
};

// ==================== FILE OPERATIONS ====================

export const uploadFile = async (
    projectCode: string,
    repoId: string,
    file: File | Blob,
    fileName: string,
    onProgress?: (progress: number) => void
): Promise<FileRecord> => {
    const id = crypto.randomUUID();
    const storagePath = `projects/${projectCode}/files/${id}`;

    // Upload to Firebase Storage
    const storageRef = ref(storage, storagePath);

    // For progress tracking, we'd need to use uploadBytesResumable
    // But for simplicity, using uploadBytes
    await uploadBytes(storageRef, file);

    // Get download URL
    const downloadUrl = await getDownloadURL(storageRef);

    // Save metadata to Firestore
    const fileRecord: FileRecord = {
        id,
        repoId,
        projectCode,
        name: fileName,
        type: file.type || 'application/octet-stream',
        size: file.size,
        storagePath,
        downloadUrl,
        createdAt: new Date()
    };

    await setDoc(doc(db, 'files', id), {
        ...fileRecord,
        createdAt: Timestamp.now()
    });

    if (onProgress) onProgress(100);

    return fileRecord;
};

export const getRepoFiles = async (repoId: string): Promise<FileRecord[]> => {
    const q = query(
        collection(db, 'files'),
        where('repoId', '==', repoId),
        orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: data.id,
            repoId: data.repoId,
            projectCode: data.projectCode,
            name: data.name,
            type: data.type,
            size: data.size,
            storagePath: data.storagePath,
            downloadUrl: data.downloadUrl,
            createdAt: data.createdAt.toDate()
        };
    });
};

export const getFile = async (fileId: string): Promise<FileRecord | null> => {
    const fileRef = doc(db, 'files', fileId);
    const fileSnap = await getDoc(fileRef);

    if (!fileSnap.exists()) {
        return null;
    }

    const data = fileSnap.data();
    return {
        id: data.id,
        repoId: data.repoId,
        projectCode: data.projectCode,
        name: data.name,
        type: data.type,
        size: data.size,
        storagePath: data.storagePath,
        downloadUrl: data.downloadUrl,
        createdAt: data.createdAt.toDate()
    };
};

export const deleteFile = async (fileId: string, storagePath: string): Promise<void> => {
    // Delete from Storage
    try {
        const storageRef = ref(storage, storagePath);
        await deleteObject(storageRef);
    } catch (err) {
        console.warn('Storage delete failed (file may not exist):', err);
    }

    // Delete from Firestore
    await deleteDoc(doc(db, 'files', fileId));
};

export const downloadFile = async (downloadUrl: string, fileName: string): Promise<void> => {
    // Fetch the file
    const response = await fetch(downloadUrl);
    const blob = await response.blob();

    // Create download link
    const url = URL.createObjectURL(blob);
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
