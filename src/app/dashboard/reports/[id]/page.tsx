import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getReportPayload } from "@/lib/reports/queries";
import { ReportView } from "@/components/ReportView";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await auth();
  const report = await getReportPayload(userId!, id);
  if (!report) notFound();

  return <ReportView report={report} />;
}
