import { notFound } from "next/navigation";
import { SectionRoutePage } from "@/components/section-browse";
import { isSectionVisible } from "@/lib/features";
import { isSectionId } from "@/lib/section";
import { parseBranch, resolveBranch } from "@/lib/section-tree";

type Props = { params: Promise<{ id: string; branch: string[] }> };

export default async function SectionBranchPage({ params }: Props) {
  const { id, branch } = await params;
  if (isSectionId(id) && isSectionVisible(id) && !resolveBranch(id, parseBranch(branch))) {
    notFound();
  }
  return <SectionRoutePage />;
}
