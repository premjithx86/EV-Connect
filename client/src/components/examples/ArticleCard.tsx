import { ArticleCard } from "../ArticleCard";
import chargingImage from "@assets/generated_images/Charging_connector_closeup_2fe4a9b5.png";

export default function ArticleCardExample() {
  return (
    <div className="p-6 max-w-sm">
      <ArticleCard
        id="1"
        kind="TIP"
        title="5 Tips to Maximize Your EV Range"
        summary="Learn proven strategies to extend your electric vehicle's range and make the most of every charge."
        coverImage={chargingImage}
        author="EV Connect Team"
        publishedAt="Dec 15, 2024"
        tags={["range", "efficiency", "tips"]}
      />
    </div>
  );
}
