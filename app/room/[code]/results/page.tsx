import ResultsClient from "@/components/game/ResultsClient";

interface Props {
  params: Promise<{ code: string }>;
}

export default async function ResultsPage({ params }: Props) {
  const { code } = await params;
  return <ResultsClient code={code} />;
}
