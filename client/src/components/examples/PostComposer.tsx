import { PostComposer } from "../PostComposer";
import avatarMan from "@assets/generated_images/User_avatar_man_9666579e.png";

export default function PostComposerExample() {
  return (
    <div className="p-6 max-w-2xl">
      <PostComposer
        userAvatar={avatarMan}
        userName="Alex Rivera"
      />
    </div>
  );
}
