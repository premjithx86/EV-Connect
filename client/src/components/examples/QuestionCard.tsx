import { QuestionCard } from "../QuestionCard";

export default function QuestionCardExample() {
  return (
    <div className="p-6 max-w-2xl">
      <QuestionCard
        id="1"
        title="Best practices for battery health in cold weather?"
        body="I live in Minnesota and winter is approaching. What are the best practices to maintain battery health during freezing temperatures? Should I precondition before every drive?"
        tags={["battery", "winter", "maintenance"]}
        author="Mike Johnson"
        timestamp="3h ago"
        upvotes={24}
        answers={7}
        isSolved={true}
      />
    </div>
  );
}
