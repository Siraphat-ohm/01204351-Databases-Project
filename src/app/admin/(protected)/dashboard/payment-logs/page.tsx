import { PaymentLogManagement } from "@/components/PaymentLogMangement"; // Adjust if your file is actually named PaymentLogMangement
import { paymentLogService } from "@/services/payment-log.services";
import { paymentService } from "@/services/payment.services";
import { redirect } from "next/navigation";
import { getServerSession } from "@/services/auth.services";
import type { Prisma } from "@/generated/prisma/client";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function PaymentLogsPage({ searchParams }: PageProps) {
  const session = await getServerSession();
  
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/admin/login');
  }

  const resolvedParams = await searchParams;
  const page = Number(resolvedParams.page) || 1;
  const limit = 15; // Set pagination limit

  // Read URL Parameters for filtering
  const search = typeof resolvedParams.search === 'string' ? resolvedParams.search : '';
  const statusFilter = typeof resolvedParams.status === 'string' ? resolvedParams.status : '';

  const where: Prisma.TransactionWhereInput = {};

  if (statusFilter) {
    const statusMap: Record<string, "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED"> = {
      pending: "PENDING",
      success: "SUCCESS",
      failed: "FAILED",
      refunded: "REFUNDED",
    };
    const mapped = statusMap[statusFilter.toLowerCase()];
    if (mapped) where.status = mapped;
  }

  if (search) {
    where.OR = [
      { id: { contains: search, mode: "insensitive" } },
      { bookingId: { contains: search, mode: "insensitive" } },
      { booking: { bookingRef: { contains: search, mode: "insensitive" } } },
      { paymentMethodType: { contains: search, mode: "insensitive" } },
    ];
  }

  // 1) Read SQL transactions (source of truth)
  const txResponse = await paymentService.findAllPaginated(session as any, {
    page,
    limit,
    where
  } as any);

  // 2) Read Mongo logs and merge by transactionId
  const transactionIds = txResponse.data.map((tx: any) => tx.id);
  const mongoLogs = await paymentLogService.findByTransactionIds(transactionIds, session as any);
  const mongoByTransaction = new Map<string, any>();
  for (const log of mongoLogs as any[]) {
    if (!log?.transactionId) continue;
    if (!mongoByTransaction.has(log.transactionId)) {
      mongoByTransaction.set(log.transactionId, log);
    }
  }

  const sqlToUiStatus: Record<string, "pending" | "success" | "failed" | "refunded"> = {
    PENDING: "pending",
    SUCCESS: "success",
    FAILED: "failed",
    REFUNDED: "refunded",
  };

  const resolveGateway = (tx: any, log: any): "stripe" | "promptpay" | "truemoney" | "other" => {
    if (log?.gateway) return log.gateway;
    const method = String(tx.paymentMethodType ?? "").toLowerCase();
    if (method === "card") return "stripe";
    if (method === "promptpay") return "promptpay";
    if (method === "truemoney") return "truemoney";
    return "other";
  };

  // 3) Build UI rows from SQL + Mongo
  const sanitizedLogs = txResponse.data.map((tx: any) => {
    const logData = mongoByTransaction.get(tx.id);
    const fallbackRaw = {
      paymentMethodType: tx.paymentMethodType ?? null,
      refundReason: tx.refundReason ?? null,
      originalTransactionId: tx.originalTransactionId ?? null,
    };

    return {
      id: tx.id,
      bookingId: tx.bookingId,
      amount: Number(tx.amount),
      currency: tx.currency,
      status: sqlToUiStatus[tx.status] ?? "pending",
      gateway: resolveGateway(tx, logData),
      rawResponse: JSON.parse(JSON.stringify(logData?.rawResponse ?? fallbackRaw)),
      createdAt: tx.createdAt ? new Date(tx.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: tx.updatedAt ? new Date(tx.updatedAt).toISOString() : new Date().toISOString(),
    };
  });

  // 4. Pass merged rows + pagination metadata
  return (
    <PaymentLogManagement 
      initialLogs={sanitizedLogs} 
      totalPages={txResponse.meta.totalPages}
      currentPage={page}
      userRole={session.user.role}
    />
  );
}