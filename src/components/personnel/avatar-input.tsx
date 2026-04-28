
'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
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
import { Badge } from '@/components/ui/badge';

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

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [sourceType, setSourceType] = useState<SourceType>('camera');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  useEffect(() => {
    const getDevices = async () => {
      try {
        if (activeTab === 'capture' && !disabled && !stream) {
            const initialStream = await navigator.mediaDevices.getUserMedia({ video: true });
            initialStream.getTracks().forEach(t => t.stop());
        }
        
        const devs = await navigator.mediaDevices.enumerateDevices();
        const videoDevs = devs.filter(d => d.kind === 'videoinput');
        setDevices(videoDevs);
        
        if (videoDevs.length > 0 && !selectedDeviceId) {
            const backCam = videoDevs.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear'));
            setSelectedDeviceId(backCam ? backCam.deviceId : videoDevs[0].deviceId);
        }
      } catch (err) {
        console.error('Error listing devices:', err);
      }
    };
    
    getDevices();
    const handleDeviceChange = () => getDevices();
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
  }, [activeTab, disabled, selectedDeviceId, stream]);

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
        newStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      } else {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            deviceId: activeDeviceId ? { exact: activeDeviceId } : undefined 
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
        // Resize for avatar (max 512px)
        const size = 512;
        const video = videoRef.current;
        const ratio = video.videoWidth / video.videoHeight;
        
        if (ratio > 1) {
            canvasRef.current.width = size;
            canvasRef.current.height = size / ratio;
        } else {
            canvasRef.current.width = size * ratio;
            canvasRef.current.height = size;
        }
        
        // Clear and apply mirroring if needed
        context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        if (sourceType === 'camera' && isFrontCamera) {
            context.translate(canvasRef.current.width, 0);
            context.scale(-1, 1);
        }
        
        context.drawImage(video, 0, 0, canvasRef.current.width, canvasRef.current.height);
        
        // Use JPEG with 0.7 quality for significant size reduction
        const compressedDataUrl = canvasRef.current.toDataURL('image/jpeg', 0.7);
        onChange(compressedDataUrl);
        
        toast({ title: 'Đã cập nhật ảnh đại diện' });
        stopStream();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit for input
          toast({ variant: 'destructive', title: 'Tệp quá lớn', description: 'Vui lòng chọn ảnh dưới 2MB.' });
          return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const size = 512;
            const ratio = img.width / img.height;
            
            if (ratio > 1) {
                canvas.width = size;
                canvas.height = size / ratio;
            } else {
                canvas.width = size * ratio;
                canvas.height = size;
            }
            
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                onChange(compressedDataUrl);
                toast({ title: 'Đã tải ảnh lên' });
            }
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className={cn("space-y-4", disabled && "opacity-80 pointer-events-none")}>
      <div className="flex flex-col md:flex-row items-center gap-6 p-4 border rounded-xl bg-muted/10 shadow-sm">
        <div className="relative group shrink-0">
          <Avatar className="h-28 w-28 border-4 border-background shadow-xl ring-2 ring-primary/10">
            {value && value.trim() !== "" ? <AvatarImage src={value} className="object-cover" /> : null}
            <AvatarFallback className="bg-muted text-muted-foreground">
              <User className="h-12 w-12" />
            </AvatarFallback>
          </Avatar>
          {value && value.trim() !== "" && !disabled && (
            <Button 
              variant="destructive" 
              size="icon" 
              className="absolute -top-1 -right-1 h-7 w-7 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onChange('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex-1 space-y-2 text-center md:text-left">
          <h4 className="font-bold text-lg text-primary">{name || 'Hình đại diện'}</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {disabled ? 'Đang ở chế độ xem chi tiết.' : 'Tải lên từ máy tính, sử dụng liên kết hoặc chụp trực tiếp từ camera.'}
          </p>
          {!disabled && (
              <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-1">
                  <Badge variant="outline" className="bg-background/50 text-[10px] uppercase tracking-tighter font-bold">PNG, JPG, WEBP</Badge>
                  <Badge variant="outline" className="bg-background/50 text-[10px] uppercase tracking-tighter font-bold">Max 5MB</Badge>
              </div>
          )}
        </div>
      </div>

      {!disabled && (
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); stopStream(); }} className="w-full">
          <TabsList className="grid w-full grid-cols-3 p-1 h-12 bg-muted/30">
            <TabsTrigger value="url" className="gap-2 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm"><LinkIcon className="h-4 w-4" /> URL</TabsTrigger>
            <TabsTrigger value="upload" className="gap-2 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm"><Upload className="h-4 w-4" /> Tải tệp</TabsTrigger>
            <TabsTrigger value="capture" className="gap-2 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm"><Camera className="h-4 w-4" /> Chụp ảnh</TabsTrigger>
          </TabsList>
          
          <TabsContent value="url" className="pt-4 animate-in fade-in-50 duration-300">
            <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase px-1">Đường dẫn hình ảnh</Label>
                <div className="flex gap-2">
                    <Input 
                        placeholder="https://example.com/image.jpg" 
                        value={value?.startsWith('data:') ? '' : value} 
                        onChange={(e) => onChange(e.target.value)}
                        className="bg-muted/10"
                    />
                    <Button variant="secondary" onClick={() => { if(value) toast({ title: 'Đã nhận URL' }); }}>Kiểm tra</Button>
                </div>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="pt-4 animate-in fade-in-50 duration-300">
            <div className="border-2 border-dashed rounded-xl p-8 text-center hover:bg-muted/20 hover:border-primary/50 transition-all cursor-pointer relative group">
              <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
              <div className="space-y-3">
                <div className="h-12 w-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                    <LucideImage className="h-6 w-6" />
                </div>
                <div>
                    <p className="text-sm font-bold">Kéo thả hoặc nhấp để chọn ảnh</p>
                    <p className="text-xs text-muted-foreground mt-1">Hỗ trợ các định dạng ảnh phổ biến</p>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="capture" className="space-y-4 pt-4 animate-in fade-in-50 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4 flex flex-col justify-center">
                <div className="space-y-3 p-4 border rounded-xl bg-muted/10">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider opacity-70">Nguồn hình ảnh</Label>
                    <div className="flex gap-2">
                      <Button type="button" variant={sourceType === 'camera' ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => { setSourceType('camera'); stopStream(); }}><User className="mr-2 h-4 w-4" /> Camera</Button>
                      <Button type="button" variant={sourceType === 'screen' ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => { setSourceType('screen'); stopStream(); }}><Monitor className="mr-2 h-4 w-4" /> Màn hình</Button>
                    </div>
                  </div>

                  {!stream ? (
                    <Button type="button" className="w-full mt-2 shadow-sm" onClick={() => startMedia()}><RefreshCw className="mr-2 h-4 w-4" /> Bật Camera</Button>
                  ) : (
                    <div className="flex gap-2 mt-2">
                      <Button type="button" onClick={capturePhoto} className="flex-1 font-bold shadow-lg bg-primary hover:bg-primary/90 text-white"><Camera className="mr-2 h-4 w-4" /> Chụp & Lưu</Button>
                      <Button type="button" variant="outline" size="icon" onClick={stopStream} className="hover:bg-destructive hover:text-destructive-foreground transition-colors"><X className="h-4 w-4" /></Button>
                    </div>
                  )}
                </div>
                
                <div className="text-[10px] text-muted-foreground px-1 italic">
                    * Lưu ý: Cho phép trình duyệt truy cập Camera để sử dụng tính năng này.
                </div>
              </div>
              
              <div className="relative aspect-square bg-slate-950 rounded-2xl overflow-hidden border-4 border-background shadow-2xl group">
                <video 
                    ref={videoRef} 
                    autoPlay 
                    muted 
                    playsInline 
                    className={cn(
                        "w-full h-full object-cover transition-opacity duration-500", 
                        !stream ? "opacity-0" : "opacity-100",
                        sourceType === 'camera' && isFrontCamera && "scale-x-[-1]"
                    )} 
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {!stream && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/30 space-y-2">
                        <Camera className="h-12 w-12 animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-tighter">Camera Off</span>
                    </div>
                )}
                
                {stream && sourceType === 'camera' && devices.length > 0 && (
                    <div className="absolute top-4 right-4 w-48 z-20">
                      <Select value={selectedDeviceId} onValueChange={(val) => { setSelectedDeviceId(val); startMedia('camera', val); }}>
                        <SelectTrigger className="h-9 text-[10px] bg-black/60 border-white/20 text-white hover:bg-black/80 backdrop-blur-md transition-all shadow-xl">
                          <SelectValue placeholder="Chọn Camera" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white backdrop-blur-xl">
                          {devices.map(device => (
                            <SelectItem key={device.deviceId} value={device.deviceId} className="text-[10px] py-2 focus:bg-white/10 focus:text-white cursor-pointer">
                              {device.label || `Camera ${devices.indexOf(device) + 1}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
