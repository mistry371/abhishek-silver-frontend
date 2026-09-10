"use client";

import { useRouter } from "next/navigation";
import { useAdmin } from "@/components/admin/AdminSession";
import { ExpenseForm } from "@/components/admin/expenses/ExpenseForm";
import { PageHeader, PermissionDenied } from "@/components/admin/ui";

export default function NewExpensePage() {
  const router = useRouter();
  const { can } = useAdmin();

  return (
    <>
      <PageHeader
        title="New expense"
        description="Expenses are saved as drafts. Upload the receipt on the next screen, then submit it."
        back={{ href: "/admin/expenses", label: "Expenses" }}
      />
      {can("expenses:create") ? (
        <ExpenseForm onSaved={(expense) => router.push(`/admin/expenses/${expense.id}`)} onCancel={() => router.push("/admin/expenses")} />
      ) : (
        <PermissionDenied message="Your role can't create expenses. Ask a Super Admin for the “Create, edit and submit expenses” permission." />
      )}
    </>
  );
}
