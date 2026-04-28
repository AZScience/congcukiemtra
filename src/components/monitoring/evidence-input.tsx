
'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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

  useEffect(() => {
    const newValue = value ? value.split('|').filter(Boolean) : [];
    if (JSON.stringify(newValue) !== JSON.stringify(items)) {
      setItems(newValue);
    }
  }, [value, items]);

  useEffect(() => {
    const getDevices = async () => {
      try {
        // Request permission once to get labels
        const initialStream = await navigator.mediaDevices.getUserMedia({ video: true });
        initialStream.getTracks().forEach(t => t.stop());
        
        const devs = await navigator.mediaDevices.enumerateDevices();
        const videoDevs = devs.filter(d => d.kind === 'videoinput');
        setDevices(videoDevs);
        
        if (videoDevs.length > 0 && !selectedDeviceId) {
          // Try to find back camera by default for mobile
          const backCam = videoDevs.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear'));
          setSelectedDeviceId(backCam ? backCam.deviceId : videoDevs[0].deviceId);
        }
      } catch (err) {
        console.error('Error listing devices:', err);
      }
    };

    getDevices();
    navigator.mediaDevices.addEventListener('devicechange', getDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', getDevices);
  }, [selectedDeviceId]);

  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const updateParent = (newItems: string[]) => {
    setItems(newItems);
    onChange(newItems.join('|'));
  };

  const addItem = (data: string, name?: string) => {
    const finalName = name || (data.startsWith('data:image') ? `Ảnh_${new Date().getTime()}` : (data.startsWith('data:video') ? `Video_${new Date().getTime()}` : `Tệp_${new Date().getTime()}`));
    const newItem = `${finalName}:::${data}`;
    const newItems = [...items, newItem];
    setItems(newItems);
    onChange(newItems.join('|'));
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    onChange(newItems.join('|'));
  };

  const parseItem = (item: string) => {
    if (item.includes(':::')) {
      const parts = item.split(':::');
      return { name: parts[0], data: parts.slice(1).join(':::') };
    }
    return { name: '', data: item };
  };

  const updateItemName = (index: number, newName: string) => {
    const { data } = parseItem(items[index]);
    const newItems = [...items];
    newItems[index] = `${newName}:::${data}`;
    setItems(newItems);
    onChange(newItems.join('|'));
    setEditingIndex(null);
  };

  const isFrontCamera = useMemo(() => {
    if (!selectedDeviceId || devices.length === 0) return true;
    const device = devices.find(d => d.deviceId === selectedDeviceId);
    if (!device) return true;
    const label = device.label.toLowerCase();
    return label.includes('front') || label.includes('user') || label.includes('facing');
  }, [selectedDeviceId, devices]);

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
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
          audio: true
        });
      } else {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            deviceId: activeDeviceId ? { exact: activeDeviceId } : undefined 
          },
          audio: mediaMode === 'video'
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
        title: 'Lỗi thiết bị',
        description: 'Không thể truy cập Camera hoặc Màn hình. Vui lòng kiểm tra quyền truy cập hoặc kết nối thiết bị.',
      });
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        
        // Match mirroring of video preview
        if (sourceType === 'camera' && isFrontCamera) {
          context.translate(canvasRef.current.width, 0);
          context.scale(-1, 1);
        }
        
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/png');
        addItem(dataUrl);
        toast({ title: 'Đã chụp ảnh' });
      }
    }
  };

  const startRecording = () => {
    if (!stream) return;
    chunksRef.current = [];
    const options = { mimeType: 'video/webm;codecs=vp9,opus' };
    const mimeType = MediaRecorder.isTypeSupported(options.mimeType) ? options.mimeType : 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType });
    
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const reader = new FileReader();
      reader.onloadend = () => addItem(reader.result as string);
      reader.readAsDataURL(blob);
      toast({ title: 'Đã lưu video quay được' });
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => addItem(reader.result as string, file.name);
        reader.readAsDataURL(file);
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getFileIcon = (item: string) => {
    const { data } = parseItem(item);
    if (data.startsWith('data:image')) return <LucideImage className="h-4 w-4 text-blue-500" />;
    if (data.startsWith('data:video')) return <Video className="h-4 w-4 text-purple-500" />;
    if (data.startsWith('data:application/pdf') || data.toLowerCase().endsWith('.pdf')) return <FileText className="h-4 w-4 text-red-500" />;
    if (data.startsWith('http')) return <LinkIcon className="h-4 w-4 text-green-500" />;
    return <FileText className="h-4 w-4 text-gray-500" />;
  };

  return (
    <div className="space-y-4 border rounded-md p-4 bg-background/50">
      <Tabs defaultValue="camera" className="w-full" onValueChange={() => stopStream()}>
        {!onlyCamera && (
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="camera" className="flex items-center gap-2"><Camera className="h-4 w-4" /> Camera</TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2"><Upload className="h-4 w-4" /> Tệp tin</TabsTrigger>
            <TabsTrigger value="url" className="flex items-center gap-2"><LinkIcon className="h-4 w-4" /> URL</TabsTrigger>
          </TabsList>
        )}
        
        <TabsContent value="camera" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex flex-col gap-2 border rounded-md p-3 bg-muted/20">
                <Label className="text-xs font-bold text-muted-foreground uppercase">Minh chứng bằng hình ảnh hay video?</Label>
                <RadioGroup value={mediaMode} onValueChange={(v: any) => { setMediaMode(v); stopStream(); }} className="flex gap-6 mt-1">
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
                  <RadioGroup value={sourceType} onValueChange={(v: any) => { setSourceType(v); if(stream) startMedia(v); }} className="flex gap-6 mt-1">
                    <div className="flex items-center space-x-2 cursor-pointer group">
                      <RadioGroupItem value="camera" id="r-camera" className="text-blue-600 border-blue-600" />
                      <Label htmlFor="r-camera" className="flex items-center gap-2 text-sm font-medium cursor-pointer group-hover:text-blue-600 transition-colors"><User className="h-4 w-4" /> Camera</Label>
                    </div>
                    <div className="flex items-center space-x-2 cursor-pointer group">
                      <RadioGroupItem value="screen" id="r-screen" className="text-blue-600 border-blue-600" />
                      <Label htmlFor="r-screen" className="flex items-center gap-2 text-sm font-medium cursor-pointer group-hover:text-blue-600 transition-colors"><Monitor className="h-4 w-4" /> Màn hình</Label>
                    </div>
                  </RadioGroup>
                  
                  {/* Device selection moved to video overlay */}
                </div>
              )}
              {!stream ? (
                <Button type="button" className="w-full" onClick={() => startMedia()}><RefreshCw className="mr-2 h-4 w-4" /> Bật thiết bị</Button>
              ) : (
                <div className="flex gap-2">
                  {mediaMode === 'photo' ? (
                    <Button type="button" className="flex-1" onClick={capturePhoto}><Camera className="mr-2 h-4 w-4" /> Chụp ngay</Button>
                  ) : (
                    !isRecording ? (
                      <Button type="button" className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={startRecording}><Circle className="mr-2 h-4 w-4 fill-current animate-pulse" /> Bắt đầu quay</Button>
                    ) : (
                      <Button type="button" className="flex-1" variant="destructive" onClick={stopRecording}><StopCircle className="mr-2 h-4 w-4" /> Dừng quay ({formatTime(recordingTime)})</Button>
                    )
                  )}
                  <Button type="button" variant="outline" size="icon" onClick={stopStream}><X className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
            <div className="relative aspect-video bg-black rounded-md overflow-hidden border shadow-inner">
              <video ref={videoRef} autoPlay muted playsInline className={cn("w-full h-full object-cover", (sourceType === 'camera' && isFrontCamera) && "scale-x-[-1]")} />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Overlays */}
              {isRecording && <div className="absolute top-2 left-2 flex items-center gap-2 bg-red-600 text-white px-2 py-1 rounded text-[10px] font-bold tracking-wider z-10">REC {formatTime(recordingTime)}</div>}
              
              {sourceType === 'camera' && devices.length > 0 && (
                <div className="absolute top-3 right-3 w-48 z-50">
                  <Select value={selectedDeviceId} onValueChange={(val) => { setSelectedDeviceId(val); if(stream) startMedia('camera', val); }}>
                    <SelectTrigger className="h-10 text-xs bg-black/60 border-white/30 text-white hover:bg-black/80 backdrop-blur-md transition-all shadow-lg">
                      <SelectValue placeholder="Chọn Camera" />
                    </SelectTrigger>
                    <SelectContent className="bg-black/95 border-white/20 text-white backdrop-blur-md z-[100]">
                      {devices.map(device => (
                        <SelectItem key={device.deviceId} value={device.deviceId} className="text-xs py-3 focus:bg-white/20 focus:text-white cursor-pointer">
                          {device.label || `Camera ${devices.indexOf(device) + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {stream && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                   {/* Capture button could also go here for better UX, but keeping user structure for now */}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {!onlyCamera && (
          <TabsContent value="upload" className="space-y-2">
            <div className="border-2 border-dashed rounded-md p-8 text-center hover:bg-muted/50 transition-colors cursor-pointer relative">
              <input type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Kéo thả tệp hoặc nhấn để chọn</p>
            </div>
          </TabsContent>
        )}
        
        {!onlyCamera && (
          <TabsContent value="url" className="space-y-2">
            <div className="flex gap-2">
              <Input placeholder="Dán liên kết (https://...) và nhấn Enter" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(e.currentTarget.value); e.currentTarget.value = ''; } }} />
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
                      onClick={() => { setEditingIndex(index); setEditingName(name || `Tệp ${index + 1}`); }}
                    >
                      {name || (data.startsWith('data:') ? `Tệp đính kèm ${index + 1}` : data)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="icon" onClick={() => setPreviewItem(data)} className="h-6 w-6 rounded-full"><Eye className="h-3 w-3" /></Button>
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
            {previewItem?.startsWith('data:image') ? (
              <img src={previewItem} alt="Preview" className="max-w-full h-auto rounded-lg shadow-lg" />
            ) : previewItem?.startsWith('data:video') ? (
              <video src={previewItem} controls className="max-w-full rounded-lg shadow-lg" />
            ) : (
              <div className="text-center py-10">
                <p className="mb-4">Minh chứng không thể xem trực tiếp hoặc là liên kết bên ngoài.</p>
                <div className="flex justify-center gap-2">
                    <Button asChild variant="outline"><a href={previewItem || ''} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4"/> Mở liên kết</a></Button>
                    <Button asChild><a href={previewItem || ''} download><Download className="mr-2 h-4 w-4"/> Tải về tệp</a></Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
