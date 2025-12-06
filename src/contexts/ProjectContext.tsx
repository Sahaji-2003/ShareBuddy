import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface ProjectContextType {
    projectCode: string | null;
    setProjectCode: (code: string | null) => void;
    isLoading: boolean;
    isAdmin: boolean;
    setIsAdmin: (admin: boolean) => void;
    logout: () => void;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

const STORAGE_KEY = 'sharebuddy_project_code';
const ADMIN_KEY = 'sharebuddy_admin';

export function ProjectProvider({ children }: { children: ReactNode }) {
    const [projectCode, setProjectCodeState] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdmin, setIsAdminState] = useState(false);

    useEffect(() => {
        // Load saved project code from localStorage
        const savedCode = localStorage.getItem(STORAGE_KEY);
        const savedAdmin = localStorage.getItem(ADMIN_KEY);
        if (savedCode) {
            setProjectCodeState(savedCode);
        }
        if (savedAdmin === 'true') {
            setIsAdminState(true);
        }
        setIsLoading(false);
    }, []);

    const setProjectCode = (code: string | null) => {
        if (code) {
            localStorage.setItem(STORAGE_KEY, code);
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
        setProjectCodeState(code);
    };

    const setIsAdmin = (admin: boolean) => {
        if (admin) {
            localStorage.setItem(ADMIN_KEY, 'true');
        } else {
            localStorage.removeItem(ADMIN_KEY);
        }
        setIsAdminState(admin);
    };

    const logout = () => {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(ADMIN_KEY);
        setProjectCodeState(null);
        setIsAdminState(false);
    };

    return (
        <ProjectContext.Provider value={{ projectCode, setProjectCode, isLoading, isAdmin, setIsAdmin, logout }}>
            {children}
        </ProjectContext.Provider>
    );
}

export function useProject() {
    const context = useContext(ProjectContext);
    if (!context) {
        throw new Error('useProject must be used within ProjectProvider');
    }
    return context;
}
