import { CheckIcon } from "@/components/icons";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import type { Order, OrderStatus, PaymentStatus } from "@/types/customer";

export const orderLifecycle: OrderStatus[] = ["new", "confirmed", "processing", "packed", "shipped", "delivered", "completed"];

export const orderStatusLabels: Record<OrderStatus, string> = {
  new: "Order placed",
  confirmed: "Confirmed",
  processing: "Processing",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
  returned: "Returned",
  refunded: "Refunded",
};

const exceptional: OrderStatus[] = ["cancelled", "returned", "refunded"];

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const tone = exceptional.includes(status)
    ? "border-danger/30 text-danger"
    : status === "delivered" || status === "completed"
      ? "border-success/30 text-success"
      : "border-champagne/50 text-champagne-deep";
  return (
    <span className={cn("inline-flex items-center gap-2 border px-2.5 py-1 text-[0.625rem] font-medium uppercase tracking-[0.16em]", tone)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {orderStatusLabels[status]}
    </span>
  );
}

const paymentLabels: Record<PaymentStatus, { label: string; tone: string }> = {
  paid: { label: "Payment confirmed", tone: "text-success" },
  authorized: { label: "Payment authorised", tone: "text-warning" },
  pending: { label: "Payment pending", tone: "text-warning" },
  failed: { label: "Payment failed", tone: "text-danger" },
  refunded: { label: "Refunded", tone: "text-muted" },
};

export function PaymentStatusLabel({ status, className }: { status: PaymentStatus; className?: string }) {
  const config = paymentLabels[status];
  return (
    <span className={cn("inline-flex items-center gap-2 type-body-sm font-medium", config.tone, className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {config.label}
    </span>
  );
}

/**
 * Order tracking timeline. Vertical on mobile, horizontal from md.
 * Each step communicates completed / current / upcoming.
 */
export function OrderTimeline({ order, className }: { order: Order; className?: string }) {
  const reached = new Map(order.timeline.map((event) => [event.status, event.at]));
  const isExceptional = exceptional.includes(order.status);
  const lastLifecycleIndex = Math.max(...orderLifecycle.map((status, index) => (reached.has(status) ? index : -1)));
  const currentIndex = isExceptional ? lastLifecycleIndex : orderLifecycle.indexOf(order.status);

  const steps = orderLifecycle.map((status, index) => ({
    status,
    label: orderStatusLabels[status],
    at: reached.get(status),
    state: index < currentIndex || (isExceptional && index <= currentIndex) ? "complete" : index === currentIndex ? "current" : "upcoming",
  }));

  if (isExceptional) {
    steps.push({ status: order.status, label: orderStatusLabels[order.status], at: reached.get(order.status), state: "exception" });
  }

  return (
    <ol className={cn("flex flex-col md:flex-row", className)} aria-label="Order progress">
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        const complete = step.state === "complete";
        const current = step.state === "current";
        const exception = step.state === "exception";
        return (
          <li
            key={step.status}
            aria-current={current ? "step" : undefined}
            className="relative flex gap-4 pb-8 last:pb-0 md:flex-1 md:flex-col md:items-center md:gap-3 md:pb-0 md:text-center"
          >
            {!last && (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute left-[11px] top-7 h-[calc(100%-1.75rem)] w-px md:left-[calc(50%+18px)] md:top-3 md:h-px md:w-[calc(100%-36px)]",
                  complete ? "bg-ink" : "bg-line",
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                complete && "border-ink bg-ink text-ivory",
                current && "border-ink bg-porcelain ring-4 ring-champagne-mist",
                step.state === "upcoming" && "border-line-strong bg-porcelain",
                exception && "border-danger bg-danger text-ivory",
              )}
            >
              {complete && <CheckIcon size={12} strokeWidth={2.2} />}
              {current && <span className="h-2 w-2 rounded-full bg-ink" />}
              {exception && <span className="h-0.5 w-2.5 bg-ivory" />}
            </span>
            <span className="flex flex-col">
              <span className={cn("type-body-sm", step.state === "upcoming" ? "text-subtle" : "font-medium text-ink", exception && "text-danger")}>
                {step.label}
                <span className="sr-only">{complete ? " — completed" : current ? " — current status" : exception ? "" : " — upcoming"}</span>
              </span>
              {step.at && (
                <time dateTime={step.at} className="text-[0.75rem] text-muted">
                  <span className="md:hidden">{formatDateTime(step.at)}</span>
                  <span className="hidden md:inline">{formatDate(step.at)}</span>
                </time>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
