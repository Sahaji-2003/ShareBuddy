import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface ShareBuddyDB extends DBSchema {
    repos: {
        key: string;
        value: {
            id: string;
            name: string;
            description: string;
            createdAt: number;
        };
        indexes: { 'by-date': number };
    };
    files: {
        key: string;
        value: {
            id: string;
            repoId: string;
            name: string;
            type: string;
            size: number;
            content: Blob;
            createdAt: number;
        };
        indexes: { 'by-repo': string };
    };
}

const DB_NAME = 'share-buddy-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ShareBuddyDB>>;

export const getDB = () => {
    if (!dbPromise) {
        dbPromise = openDB<ShareBuddyDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                // Repos store
                if (!db.objectStoreNames.contains('repos')) {
                    const repoStore = db.createObjectStore('repos', { keyPath: 'id' });
                    repoStore.createIndex('by-date', 'createdAt');
                }

                // Files store
                if (!db.objectStoreNames.contains('files')) {
                    const fileStore = db.createObjectStore('files', { keyPath: 'id' });
                    fileStore.createIndex('by-repo', 'repoId');
                }
            },
        });
    }
    return dbPromise;
};

// Repository Operations
export const createRepo = async (name: string, description: string = '') => {
    const db = await getDB();
    const id = crypto.randomUUID();
    const repo = {
        id,
        name,
        description,
        createdAt: Date.now(),
    };
    await db.add('repos', repo);
    return repo;
};

export const getAllRepos = async () => {
    const db = await getDB();
    return db.getAllFromIndex('repos', 'by-date');
};

export const getRepo = async (id: string) => {
    const db = await getDB();
    return db.get('repos', id);
};

export const deleteRepo = async (id: string) => {
    const db = await getDB();
    const tx = db.transaction(['repos', 'files'], 'readwrite');

    // Delete repo
    await tx.objectStore('repos').delete(id);

    // Delete all files in repo
    const filesIndex = tx.objectStore('files').index('by-repo');
    let cursor = await filesIndex.openCursor(IDBKeyRange.only(id));

    while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
    }

    await tx.done;
};

// File Operations
export const addFile = async (repoId: string, file: File | Blob, name: string) => {
    const db = await getDB();
    const id = crypto.randomUUID();
    const fileRecord = {
        id,
        repoId,
        name,
        type: file.type,
        size: file.size,
        content: file,
        createdAt: Date.now(),
    };
    await db.add('files', fileRecord);
    return fileRecord;
};

export const getRepoFiles = async (repoId: string) => {
    const db = await getDB();
    return db.getAllFromIndex('files', 'by-repo', repoId);
};

export const getFile = async (id: string) => {
    const db = await getDB();
    return db.get('files', id);
};

export const deleteFile = async (id: string) => {
    const db = await getDB();
    await db.delete('files', id);
};
