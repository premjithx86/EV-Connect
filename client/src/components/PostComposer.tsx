import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Image, Video, Smile, Globe, Loader2, X } from "lucide-react";
import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PostComposerProps {
  userAvatar?: string;
  userName?: string;
  communityId?: string;
  onPostCreated?: () => void;
}

export function PostComposer({ userAvatar, userName, communityId, onPostCreated }: PostComposerProps) {
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState("PUBLIC");
  const [mediaFiles, setMediaFiles] = useState<Array<{ type: string; url: string; file?: File }>>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const emojis = ['😀', '😂', '❤️', '👍', '🎉', '🔥', '⚡', '🚗', '🔋', '🌍', '✨', '💯'];

  const createPostMutation = useMutation({
    mutationFn: async (data: { text: string; visibility: string; communityId?: string; media?: Array<{ type: string; url: string }> }) => {
      const res = await apiRequest("POST", "/api/posts", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      setContent("");
      setMediaFiles([]);
      onPostCreated?.();
      toast({
        title: "Post created successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create post",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const handlePost = () => {
    if (!content.trim()) return;

    const postData: { text: string; visibility: string; communityId?: string; media?: Array<{ type: string; url: string }> } = {
      text: content.trim(),
      visibility: communityId ? "COMMUNITY" : visibility,
      communityId: communityId,
      media: mediaFiles.length > 0 ? mediaFiles.map(({ type, url }) => ({ type, url })) : undefined,
    };

    createPostMutation.mutate(postData);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Limit to 4 media files total
    if (mediaFiles.length >= 4) {
      toast({
        title: "Maximum 4 media files allowed",
        variant: "destructive",
      });
      e.target.value = '';
      return;
    }

    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: "Image too large",
            description: "Please select images smaller than 5MB",
            variant: "destructive",
          });
          return;
        }

        // Compress and resize image
        const img = document.createElement('img') as HTMLImageElement;
        const reader = new FileReader();
        
        reader.onload = (event) => {
          img.src = event.target?.result as string;
        };
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Resize if too large (max 1200px)
          const maxSize = 1200;
          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = (height / width) * maxSize;
              width = maxSize;
            } else {
              width = (width / height) * maxSize;
              height = maxSize;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Convert to JPEG with quality 0.8 to reduce size
          const compressedUrl = canvas.toDataURL('image/jpeg', 0.8);
          
          setMediaFiles((prev) => [
            ...prev.slice(0, 3), // Max 4 files
            { type: 'image', url: compressedUrl, file },
          ]);
        };
        
        reader.readAsDataURL(file);
      }
    });
    e.target.value = '';
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Limit to 4 media files total
    if (mediaFiles.length >= 4) {
      toast({
        title: "Maximum 4 media files allowed",
        variant: "destructive",
      });
      e.target.value = '';
      return;
    }

    // Note: Videos are typically large and base64 encoding makes them even larger
    // For production, you should upload videos to a cloud storage service
    toast({
      title: "Video upload temporarily disabled",
      description: "Please use image uploads only. Video support coming soon!",
      variant: "destructive",
    });
    e.target.value = '';
    
    /* Commented out until proper video upload solution is implemented
    Array.from(files).forEach((file) => {
      if (file.type.startsWith('video/')) {
        // Check file size (max 10MB - still might be too large)
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: "Video too large",
            description: "Please select videos smaller than 10MB",
            variant: "destructive",
          });
          return;
        }
        
        const reader = new FileReader();
        reader.onload = (event) => {
          setMediaFiles((prev) => [
            ...prev.slice(0, 3), // Max 4 files
            { type: 'video', url: event.target?.result as string, file },
          ]);
        };
        reader.readAsDataURL(file);
      }
    });
    */
  };

  const removeMedia = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const insertEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
  };

  return (
    <Card className="p-6" data-testid="card-post-composer">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={userAvatar} />
          <AvatarFallback>{userName?.split(' ').map(n => n[0]).join('') || 'U'}</AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <Textarea
            placeholder="Share your EV experience..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-24 resize-y border-0 focus-visible:ring-0 p-0 text-base"
            data-testid="input-post-content"
          />

          {/* Media Preview */}
          {mediaFiles.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-3">
              {mediaFiles.map((media, index) => (
                <div key={index} className="relative group">
                  {media.type === 'image' ? (
                    <img
                      src={media.url}
                      alt="Upload preview"
                      className="h-24 w-24 object-cover rounded-lg"
                    />
                  ) : (
                    <video
                      src={media.url}
                      className="h-24 w-24 object-cover rounded-lg"
                    />
                  )}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeMedia(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Hidden file inputs */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageUpload}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            multiple
            className="hidden"
            onChange={handleVideoUpload}
          />

          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => imageInputRef.current?.click()}
                data-testid="button-add-image"
                type="button"
              >
                <Image className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => videoInputRef.current?.click()}
                data-testid="button-add-video"
                type="button"
              >
                <Video className="h-4 w-4" />
              </Button>
              <div className="relative group">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  data-testid="button-add-emoji"
                  type="button"
                >
                  <Smile className="h-4 w-4" />
                </Button>
                <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-popover border rounded-lg shadow-lg p-2 z-10">
                  <div className="flex gap-1 flex-wrap max-w-[200px]">
                    {emojis.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => insertEmoji(emoji)}
                        className="text-xl hover:bg-accent rounded p-1 transition-colors"
                        type="button"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Select value={visibility} onValueChange={setVisibility}>
                <SelectTrigger className="w-32 h-8" data-testid="select-visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLIC">
                    <div className="flex items-center gap-2">
                      <Globe className="h-3 w-3" />
                      Public
                    </div>
                  </SelectItem>
                  <SelectItem value="COMMUNITY">Community</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={handlePost}
                disabled={!content.trim() || createPostMutation.isPending}
                data-testid="button-post"
              >
                {createPostMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Posting...
                  </>
                ) : (
                  "Post"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
