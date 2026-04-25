
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Camera, 
  Video, 
  Link as LinkIcon, 
  X, 
  Upload, 
  Image as LucideImage, 
  Monitor, 
  User, 
  Circle, 
  StopCircle, 
  RefreshCw,
  Settings2
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
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface AvatarInputProps {
  value: string;
  onChange: (value: string) => void;
  name?: string;
  disabled?: boolean;
}

type SourceType = 'camera' | 'screen';

export function AvatarInput({ value, onChange, name, disabled }: AvatarInputProps) {
  const [activeTab, setActiveTab] = useState('url');
  const { toast } = useToast();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [sourceType, setSourceType] = useState<SourceType>('camera');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('default');

  useEffect(() => {
    const getDevices = async () => {
      try {
        const devs = await navigator.mediaDevices.enumerateDevices();
        const videoDevs = devs.filter(d => d.kind === 'videoinput');
        setDevices(videoDevs);
      } catch (err) {
        console.error('Error listing devices:', err);
      }
    };
    if (activeTab === 'capture' && !disabled) {
      getDevices();
    }
  }, [activeTab, disabled]);

  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const startMedia = async (forceSource?: SourceType) => {
    stopStream();
    const activeSource = forceSource || sourceType;
    
    try {
      let newStream: MediaStream;
      if (activeSource === 'screen') {
        newStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      } else {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            deviceId: selectedDeviceId !== 'default' ? { exact: selectedDeviceId } : undefined 
          }
        });
      }
      setStream(newStream);
      if (videoRef.current) videoRef.current.srcObject = newStream;
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Lỗi thiết bị',
        description: 'Không thể truy cập thiết bị. Vui lòng kiểm tra quyền truy cập.',
      });
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        onChange(canvasRef.current.toDataURL('image/png'));
        toast({ title: 'Đã chụp ảnh đại diện' });
        stopStream();
      }
    }
  };

  const startRecording = () => {
    if (!stream) return;
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const reader = new FileReader();
      reader.onloadend = () => onChange(reader.result as string);
      reader.readAsDataURL(blob);
      toast({ title: 'Đã lưu video đại diện' });
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      stopStream();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => onChange(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  return (
    <div className={cn("space-y-4", disabled && "opacity-80 pointer-events-none")}>
      <div className="flex items-center gap-6 p-4 border rounded-xl bg-muted/10">
        <div className="relative group">
          <Avatar className="h-24 w-24 border-2 border-primary/20 shadow-md">
            {value && value.trim() !== "" ? <AvatarImage src={value} className="object-cover" /> : null}
            <AvatarFallback className="bg-primary/5 text-primary">
              <User className="h-10 w-10" />
            </AvatarFallback>
          </Avatar>
          {value && value.trim() !== "" && !disabled && (
            <Button 
              variant="destructive" 
              size="icon" 
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onChange('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <div className="flex-1 space-y-1">
          <h4 className="font-bold text-sm">{name || 'Hình đại diện'}</h4>
          <p className="text-xs text-muted-foreground">
            {disabled ? 'Đang ở chế độ xem chi tiết.' : 'Chọn tab bên dưới để cập nhật hình ảnh.'}
          </p>
        </div>
      </div>

      {!disabled && (
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); stopStream(); }} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="url" className="gap-2"><LinkIcon className="h-4 w-4" /> URL</TabsTrigger>
            <TabsTrigger value="upload" className="gap-2"><Upload className="h-4 w-4" /> Tệp tin</TabsTrigger>
            <TabsTrigger value="capture" className="gap-2"><Camera className="h-4 w-4" /> Chụp/Quay</TabsTrigger>
          </TabsList>
          
          <TabsContent value="url" className="pt-2">
            <Input 
              placeholder="Dán liên kết hình ảnh vào đây..." 
              value={value?.startsWith('data:') ? '' : value} 
              onChange={(e) => onChange(e.target.value)}
            />
          </TabsContent>

          <TabsContent value="upload" className="pt-2">
            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer relative">
              <input type="file" accept="image/*,video/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
              <LucideImage className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-xs font-medium text-muted-foreground">Kéo thả hoặc nhấp để tải ảnh/video</p>
            </div>
          </TabsContent>
          
          <TabsContent value="capture" className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Nguồn dữ liệu</Label>
                  <div className="flex gap-2">
                    <Button type="button" variant={sourceType === 'camera' ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => { setSourceType('camera'); stopStream(); }}><User className="mr-2 h-4 w-4" /> Camera</Button>
                    <Button type="button" variant={sourceType === 'screen' ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => { setSourceType('screen'); stopStream(); }}><Monitor className="mr-2 h-4 w-4" /> Màn hình</Button>
                  </div>
                </div>

                {sourceType === 'camera' && devices.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Chọn thiết bị</Label>
                    <Select value={selectedDeviceId} onValueChange={(v) => { setSelectedDeviceId(v); stopStream(); }}>
                      <SelectTrigger className="h-8 text-xs">
                        <Settings2 className="mr-2 h-3 w-3" />
                        <SelectValue placeholder="Chọn camera..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Mặc định hệ thống</SelectItem>
                        {devices.map(d => <SelectItem key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0,5)}`}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {!stream ? (
                  <Button type="button" className="w-full bg-primary/10 text-primary hover:bg-primary/20" onClick={() => startMedia()}><RefreshCw className="mr-2 h-4 w-4" /> Bật thiết bị</Button>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" onClick={capturePhoto} className="font-bold"><Camera className="mr-2 h-4 w-4" /> Chụp ảnh</Button>
                    {!isRecording ? (
                      <Button type="button" onClick={startRecording} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50"><Circle className="mr-2 h-4 w-4 fill-current animate-pulse" /> Quay phim</Button>
                    ) : (
                      <Button type="button" onClick={stopRecording} variant="destructive"><StopCircle className="mr-2 h-4 w-4" /> Dừng ({formatTime(recordingTime)})</Button>
                    )}
                  </div>
                )}
              </div>
              
              <div className="relative aspect-square bg-black rounded-lg overflow-hidden border shadow-inner">
                <video ref={videoRef} autoPlay muted playsInline className={cn("w-full h-full object-cover", sourceType === 'camera' && "scale-x-[-1]")} />
                <canvas ref={canvasRef} className="hidden" />
                {isRecording && <div className="absolute top-2 left-2 flex items-center gap-2 bg-red-600 text-white px-2 py-1 rounded-full text-[10px] font-bold">REC {formatTime(recordingTime)}</div>}
                {!stream && <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/50 text-xs italic">Thiết bị đang tắt</div>}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
