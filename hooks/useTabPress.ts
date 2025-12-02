import { useEffect, useRef } from 'react';

// Simple event emitter for React Native (no Node dependencies)
class SimpleEventEmitter {
    private listeners: Map<string, Set<Function>> = new Map();

    on(event: string, callback: Function) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
    }

    off(event: string, callback: Function) {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.delete(callback);
        }
    }

    emit(event: string, ...args: any[]) {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.forEach(callback => callback(...args));
        }
    }
}

const tabPressEmitter = new SimpleEventEmitter();

export const emitTabPress = (tabName: string) => {
    tabPressEmitter.emit('tabPress', tabName);
};

export const useTabPress = (tabName: string, callback: () => void) => {
    const callbackRef = useRef(callback);

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    useEffect(() => {
        const handler = (pressedTab: string) => {
            if (pressedTab === tabName) {
                callbackRef.current();
            }
        };

        tabPressEmitter.on('tabPress', handler);
        return () => {
            tabPressEmitter.off('tabPress', handler);
        };
    }, [tabName]);
};
