import React, { createContext, useContext, useState } from 'react';

type RefreshContextType = {
    isRefreshing: boolean;
    setRefreshing: (refreshing: boolean) => void;
};

const RefreshContext = createContext<RefreshContextType | undefined>(undefined);

export const useRefresh = () => {
    const context = useContext(RefreshContext);
    if (!context) {
        throw new Error('useRefresh must be used within a RefreshProvider');
    }
    return context;
};

export const RefreshProvider = ({ children }: { children: React.ReactNode }) => {
    const [isRefreshing, setIsRefreshing] = useState(false);

    return (
        <RefreshContext.Provider value={{ isRefreshing, setRefreshing: setIsRefreshing }}>
            {children}
        </RefreshContext.Provider>
    );
};
