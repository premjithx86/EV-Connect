import { PostCard } from "../PostCard";
import avatarWoman from "@assets/generated_images/User_avatar_woman_bdd37206.png";
import teslaImage from "@assets/generated_images/Tesla_Model_3_post_19f1f84d.png";

export default function PostCardExample() {
  return (
    <div className="p-6 max-w-2xl">
      <PostCard
        id="1"
        author={{
          name: "Sarah Chen",
          avatar: avatarWoman,
        }}
        timestamp="2h ago"
        community="Tesla Owners"
        text="Just completed my first long road trip with the Model 3! The Supercharger network made it incredibly easy. Averaged 250 Wh/mi on the highway. Can't believe I was worried about range anxiety! 🚗⚡"
        media={[teslaImage]}
        likes={42}
        comments={8}
      />
    </div>
  );
}
