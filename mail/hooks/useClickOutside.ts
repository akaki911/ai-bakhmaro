import { useEffect, useRef, RefObject } from 'react';

/**
 * Custom hook for handling clicks outside of a specified element.
 * @param callback The function to call when a click outside is detected.
 * @returns A ref object to be attached to the element to monitor.
 */
export const useClickOutside = <T extends HTMLElement>(callback: () => void): RefObject<T> => {
    const ref = useRef<T>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                callback();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [callback]);

    return ref;
};
