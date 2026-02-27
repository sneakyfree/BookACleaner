'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    FileText, Image as ImageIcon, Trash2, Download, Upload,
    Loader2, AlertCircle, File, X
} from 'lucide-react'
import { toast } from 'sonner'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface UploadedFile {
    key: string
    filename: string
    size: number
    category: string
    content_type: string
    uploaded_at: string
    url?: string
}

interface FileManagerProps {
    category?: string
    title?: string
    onFileSelect?: (file: UploadedFile) => void
    className?: string
}

export function FileManager({
    category,
    title = 'My Files',
    onFileSelect,
    className = '',
}: FileManagerProps) {
    const { data: session } = useSession()
    const [files, setFiles] = useState<UploadedFile[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [uploading, setUploading] = useState(false)
    const [deletingKey, setDeletingKey] = useState<string | null>(null)

    const fetchFiles = useCallback(async () => {
        const token = (session as any)?.accessToken
        if (!token) return

        try {
            setLoading(true)
            setError('')
            const params = category ? `?category=${category}` : ''
            const res = await fetch(`${API_URL}/api/v1/uploads/my-files${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) throw new Error('Failed to load files')
            const data = await res.json()
            setFiles(data.files || data || [])
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [session, category])

    useEffect(() => {
        if (session) fetchFiles()
    }, [session, fetchFiles])

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const token = (session as any)?.accessToken
        if (!token) return

        setUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)

            // Use presigned upload for large files (>5MB)
            if (file.size > 5 * 1024 * 1024) {
                // Get presigned URL
                const presignRes = await fetch(`${API_URL}/api/v1/uploads/presigned-upload`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        filename: file.name,
                        content_type: file.type,
                        category: category || 'general',
                    }),
                })
                if (!presignRes.ok) throw new Error('Failed to get upload URL')
                const { upload_url } = await presignRes.json()

                // Upload directly to presigned URL
                const uploadRes = await fetch(upload_url, {
                    method: 'PUT',
                    body: file,
                    headers: { 'Content-Type': file.type },
                })
                if (!uploadRes.ok) throw new Error('Upload failed')
            } else {
                // Direct upload for smaller files
                const cat = category || 'general'
                const res = await fetch(`${API_URL}/api/v1/uploads/upload/${cat}`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: formData,
                })
                if (!res.ok) throw new Error('Upload failed')
            }

            toast.success('File uploaded successfully')
            fetchFiles()
        } catch (err: any) {
            toast.error(err.message || 'Upload failed')
        } finally {
            setUploading(false)
            e.target.value = '' // Reset file input
        }
    }

    const handleDelete = async (key: string) => {
        const token = (session as any)?.accessToken
        if (!token) return

        setDeletingKey(key)
        try {
            const res = await fetch(`${API_URL}/api/v1/uploads/${encodeURIComponent(key)}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) throw new Error('Failed to delete file')
            setFiles(prev => prev.filter(f => f.key !== key))
            toast.success('File deleted')
        } catch {
            toast.error('Failed to delete file')
        } finally {
            setDeletingKey(null)
        }
    }

    const handleDownload = async (key: string, filename: string) => {
        const token = (session as any)?.accessToken
        if (!token) return

        try {
            const res = await fetch(`${API_URL}/api/v1/uploads/presigned/${encodeURIComponent(key)}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) throw new Error('Failed to get download URL')
            const { url } = await res.json()
            window.open(url, '_blank')
        } catch {
            toast.error('Failed to download file')
        }
    }

    const getFileIcon = (contentType: string) => {
        if (contentType.startsWith('image/')) return ImageIcon
        return FileText
    }

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    return (
        <Card className={className}>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">{title}</CardTitle>
                <label>
                    <input
                        type="file"
                        className="hidden"
                        onChange={handleUpload}
                        disabled={uploading}
                    />
                    <Button asChild size="sm" disabled={uploading} className="cursor-pointer">
                        <span>
                            {uploading ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-1" />
                            ) : (
                                <Upload className="w-4 h-4 mr-1" />
                            )}
                            {uploading ? 'Uploading...' : 'Upload'}
                        </span>
                    </Button>
                </label>
            </CardHeader>
            <CardContent>
                {error && (
                    <div className="p-3 mb-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : files.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <File className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">No files uploaded yet</p>
                        <p className="text-xs mt-1">Upload files using the button above</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {files.map((file) => {
                            const Icon = getFileIcon(file.content_type)
                            return (
                                <div
                                    key={file.key}
                                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition group"
                                    onClick={() => onFileSelect?.(file)}
                                >
                                    <div className="w-9 h-9 rounded-lg bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center">
                                        <Icon className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{file.filename}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatSize(file.size)} · {new Date(file.uploaded_at).toLocaleDateString()}
                                            {file.category && (
                                                <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px]">
                                                    {file.category}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={(e) => { e.stopPropagation(); handleDownload(file.key, file.filename) }}
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                                            onClick={(e) => { e.stopPropagation(); handleDelete(file.key) }}
                                            disabled={deletingKey === file.key}
                                        >
                                            {deletingKey === file.key ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-3.5 h-3.5" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export default FileManager
