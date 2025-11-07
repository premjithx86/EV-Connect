import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User } from "lucide-react";

interface ArticleCardProps {
  id: string;
  kind: "NEWS" | "KNOWLEDGE" | "TIP";
  title: string;
  summary: string;
  coverImage?: string;
  author: string;
  publishedAt: string;
  tags?: string[];
}

export function ArticleCard({
  id,
  kind,
  title,
  summary,
  coverImage,
  author,
  publishedAt,
  tags = [],
}: ArticleCardProps) {
  const kindColors = {
    NEWS: "bg-chart-2",
    KNOWLEDGE: "bg-chart-3",
    TIP: "bg-chart-4",
  };

  return (
    <Card className="overflow-hidden hover-elevate transition-shadow cursor-pointer" data-testid={`card-article-${id}`}>
      {coverImage && (
        <div className="relative h-48 overflow-hidden">
          <img
            src={coverImage}
            alt={title}
            className="w-full h-full object-cover"
          />
          <Badge className={`absolute top-3 left-3 ${kindColors[kind]} text-white`}>
            {kind}
          </Badge>
        </div>
      )}

      <div className="p-4">
        {!coverImage && (
          <Badge className={`${kindColors[kind]} text-white mb-3`}>
            {kind}
          </Badge>
        )}

        <h3 className="font-semibold text-lg mb-2 line-clamp-2" data-testid={`text-title-${id}`}>
          {title}
        </h3>

        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {summary}
        </p>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>{author}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{publishedAt}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
