import { TopNav } from "../TopNav";
import avatarMan from "@assets/generated_images/User_avatar_man_9666579e.png";

export default function TopNavExample() {
  return (
    <TopNav
      userAvatar={avatarMan}
      userName="Alex Rivera"
      notificationCount={3}
    />
  );
}
