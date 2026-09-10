"use client";

import { FormSection, SelectInput, TextArea, TextInput } from "@/components/admin/fields";
import { ContentDocumentPage } from "@/components/admin/content/DocumentEditor";
import { newId, OrderActiveFields, renumber } from "@/components/admin/content/fields";
import { ListEditor } from "@/components/admin/content/ListEditor";
import type { TrustDoc, TrustItem } from "@/components/admin/content/types";
import { StatusBadge } from "@/components/admin/ui";
import { AwardIcon, GemIcon, MessageIcon, PenIcon, ScaleIcon, ShieldIcon, SparkleIcon, TruckIcon } from "@/components/icons";

const icons: Record<TrustItem["icon"], { label: string; Icon: typeof ShieldIcon }> = {
  shield: { label: "Shield (security)", Icon: ShieldIcon },
  gem: { label: "Gem", Icon: GemIcon },
  sparkle: { label: "Sparkle", Icon: SparkleIcon },
  message: { label: "Message (support)", Icon: MessageIcon },
  truck: { label: "Truck (delivery)", Icon: TruckIcon },
  award: { label: "Award", Icon: AwardIcon },
  scale: { label: "Scale (pricing)", Icon: ScaleIcon },
  pen: { label: "Pen (custom design)", Icon: PenIcon },
};

export default function TrustContentPage() {
  return (
    <ContentDocumentPage<TrustDoc>
      path="/content/trust"
      title="Trust highlights"
      description="The short reassurance strip (pricing, payments, service) shown on the homepage and product pages."
      emptyValue={() => ({ items: [] })}
      meta={(value) => value && <StatusBadge status="active" label={`${value.items.filter((item) => item.active).length} active`} tone="accent" />}
    >
      {({ value, set, errors }) => (
        <FormSection title="Highlights" description="Up to 12. Only promise what the business really offers.">
          <ListEditor<TrustItem>
            items={value.items}
            max={12}
            layout="grid"
            addLabel="Add highlight"
            error={errors.items}
            emptyText="No highlights added."
            onChange={(items, change) => set("items", change === "move" || change === "add" ? renumber(items) : items)}
            createItem={() => ({ id: newId("trust"), icon: "sparkle", title: "", description: "", displayOrder: value.items.length + 1, active: true })}
            itemTitle={(item) => {
              const { Icon } = icons[item.icon];
              return (
                <span className="inline-flex items-center gap-2">
                  <Icon size={15} className="text-champagne-deep" />
                  {item.title || <span className="text-muted">Untitled</span>}
                  {!item.active && <StatusBadge status="inactive" />}
                </span>
              );
            }}
            renderItem={(item, index, update) => (
              <div className="grid gap-3 sm:grid-cols-2">
                <SelectInput
                  label="Icon"
                  value={item.icon}
                  error={errors[`items.${index}.icon`]}
                  options={Object.entries(icons).map(([icon, { label }]) => ({ value: icon, label }))}
                  onChange={(event) => update({ ...item, icon: event.target.value as TrustItem["icon"] })}
                />
                <TextInput label="Title" required maxLength={80} value={item.title} error={errors[`items.${index}.title`]} onChange={(event) => update({ ...item, title: event.target.value })} />
                <TextArea label="Description" rows={2} maxLength={240} containerClassName="sm:col-span-2" value={item.description} error={errors[`items.${index}.description`]} onChange={(event) => update({ ...item, description: event.target.value })} />
                <OrderActiveFields
                  displayOrder={item.displayOrder}
                  active={item.active}
                  errors={{ displayOrder: errors[`items.${index}.displayOrder`] ?? "" }}
                  onChange={(patch) => update({ ...item, ...patch })}
                />
              </div>
            )}
          />
        </FormSection>
      )}
    </ContentDocumentPage>
  );
}
