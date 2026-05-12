'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  Camera,
  Video,
  FileText,
  Link as LinkIcon,
  X,
  Upload,
  Image as LucideImage,
  Monitor,
  User,
  Circle,
  StopCircle,
  RefreshCw,
  Eye,
  Download,
  ExternalLink,
  CheckCircle2,
  Loader2,
  Plus,
} from 'lucide-react';
import { uploadToFirebaseServer } from '@/ai/flows/firebase-upload';
import { useStorage } from '@/firebase';
import { firebaseConfig } from '@/firebase/config';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useSystemParameters } from '@/providers/system-parameters-provider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface EvidenceInputProps {
  value: string;
  onChange: (value: string) => void;
  onlyCamera?: boolean;
}

type MediaMode = 'photo' | 'video';
type SourceType = 'camera' | 'screen';

export function EvidenceInput({ value, onChange, onlyCamera }: EvidenceInputProps) {
  const [items, setItems] = useState<string[]>(value ? value.split('|').filter(Boolean) : []);
  const { toast } = useToast();
  const storage = useStorage();
  const { params: systemParams } = useSystemParameters();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mediaMode, setMediaMode] = useState<MediaMode>('photo');
  const [sourceType, setSourceType] = useState<SourceType>('camera');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [previewItem, setPreviewItem] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [pendingLink, setPendingLink] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const newValue = value ? value.split('|').filter(Boolean) : [];
    setItems(prev => JSON.stringify(newValue) === JSON.stringify(prev) ? prev : newValue);
  }, [value]);

  useEffect(() => {
    const getDevices = async () => {
      try {
        const initialStream = await navigator.mediaDevices.getUserMedia({ video: true });
        initialStream.getTracks().forEach(track => track.stop());

        const devs = await navigator.mediaDevices.enumerateDevices();
        const videoDevs = devs.filter(device => device.kind === 'videoinput');
        setDevices(videoDevs);

        if (videoDevs.length > 0 && !selectedDeviceId) {
          const backCam = videoDevs.find(device => device.label.toLowerCase().includes('back') || device.label.toLowerCase().includes('rear'));
          setSelectedDeviceId(backCam ? backCam.deviceId : videoDevs[0].deviceId);
        }
      } catch (error) {
        console.error('Error listing devices:', error);
      }
    };

    getDevices();
    navigator.mediaDevices.addEventListener('devicechange', getDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', getDevices);
  }, [selectedDeviceId]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    return () => stopStream();
  }, [stream]);

  useEffect(() => {
    const currentPropValue = value || '';
    const currentLocalValue = items.join('|');
    if (currentLocalValue !== currentPropValue) {
      onChange(currentLocalValue);
    }
  }, [items]);

  const syncItems = (updater: string[] | ((prev: string[]) => string[])) => {
    setItems(prev => {
      const nextItems = typeof updater === 'function'
        ? (updater as (prev: string[]) => string[])(prev)
        : updater;
      return nextItems;
    });
  };

  const parseItem = (item: string) => {
    if (item.includes(':::')) {
      const parts = item.split(':::');
      return { name: parts[0], data: parts.slice(1).join(':::') };
    }
    return { name: '', data: item };
  };

  const addItem = (data: string, name?: string) => {
    const finalName = name || (data.startsWith('data:image') ? `Anh_${Date.now()}` : (data.startsWith('data:video') ? `Video_${Date.now()}` : `Tep_${Date.now()}`));
    const newItem = `${finalName}:::${data}`;
    syncItems(prev => [...prev, newItem]);
  };

  const removeItem = (index: number) => {
    syncItems(prev => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const updateItemName = (index: number, newName: string) => {
    const { data } = parseItem(items[index]);
    syncItems(prev => prev.map((item, itemIndex) => itemIndex === index ? `${newName.trim() || `Tep_${index + 1}`}:::${data}` : item));
    setEditingIndex(null);
  };

  const isFrontCamera = useMemo(() => {
    if (!selectedDeviceId || devices.length === 0) return true;
    const device = devices.find(item => item.deviceId === selectedDeviceId);
    if (!device) return true;
    const label = device.label.toLowerCase();
    return label.includes('front') || label.includes('user') || label.includes('facing');
  }, [selectedDeviceId, devices]);

  const sanitizeFileName = (fileName: string) => fileName.replace(/[^a-zA-Z0-9._-]/g, '_');

  const uploadBlobDirectly = async (blob: Blob, fileName: string) => {
    const storageRef = ref(storage, `evidence/${Date.now()}_${sanitizeFileName(fileName)}`);
    const snapshot = await uploadBytes(storageRef, blob, blob.type ? { contentType: blob.type } : undefined);
    return getDownloadURL(snapshot.ref);
  };

  const uploadBlobToStorage = async (blob: Blob, fileName: string) => {
    const serviceAccountEmail = (systemParams.evidenceServiceAccountEmail || systemParams.googleServiceAccountEmail || "").trim();
    const privateKey = (systemParams.evidencePrivateKey || systemParams.googlePrivateKey || "");
    const driveFolderId = (systemParams.evidenceGoogleDriveFolderId || systemParams.googleDriveFolderId || "").trim();

    console.log("Starting blob upload:", fileName);
    
    // --- 1. TRY CLIENT-SIDE UPLOAD FIRST ---
    try {
      console.log("Attempting client-side upload...");
      const clientUploadPromise = (async () => {
        const storageRef = ref(storage, `evidence/${Date.now()}_${sanitizeFileName(fileName)}`);
        const snapshot = await uploadBytes(storageRef, blob, blob.type ? { contentType: blob.type } : undefined);
        return await getDownloadURL(snapshot.ref);
      })();

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Client-side upload timeout")), 3000)
      );

      const url = await Promise.race([clientUploadPromise, timeoutPromise]) as string;
      console.log("Client-side upload success:", url);
      return url;
    } catch (clientError: any) {
      console.warn("Client-side upload failed, falling back to server-side:", clientError.message);
      
      // --- 2. TRY SERVER-SIDE FIREBASE UPLOAD ---
      if (serviceAccountEmail && privateKey) {
        try {
          console.log("Attempting server-side Firebase upload...");
          const uploadFile = new File([blob], sanitizeFileName(fileName), { type: blob.type || 'application/octet-stream' });
          const formData = new FormData();
          formData.append('file', uploadFile);
          formData.append('clientEmail', serviceAccountEmail);
          formData.append('privateKey', privateKey);
          formData.append('projectId', firebaseConfig.projectId || '');
          formData.append('storageBucket', firebaseConfig.storageBucket || '');

          const result = await uploadToFirebaseServer(formData);
          if (result.success && result.url) {
            console.log("Server-side upload success:", result.url);
            return result.url;
          }
          
          // --- 3. TRY GOOGLE DRIVE FALLBACK ---
          // Fallback to Drive if server-side upload fails for ANY reason
          if (driveFolderId && !result.success) {
            console.log("Attempting Google Drive fallback upload...");
            const { uploadToGoogleDrive } = await import('@/ai/flows/google-drive-upload');
            const driveFormData = new FormData();
            driveFormData.append('file', uploadFile);
            driveFormData.append('folderId', driveFolderId);
            driveFormData.append('serviceAccountEmail', serviceAccountEmail);
            driveFormData.append('privateKey', privateKey);

            const driveResult = await uploadToGoogleDrive(driveFormData);
            if (driveResult.success && driveResult.url) {
              console.log("Google Drive upload success:", driveResult.url);
              return driveResult.url;
            }
            throw new Error(driveResult.error || result.error || 'Drive upload failed');
          }
          
          throw new Error(result.error || 'Server upload failed');
        } catch (serverError: any) {
          console.error("Server-side/Drive upload failed:", serverError.message);
          throw serverError;
        }
      }
      
      throw clientError;
    }
  };

  const uploadFiles = async (fileList: File[]) => {
    if (fileList.length === 0) return;

    setIsUploading(true);
    try {
      const uploadedItems: string[] = [];
      for (const file of fileList) {
        const url = await uploadBlobToStorage(file, file.name);
        uploadedItems.push(`${file.name}:::${url}`);
      }

      syncItems(prev => [...prev, ...uploadedItems]);
      toast({
        title: 'Da tai tep len thanh cong',
        description: `${fileList.length} tep dinh kem da san sang.`,
      });
    } catch (error: any) {
      console.error('Error uploading evidence files:', error);
      toast({
        variant: 'destructive',
        title: 'Loi tai tep',
        description: error?.message || 'Khong the tai tep len he thong.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const normalizeLink = (rawValue: string) => {
    const trimmed = rawValue.trim();
    if (!trimmed) return null;

    try {
      return new URL(trimmed).toString();
    } catch {
      try {
        return new URL(`https://${trimmed}`).toString();
      } catch {
        return null;
      }
    }
  };

  const handleAddLink = () => {
    const normalized = normalizeLink(pendingLink);
    if (!normalized) {
      toast({
        variant: 'destructive',
        title: 'Lien ket khong hop le',
        description: 'Hay nhap URL day du, vi du https://example.com.',
      });
      return;
    }

    addItem(normalized, normalized.replace(/^https?:\/\//, ''));
    setPendingLink('');
  };

  const startMedia = async (forceSource?: SourceType, forceDeviceId?: string) => {
    stopStream();
    const activeSource = forceSource || sourceType;
    const activeDeviceId = forceDeviceId || selectedDeviceId;

    try {
      let newStream: MediaStream;
      if (activeSource === 'screen') {
        newStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
      } else {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: activeDeviceId ? { exact: activeDeviceId } : undefined,
          },
          audio: mediaMode === 'video',
        });
      }

      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (error) {
      console.error('Error starting media:', error);
      toast({
        variant: 'destructive',
        title: 'Loi thiet bi',
        description: 'Khong the truy cap camera hoac man hinh. Vui long kiem tra quyen trinh duyet.',
      });
    }
  };

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;

        if (sourceType === 'camera' && isFrontCamera) {
          context.translate(canvasRef.current.width, 0);
          context.scale(-1, 1);
        }

        context.drawImage(videoRef.current, 0, 0);
        setIsUploading(true);
        try {
          const blob = await new Promise<Blob | null>((resolve) => canvasRef.current!.toBlob(resolve, 'image/png'));
          if (!blob) throw new Error('Khong tao duoc anh chup.');

          const fileName = `Anh_${Date.now()}.png`;
          const url = await uploadBlobToStorage(blob, fileName);
          addItem(url, fileName);
          toast({ title: 'Da chup va tai anh len he thong' });
        } catch (error: any) {
          console.error('Error capturing photo:', error);
          toast({
            variant: 'destructive',
            title: 'Loi chup anh',
            description: error?.message || 'Khong the luu anh vua chup.',
          });
        } finally {
          setIsUploading(false);
        }
      }
    }
  };

  const startRecording = () => {
    if (!stream) return;
    chunksRef.current = [];
    const options = { mimeType: 'video/webm;codecs=vp9,opus' };
    const mimeType = MediaRecorder.isTypeSupported(options.mimeType) ? options.mimeType : 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType });

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      setIsUploading(true);
      try {
        const fileName = `Video_${Date.now()}.webm`;
        const url = await uploadBlobToStorage(blob, fileName);
        addItem(url, fileName);
        toast({ title: 'Da luu video va tai len he thong' });
      } catch (error: any) {
        console.error('Error uploading recorded video:', error);
        toast({
          variant: 'destructive',
          title: 'Loi luu video',
          description: error?.message || 'Khong the tai video len he thong.',
        });
      } finally {
        setIsUploading(false);
      }
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await uploadFiles(Array.from(e.target.files));
    }
    e.target.value = '';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isImageItem = (name: string, data: string) => {
    const identifier = `${name} ${data}`.toLowerCase();
    return data.startsWith('data:image') || /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(identifier);
  };

  const isVideoItem = (name: string, data: string) => {
    const identifier = `${name} ${data}`.toLowerCase();
    return data.startsWith('data:video') || /\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test(identifier);
  };

  const getFileIcon = (item: string) => {
    const { name, data } = parseItem(item);
    const identifier = `${name} ${data}`.toLowerCase();
    if (isImageItem(name, data)) return <LucideImage className="h-4 w-4 text-blue-500" />;
    if (isVideoItem(name, data)) return <Video className="h-4 w-4 text-purple-500" />;
    if (data.startsWith('data:application/pdf') || /\.(pdf|doc|docx|xls|xlsx|txt)(\?|$)/i.test(identifier)) return <FileText className="h-4 w-4 text-red-500" />;
    if (data.startsWith('http')) return <LinkIcon className="h-4 w-4 text-green-500" />;
    return <FileText className="h-4 w-4 text-gray-500" />;
  };

  const previewMeta = previewItem ? parseItem(previewItem) : null;
  const previewData = previewMeta?.data || '';
  const previewName = previewMeta?.name || '';

  return (
    <div className="space-y-4 border rounded-md p-4 bg-background/50">
      <Tabs defaultValue="camera" className="w-full" onValueChange={() => stopStream()}>
        {!onlyCamera && (
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="camera" className="flex items-center gap-2"><Camera className="h-4 w-4" /> Camera</TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2"><Upload className="h-4 w-4" /> Tập tin</TabsTrigger>
            <TabsTrigger value="url" className="flex items-center gap-2"><LinkIcon className="h-4 w-4" /> URL</TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="camera" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex flex-col gap-2 border rounded-md p-3 bg-muted/20">
                <Label className="text-xs font-bold text-muted-foreground uppercase">Minh chứng bằng hình ảnh hay video?</Label>
                <RadioGroup value={mediaMode} onValueChange={(newValue: MediaMode) => { setMediaMode(newValue); stopStream(); }} className="flex gap-6 mt-1">
                  <div className="flex items-center space-x-2 cursor-pointer group">
                    <RadioGroupItem value="photo" id="r-photo" className="text-blue-600 border-blue-600" />
                    <Label htmlFor="r-photo" className="text-sm font-medium cursor-pointer group-hover:text-blue-600 transition-colors">Hình ảnh</Label>
                  </div>
                  <div className="flex items-center space-x-2 cursor-pointer group">
                    <RadioGroupItem value="video" id="r-video" className="text-blue-600 border-blue-600" />
                    <Label htmlFor="r-video" className="text-sm font-medium cursor-pointer group-hover:text-blue-600 transition-colors">Quay video</Label>
                  </div>
                </RadioGroup>
              </div>
              {!onlyCamera && (
                <div className="flex flex-col gap-2 border rounded-md p-3 bg-muted/20">
                  <Label className="text-xs font-bold text-muted-foreground uppercase">Lấy minh chứng bằng:</Label>
                  <RadioGroup value={sourceType} onValueChange={(newValue: SourceType) => { setSourceType(newValue); if (stream) startMedia(newValue); }} className="flex gap-6 mt-1">
                    <div className="flex items-center space-x-2 cursor-pointer group">
                      <RadioGroupItem value="camera" id="r-camera" className="text-blue-600 border-blue-600" />
                      <Label htmlFor="r-camera" className="flex items-center gap-2 text-sm font-medium cursor-pointer group-hover:text-blue-600 transition-colors"><User className="h-4 w-4" /> Camera</Label>
                    </div>
                    <div className="flex items-center space-x-2 cursor-pointer group">
                      <RadioGroupItem value="screen" id="r-screen" className="text-blue-600 border-blue-600" />
                      <Label htmlFor="r-screen" className="flex items-center gap-2 text-sm font-medium cursor-pointer group-hover:text-blue-600 transition-colors"><Monitor className="h-4 w-4" /> Màn hình</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}
              {!stream ? (
                <Button type="button" className="w-full" onClick={() => startMedia()} disabled={isUploading}><RefreshCw className="mr-2 h-4 w-4" /> Bật thiết bị</Button>
              ) : (
                <div className="flex gap-2">
                  {mediaMode === 'photo' ? (
                    <Button type="button" className="flex-1" onClick={capturePhoto} disabled={isUploading}><Camera className="mr-2 h-4 w-4" /> Chụp ngay</Button>
                  ) : (
                    !isRecording ? (
                      <Button type="button" className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={startRecording} disabled={isUploading}><Circle className="mr-2 h-4 w-4 fill-current animate-pulse" /> Bắt đầu quay</Button>
                    ) : (
                      <Button type="button" className="flex-1" variant="destructive" onClick={stopRecording}><StopCircle className="mr-2 h-4 w-4" /> Dừng quay ({formatTime(recordingTime)})</Button>
                    )
                  )}
                  <Button type="button" variant="outline" size="icon" onClick={stopStream} disabled={isUploading}><X className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
            <div className="relative aspect-video bg-black rounded-md overflow-hidden border shadow-inner">
              <video ref={videoRef} autoPlay muted playsInline className={cn('w-full h-full object-cover', (sourceType === 'camera' && isFrontCamera) && 'scale-x-[-1]')} />
              <canvas ref={canvasRef} className="hidden" />

              {isRecording && <div className="absolute top-2 left-2 flex items-center gap-2 bg-red-600 text-white px-2 py-1 rounded text-[10px] font-bold tracking-wider z-10">REC {formatTime(recordingTime)}</div>}
              {isUploading && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/55">
                  <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-white backdrop-blur-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Đang tải lên</span>
                  </div>
                </div>
              )}

              {sourceType === 'camera' && devices.length > 0 && (
                <div className="absolute top-3 right-3 w-48 z-50">
                  <Select value={selectedDeviceId} onValueChange={(newValue) => { setSelectedDeviceId(newValue); if (stream) startMedia('camera', newValue); }}>
                    <SelectTrigger className="h-10 text-xs bg-black/60 border-white/30 text-white hover:bg-black/80 backdrop-blur-md transition-all shadow-lg">
                      <SelectValue placeholder="Chọn camera" />
                    </SelectTrigger>
                    <SelectContent className="bg-black/95 border-white/20 text-white backdrop-blur-md z-[100]">
                      {devices.map((device, index) => (
                        <SelectItem key={device.deviceId} value={device.deviceId} className="text-xs py-3 focus:bg-white/20 focus:text-white cursor-pointer">
                          {device.label || `Camera ${index + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {!onlyCamera && (
          <TabsContent value="upload" className="space-y-2">
            <div className={cn('border-2 border-dashed rounded-md p-8 text-center transition-colors relative', isUploading ? 'cursor-not-allowed bg-muted/40' : 'hover:bg-muted/50 cursor-pointer')}>
              <input type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed" disabled={isUploading} />
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">{isUploading ? 'Đang tải tệp lên...' : 'Kéo thả tệp hoặc nhấn để chọn'}</p>
            </div>
          </TabsContent>
        )}

        {!onlyCamera && (
          <TabsContent value="url" className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={pendingLink}
                placeholder="Dán liên kết (https://...)"
                onChange={(e) => setPendingLink(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddLink();
                  }
                }}
              />
              <Button type="button" onClick={handleAddLink} disabled={!pendingLink.trim() || isUploading}>
                <Plus className="mr-2 h-4 w-4" /> Thêm
              </Button>
            </div>
          </TabsContent>
        )}
      </Tabs>

      <Separator className="my-4" />

      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Danh sách minh chứng ({items.length})</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {items.map((item, index) => {
            const { name, data } = parseItem(item);
            return (
              <div key={index} className="relative group border rounded-md p-2 bg-muted/30 flex items-center gap-2 overflow-hidden hover:bg-muted/50 transition-colors">
                <div className="shrink-0">{getFileIcon(item)}</div>
                <div className="flex-1 min-w-0">
                  {editingIndex === index ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') updateItemName(index, editingName);
                          if (e.key === 'Escape') setEditingIndex(null);
                        }}
                        autoFocus
                        className="h-6 text-[10px] py-0 px-1"
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => updateItemName(index, editingName)} className="h-5 w-5 text-green-600"><CheckCircle2 className="h-3 w-3" /></Button>
                    </div>
                  ) : (
                    <p
                      className="text-[10px] font-medium truncate cursor-pointer hover:text-primary"
                      onClick={() => { setEditingIndex(index); setEditingName(name || `Tep ${index + 1}`); }}
                    >
                      {name || (data.startsWith('data:') ? `Tep dinh kem ${index + 1}` : data)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="icon" onClick={() => setPreviewItem(item)} className="h-6 w-6 rounded-full"><Eye className="h-3 w-3" /></Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} className="h-6 w-6 rounded-full text-destructive"><X className="h-3 w-3" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={!!previewItem} onOpenChange={() => setPreviewItem(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle>Xem minh chứng</DialogTitle></DialogHeader>
          <div className="flex items-center justify-center p-4 bg-muted/20 rounded-md">
            {isImageItem(previewName, previewData) ? (
              <img src={previewData} alt="Preview" className="max-w-full h-auto rounded-lg shadow-lg" />
            ) : isVideoItem(previewName, previewData) ? (
              <video src={previewData} controls className="max-w-full rounded-lg shadow-lg" />
            ) : (
              <div className="text-center py-10">
                <p className="mb-4">Minh chung khong the xem truc tiep hoac la lien ket ben ngoai.</p>
                <div className="flex justify-center gap-2">
                  <Button asChild variant="outline"><a href={previewData || ''} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" /> Mo lien ket</a></Button>
                  <Button asChild><a href={previewData || ''} download><Download className="mr-2 h-4 w-4" /> Tai ve tep</a></Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
