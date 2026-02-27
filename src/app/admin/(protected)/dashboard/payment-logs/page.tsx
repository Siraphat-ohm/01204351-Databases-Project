import { PaymentLogManagement } from "@/components/PaymentLogMangement";
import { paymentLogService } from "@/services/payment-log.services";
import { redirect } from "next/navigation";
import { getServerSession } from "@/services/auth.services";

export default async function PaymentLogsPage() {
  const session = await getServerSession();
  
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/login');
  }

  // 1. Fetch raw data from the database
  const rawLogs = await paymentLogService.findAll(session);

  // 2. Sanitize and convert MongoDB objects to plain JavaScript objects
  const sanitizedLogs = rawLogs.map((log: any) => {
    // Handle Mongoose documents
    const logData = typeof log.toJSON === 'function' ? log.toJSON() : log;

    return {
      id: logData._id?.toString() || logData.id,
      bookingId: logData.bookingId?.toString(),
      amount: logData.amount,
      currency: logData.currency,
      status: logData.status,
      gateway: logData.gateway,
      // Ensure rawResponse is a plain object, stringify and parse if necessary to strip mongo types
      rawResponse: JSON.parse(JSON.stringify(logData.rawResponse || {})),
      createdAt: logData.createdAt,
      updatedAt: logData.updatedAt,
    };
  });

  return (
    <PaymentLogManagement initialLogs={sanitizedLogs} />
  );
}