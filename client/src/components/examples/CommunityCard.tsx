import { CommunityCard } from "../CommunityCard";
import communityImage from "@assets/generated_images/EV_community_meetup_1339d9c4.png";

export default function CommunityCardExample() {
  return (
    <div className="p-6 max-w-2xl">
      <CommunityCard
        id="1"
        name="Tesla Owners"
        type="BRAND"
        coverImage={communityImage}
        description="A community for Tesla owners to share experiences, tips, and stay updated on the latest features and software updates."
        memberCount={15420}
      />
    </div>
  );
}
