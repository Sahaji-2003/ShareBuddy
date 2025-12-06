import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface ProjectContextType {
    projectCode: string | null;
    setProjectCode: (code: string | null) => void;
    isLoading: boolean;
    logout: () => void;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

const STORAGE_KEY = 'sharebuddy_project_code';

export function ProjectProvider({ children }: { children: ReactNode }) {
    const [projectCode, setProjectCodeState] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Load saved project code from localStorage
        const savedCode = localStorage.getItem(STORAGE_KEY);
        if (savedCode) {
            setProjectCodeState(savedCode);
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

    const logout = () => {
        localStorage.removeItem(STORAGE_KEY);
        setProjectCodeState(null);
    };

    return (
        <ProjectContext.Provider value={{ projectCode, setProjectCode, isLoading, logout }}>
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
