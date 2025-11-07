import { UserProfileCard } from "../UserProfileCard";
import avatarWoman from "@assets/generated_images/User_avatar_woman_bdd37206.png";

export default function UserProfileCardExample() {
  return (
    <div className="p-6 max-w-2xl">
      <UserProfileCard
        avatar={avatarWoman}
        name="Sarah Chen"
        bio="EV enthusiast and sustainability advocate. Love sharing my experiences with the Tesla community!"
        location="San Francisco, CA"
        vehicle={{
          brand: "Tesla",
          model: "Model 3",
          year: 2023,
        }}
        stats={{
          posts: 142,
          communities: 8,
        }}
        isOwnProfile={true}
      />
    </div>
  );
}
