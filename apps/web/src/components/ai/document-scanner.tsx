'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Upload, CheckCircle2, AlertTriangle, FileText, Shield, Eye } from 'lucide-react'
import { useParseDocument, useVerifyDocument } from '@/hooks/use-ai'

interface DocumentScannerProps {
    documentType: 'business_license' | 'insurance' | 'certification' | 'id'
    onComplete?: (result: any) => void
    className?: string
}

const documentTypeConfig = {
    business_license: {
        title: 'Business License',
        description: 'Upload your business license for verification',
        icon: FileText,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
    },
    insurance: {
        title: 'Insurance Certificate',
        description: 'Upload proof of liability insurance',
        icon: Shield,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
    },
    certification: {
        title: 'Professional Certification',
        description: 'Upload IICRC or other cleaning certifications',
        icon: CheckCircle2,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
    },
    id: {
        title: 'Government ID',
        description: 'Upload a valid government-issued ID',
        icon: Eye,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
    },
}

export function DocumentScanner({
    documentType,
    onComplete,
    className = '',
}: DocumentScannerProps) {
    const [imageUrl, setImageUrl] = useState<string | null>(null)
    const [step, setStep] = useState<'upload' | 'parsing' | 'verifying' | 'complete'>('upload')
    const [parsedData, setParsedData] = useState<any>(null)
    const [verifyResult, setVerifyResult] = useState<any>(null)

    const parseMutation = useParseDocument()
    const verifyMutation = useVerifyDocument()

    const config = documentTypeConfig[documentType]
    const Icon = config.icon

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Convert to data URL for preview and API
        const reader = new FileReader()
        reader.onloadend = async () => {
            const dataUrl = reader.result as string
            setImageUrl(dataUrl)
            setStep('parsing')

            try {
                // Parse document
                const parseResult = await parseMutation.mutateAsync({
                    imageUrl: dataUrl,
                    documentType,
                })

                if (parseResult.success) {
                    setParsedData(parseResult.extracted_data)
                    setStep('verifying')

                    // Verify authenticity
                    const verifyRes = await verifyMutation.mutateAsync({
                        imageUrl: dataUrl,
                        documentType,
                    })

                    setVerifyResult(verifyRes)
                    setStep('complete')

                    onComplete?.({
                        parsed: parseResult,
                        verified: verifyRes,
                    })
                } else {
                    setStep('upload')
                }
            } catch (error) {
                console.error('Document processing error:', error)
                setStep('upload')
            }
        }
        reader.readAsDataURL(file)
    }

    const reset = () => {
        setImageUrl(null)
        setStep('upload')
        setParsedData(null)
        setVerifyResult(null)
    }

    return (
        <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${className}`}>
            {/* Header */}
            <div className={`p-4 ${config.bgColor}`}>
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-white flex items-center justify-center ${config.color}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">{config.title}</h3>
                        <p className="text-sm text-gray-600">{config.description}</p>
                    </div>
                </div>
            </div>

            <div className="p-6">
                {/* Upload Step */}
                {step === 'upload' && (
                    <div className="text-center">
                        <label className="block cursor-pointer">
                            <div className="border-2 border-dashed rounded-xl p-8 hover:bg-gray-50 transition-colors">
                                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600 mb-2">Click or drag to upload</p>
                                <p className="text-sm text-gray-400">Supports JPG, PNG, PDF</p>
                            </div>
                            <input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </label>
                    </div>
                )}

                {/* Processing Steps */}
                {(step === 'parsing' || step === 'verifying') && (
                    <div className="text-center py-8">
                        <Loader2 className="w-12 h-12 text-violet-600 mx-auto mb-4 animate-spin" />
                        <p className="text-gray-600">
                            {step === 'parsing' ? 'Extracting document information...' : 'Verifying authenticity...'}
                        </p>
                        {imageUrl && (
                            <div className="mt-4 max-w-xs mx-auto">
                                <img src={imageUrl} alt="Uploaded document" className="rounded-lg border" />
                            </div>
                        )}
                    </div>
                )}

                {/* Complete Step */}
                {step === 'complete' && (
                    <div className="space-y-6">
                        {/* Verification Status */}
                        <div className={`flex items-center gap-3 p-4 rounded-lg ${verifyResult?.is_valid ? 'bg-green-50' : 'bg-yellow-50'
                            }`}>
                            {verifyResult?.is_valid ? (
                                <CheckCircle2 className="w-6 h-6 text-green-600" />
                            ) : (
                                <AlertTriangle className="w-6 h-6 text-yellow-600" />
                            )}
                            <div>
                                <p className={`font-medium ${verifyResult?.is_valid ? 'text-green-800' : 'text-yellow-800'
                                    }`}>
                                    {verifyResult?.is_valid ? 'Document Verified' : 'Requires Review'}
                                </p>
                                <p className="text-sm text-gray-600">
                                    Confidence: {verifyResult?.confidence}%
                                </p>
                            </div>
                        </div>

                        {/* Extracted Data */}
                        {parsedData && (
                            <div>
                                <h4 className="font-medium text-gray-900 mb-3">Extracted Information</h4>
                                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                    {Object.entries(parsedData as Record<string, unknown>).map(([key, value]) => {
                                        if (!value) return null;
                                        return (
                                            <div key={key} className="flex justify-between text-sm">
                                                <span className="text-gray-600 capitalize">
                                                    {key.replace(/_/g, ' ')}
                                                </span>
                                                <span className="text-gray-900 font-medium">
                                                    {String(value)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Concerns if any */}
                        {verifyResult?.concerns?.length > 0 && (
                            <div>
                                <h4 className="font-medium text-yellow-800 mb-2">Concerns</h4>
                                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                    {verifyResult.concerns.map((c: string, i: number) => (
                                        <li key={i}>{c}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3">
                            <Button onClick={reset} variant="outline" className="flex-1">
                                Upload Different Document
                            </Button>
                            <Button
                                onClick={() => onComplete?.({ parsed: parsedData, verified: verifyResult })}
                                className="flex-1 bg-violet-600 hover:bg-violet-700"
                            >
                                Confirm & Continue
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default DocumentScanner
