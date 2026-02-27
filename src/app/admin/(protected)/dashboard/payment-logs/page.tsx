import { PaymentLogManagement } from "@/components/PaymentLogMangement"; // Adjust if your file is actually named PaymentLogMangement
import { paymentLogService } from "@/services/payment-log.services";
import { redirect } from "next/navigation";
import { getServerSession } from "@/services/auth.services";

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

  // 1. Build the database query (where clause)
  const where: any = {};

  if (statusFilter) {
    where.status = statusFilter;
  }

  if (search) {
    where.OR = [
      // If bookingId is a string in your DB, this works perfectly. 
      // If it's a strict ObjectId, you might need to filter only by gateway/transaction IDs.
      { bookingId: { contains: search, mode: 'insensitive' } },
      { gateway: { contains: search, mode: 'insensitive' } },
    ];
  }

  // 2. Fetch paginated and filtered data natively from the Database
  const response = await paymentLogService.findAllPaginated(session as any, {
    page,
    limit,
    where
  } as any);

  // 3. Sanitize and convert MongoDB objects to plain JavaScript objects
  const sanitizedLogs = response.data.map((log: any) => {
    // Handle Mongoose documents or Prisma payloads with hidden buffers
    const logData = typeof log.toJSON === 'function' ? log.toJSON() : log;

    return {
      id: logData._id?.toString() || logData.id,
      bookingId: logData.bookingId?.toString(),
      amount: logData.amount,
      currency: logData.currency,
      status: logData.status,
      gateway: logData.gateway,
      // Ensure rawResponse is a plain object, completely stripping Mongo types
      rawResponse: JSON.parse(JSON.stringify(logData.rawResponse || {})),
      // Convert Dates to ISO strings to pass safely to Client Components
      createdAt: logData.createdAt ? new Date(logData.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: logData.updatedAt ? new Date(logData.updatedAt).toISOString() : new Date().toISOString(),
    };
  });

  // 4. Pass the sanitized data & pagination metadata to the Client Component
  return (
    <PaymentLogManagement 
      initialLogs={sanitizedLogs} 
      totalPages={response.meta.totalPages}
      currentPage={page}
    />
  );
}