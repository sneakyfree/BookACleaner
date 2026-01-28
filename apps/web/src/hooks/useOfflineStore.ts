'use client'

import { useState, useEffect, useCallback } from 'react'

/**
 * IndexedDB Store for Offline Data Persistence
 * Provides a simple key-value store for offline data
 */

const DB_NAME = 'bookacleaner-offline'
const DB_VERSION = 1

interface OfflineStore {
    messages: { id: string; content: string; timestamp: number; synced: boolean }[]
    bookings: { id: string; data: any; timestamp: number; synced: boolean }[]
    userData: { key: string; value: any; timestamp: number }[]
}

type StoreName = keyof OfflineStore

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION)

        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve(request.result)

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result

            // Create stores
            if (!db.objectStoreNames.contains('messages')) {
                db.createObjectStore('messages', { keyPath: 'id' })
            }
            if (!db.objectStoreNames.contains('bookings')) {
                db.createObjectStore('bookings', { keyPath: 'id' })
            }
            if (!db.objectStoreNames.contains('userData')) {
                db.createObjectStore('userData', { keyPath: 'key' })
            }
        }
    })
}

/**
 * Hook for offline data storage
 */
export function useOfflineStore<T>(storeName: StoreName) {
    const [isReady, setIsReady] = useState(false)
    const [db, setDb] = useState<IDBDatabase | null>(null)

    useEffect(() => {
        openDB()
            .then((database) => {
                setDb(database)
                setIsReady(true)
            })
            .catch((error) => {
                console.error('Failed to open IndexedDB:', error)
            })

        return () => {
            db?.close()
        }
    }, [])

    const put = useCallback(
        async (data: T & { id: string }) => {
            if (!db) return

            return new Promise<void>((resolve, reject) => {
                const tx = db.transaction(storeName, 'readwrite')
                const store = tx.objectStore(storeName)
                const request = store.put(data)

                request.onsuccess = () => resolve()
                request.onerror = () => reject(request.error)
            })
        },
        [db, storeName]
    )

    const get = useCallback(
        async (id: string): Promise<T | undefined> => {
            if (!db) return undefined

            return new Promise((resolve, reject) => {
                const tx = db.transaction(storeName, 'readonly')
                const store = tx.objectStore(storeName)
                const request = store.get(id)

                request.onsuccess = () => resolve(request.result)
                request.onerror = () => reject(request.error)
            })
        },
        [db, storeName]
    )

    const getAll = useCallback(async (): Promise<T[]> => {
        if (!db) return []

        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly')
            const store = tx.objectStore(storeName)
            const request = store.getAll()

            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
        })
    }, [db, storeName])

    const remove = useCallback(
        async (id: string) => {
            if (!db) return

            return new Promise<void>((resolve, reject) => {
                const tx = db.transaction(storeName, 'readwrite')
                const store = tx.objectStore(storeName)
                const request = store.delete(id)

                request.onsuccess = () => resolve()
                request.onerror = () => reject(request.error)
            })
        },
        [db, storeName]
    )

    const clear = useCallback(async () => {
        if (!db) return

        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite')
            const store = tx.objectStore(storeName)
            const request = store.clear()

            request.onsuccess = () => resolve()
            request.onerror = () => reject(request.error)
        })
    }, [db, storeName])

    return {
        isReady,
        put,
        get,
        getAll,
        remove,
        clear,
    }
}

/**
 * Hook for offline message queue
 */
export function useOfflineMessages() {
    const store = useOfflineStore<{
        id: string
        content: string
        recipientId: string
        timestamp: number
        synced: boolean
    }>('messages')

    const queueMessage = useCallback(
        async (content: string, recipientId: string) => {
            const message = {
                id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                content,
                recipientId,
                timestamp: Date.now(),
                synced: false,
            }

            await store.put(message)
            return message
        },
        [store]
    )

    const getUnsyncedMessages = useCallback(async () => {
        const all = await store.getAll()
        return all.filter((msg) => !msg.synced)
    }, [store])

    const markAsSynced = useCallback(
        async (id: string) => {
            const msg = await store.get(id)
            if (msg) {
                await store.put({ ...msg, synced: true })
            }
        },
        [store]
    )

    return {
        ...store,
        queueMessage,
        getUnsyncedMessages,
        markAsSynced,
    }
}

/**
 * Hook for offline booking queue
 */
export function useOfflineBookings() {
    const store = useOfflineStore<{
        id: string
        data: any
        timestamp: number
        synced: boolean
    }>('bookings')

    const queueBooking = useCallback(
        async (bookingData: any) => {
            const booking = {
                id: `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                data: bookingData,
                timestamp: Date.now(),
                synced: false,
            }

            await store.put(booking)
            return booking
        },
        [store]
    )

    const getUnsyncedBookings = useCallback(async () => {
        const all = await store.getAll()
        return all.filter((b) => !b.synced)
    }, [store])

    const markAsSynced = useCallback(
        async (id: string) => {
            const booking = await store.get(id)
            if (booking) {
                await store.put({ ...booking, synced: true })
            }
        },
        [store]
    )

    return {
        ...store,
        queueBooking,
        getUnsyncedBookings,
        markAsSynced,
    }
}
