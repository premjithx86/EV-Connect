import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Image, Video, Smile, Globe } from "lucide-react";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PostComposerProps {
  userAvatar?: string;
  userName: string;
}

export function PostComposer({ userAvatar, userName }: PostComposerProps) {
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState("public");

  const handlePost = () => {
    console.log("Post created:", { content, visibility });
    setContent("");
  };

  return (
    <Card className="p-6" data-testid="card-post-composer">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={userAvatar} />
          <AvatarFallback>{userName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <Textarea
            placeholder="Share your EV experience..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-24 resize-y border-0 focus-visible:ring-0 p-0 text-base"
            data-testid="input-post-content"
          />

          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-add-image">
                <Image className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-add-video">
                <Video className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-add-emoji">
                <Smile className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Select value={visibility} onValueChange={setVisibility}>
                <SelectTrigger className="w-32 h-8" data-testid="select-visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    <div className="flex items-center gap-2">
                      <Globe className="h-3 w-3" />
                      Public
                    </div>
                  </SelectItem>
                  <SelectItem value="community">Community</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={handlePost}
                disabled={!content.trim()}
                data-testid="button-post"
              >
                Post
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
