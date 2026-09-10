"use client";

import { useState, type ReactNode } from "react";
import { useAdmin } from "@/components/admin/AdminSession";
import { CheckboxInput, controlClass, FormSection, NumberInput, SelectInput, TextArea, TextInput, toNumberOrNull } from "@/components/admin/fields";
import { SaveIcon, TrashIcon } from "@/components/admin/icons";
import { AdminButton, InlineAlert } from "@/components/admin/ui";
import { PlusIcon } from "@/components/icons";
import { toast } from "@/components/ui/Toast";
import { adminApi } from "@/lib/admin/client";
import { useAdminResource, useMutation } from "@/lib/admin/hooks";
import { formErrorMessage } from "./errors";
import type { AllSettings, BillingSettings, CommerceSettings, ExpenseSettings, GeneralSettings, InventorySettings, SettingKey, StockLocation } from "./types";

interface FormProps<T> {
  value: T;
  canManage: boolean;
  onSaved: (value: T) => void;
}

function useSaveSetting<K extends SettingKey>(key: K, onSaved: (value: AllSettings[K]) => void) {
  const mutation = useMutation((value: AllSettings[K]) => adminApi.put<AllSettings[K]>(`/settings/${key}`, value));
  async function save(value: AllSettings[K]) {
    const saved = await mutation.run(value);
    if (saved) {
      toast({ title: "Settings saved", tone: "success" });
      onSaved(saved);
    }
  }
  return { save, pending: mutation.pending, error: mutation.error, fieldErrors: mutation.fieldErrors };
}

function SettingsForm({
  title,
  description,
  canManage,
  pending,
  message,
  onSubmit,
  children,
}: {
  title: string;
  description: ReactNode;
  canManage: boolean;
  pending: boolean;
  message: string | null;
  onSubmit: () => void;
  children: ReactNode;
}) {
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (canManage) onSubmit();
      }}
    >
      <FormSection title={title} description={description}>
        <fieldset disabled={!canManage || pending} className="contents">
          {children}
        </fieldset>
      </FormSection>
      {message && <InlineAlert>{message}</InlineAlert>}
      {canManage && (
        <div className="flex justify-end">
          <AdminButton type="submit" variant="primary" loading={pending}>
            <SaveIcon size={15} />
            Save changes
          </AdminButton>
        </div>
      )}
    </form>
  );
}

const fullWidth = "sm:col-span-2";

/* ------------------------------------------------------------------ */
/* General                                                             */
/* ------------------------------------------------------------------ */

export function GeneralSettingsForm({ value, canManage, onSaved }: FormProps<GeneralSettings>) {
  const [form, setForm] = useState(value);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const { save, pending, error, fieldErrors } = useSaveSetting("general", onSaved);
  const errors: Record<string, string> = { ...fieldErrors, ...clientErrors };
  const set = (patch: Partial<GeneralSettings>) => setForm((current) => ({ ...current, ...patch }));

  function submit() {
    const next: Record<string, string> = {};
    if (!form.businessName.trim()) next.businessName = "Enter the business name.";
    if (form.gstin.trim() && form.gstin.trim().length !== 15) next.gstin = "A GSTIN has 15 characters.";
    if (form.stateCode.trim() && !/^\d{2}$/.test(form.stateCode.trim())) next.stateCode = "Use the 2-digit GST state code.";
    if (form.supportEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.supportEmail.trim())) next.supportEmail = "Enter a valid email address.";
    setClientErrors(next);
    if (Object.keys(next).length) return;
    void save({ ...form, gstin: form.gstin.trim().toUpperCase(), timezone: "Asia/Kolkata" });
  }

  return (
    <SettingsForm
      title="Business details"
      description="Who the business is. These details appear on invoices and customer communication."
      canManage={canManage}
      pending={pending}
      message={formErrorMessage(error, ["businessName", "legalName", "gstin", "stateCode", "invoiceAddress", "supportEmail"])}
      onSubmit={submit}
    >
      <TextInput label="Business name" required maxLength={120} value={form.businessName} onChange={(e) => set({ businessName: e.target.value })} error={errors.businessName} hint="The trading name shown across the website and admin." />
      <TextInput label="Legal name" maxLength={160} value={form.legalName} onChange={(e) => set({ legalName: e.target.value })} error={errors.legalName} hint="Registered business name printed on invoices." />
      <TextInput label="GSTIN" maxLength={15} value={form.gstin} onChange={(e) => set({ gstin: e.target.value.toUpperCase() })} error={errors.gstin} hint="15-character GST number printed on invoices." className="uppercase" />
      <TextInput label="GST state code" maxLength={2} inputMode="numeric" value={form.stateCode} onChange={(e) => set({ stateCode: e.target.value })} error={errors.stateCode} hint="2-digit code of the store’s state (Gujarat is 24)." />
      <TextArea label="Invoice address" rows={3} maxLength={400} value={form.invoiceAddress} onChange={(e) => set({ invoiceAddress: e.target.value })} error={errors.invoiceAddress} hint="Store address printed on invoices." containerClassName={fullWidth} />
      <TextInput label="Support email" type="email" maxLength={160} value={form.supportEmail} onChange={(e) => set({ supportEmail: e.target.value })} error={errors.supportEmail} hint="Where customers can write to the business." />
      <TextInput label="Time zone" value="Asia/Kolkata (IST)" disabled readOnly hint="Fixed. All dates, reports and invoices use Indian Standard Time." />
    </SettingsForm>
  );
}

/* ------------------------------------------------------------------ */
/* Commerce                                                            */
/* ------------------------------------------------------------------ */

export function CommerceSettingsForm({ value, canManage, onSaved }: FormProps<CommerceSettings>) {
  const [shippingFee, setShippingFee] = useState(String(value.shippingFee));
  const [maxLineQuantity, setMaxLineQuantity] = useState(String(value.maxLineQuantity));
  const [guestCheckout, setGuestCheckout] = useState(value.guestCheckout);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const { save, pending, error, fieldErrors } = useSaveSetting("commerce", onSaved);
  const errors: Record<string, string> = { ...fieldErrors, ...clientErrors };

  function submit() {
    const fee = toNumberOrNull(shippingFee);
    const quantity = toNumberOrNull(maxLineQuantity);
    const next: Record<string, string> = {};
    if (fee === null || fee < 0 || fee > 100_000) next.shippingFee = "Enter an amount from ₹0 to ₹1,00,000.";
    if (quantity === null || !Number.isInteger(quantity) || quantity < 1 || quantity > 50) next.maxLineQuantity = "Enter a whole number from 1 to 50.";
    setClientErrors(next);
    if (Object.keys(next).length || fee === null || quantity === null) return;
    void save({ shippingFee: fee, maxLineQuantity: quantity, guestCheckout });
  }

  return (
    <SettingsForm
      title="Online store"
      description="How the website checkout behaves."
      canManage={canManage}
      pending={pending}
      message={formErrorMessage(error, ["shippingFee", "maxLineQuantity", "guestCheckout"])}
      onSubmit={submit}
    >
      <NumberInput label="Shipping fee (₹)" min={0} max={100000} value={shippingFee} onChange={(e) => setShippingFee(e.target.value)} error={errors.shippingFee} hint="Flat fee added to every online order that has items. Use 0 for free shipping." />
      <NumberInput label="Max quantity per line" min={1} max={50} step={1} inputMode="numeric" value={maxLineQuantity} onChange={(e) => setMaxLineQuantity(e.target.value)} error={errors.maxLineQuantity} hint="Most units of one product a customer can buy in a single order (1–50)." />
      <CheckboxInput
        className={fullWidth}
        label="Allow guest checkout"
        description="When on, customers can place orders without signing in. When off, they must sign in or create an account first."
        checked={guestCheckout}
        onChange={(e) => setGuestCheckout(e.target.checked)}
      />
    </SettingsForm>
  );
}

/* ------------------------------------------------------------------ */
/* Inventory                                                           */
/* ------------------------------------------------------------------ */

function LocationField({ label, hint, value, onChange, error, locations }: { label: string; hint: string; value: string; onChange: (value: string) => void; error?: string; locations: StockLocation[] | undefined }) {
  if (!locations) return <TextInput label={label} required maxLength={40} value={value} onChange={(e) => onChange(e.target.value.trim().toLowerCase())} error={error} hint={`${hint} Enter the location code.`} />;
  const options = locations.filter((location) => location.active || location.id === value).map((location) => ({ value: location.id, label: location.active ? location.name : `${location.name} (inactive)` }));
  if (value && !options.some((option) => option.value === value)) options.push({ value, label: `${value} (not found)` });
  return <SelectInput label={label} required value={value} onChange={(e) => onChange(e.target.value)} options={options} error={error} hint={hint} />;
}

export function InventorySettingsForm({ value, canManage, onSaved }: FormProps<InventorySettings>) {
  const { can } = useAdmin();
  const locations = useAdminResource<StockLocation[]>(can("inventory:view") ? "/locations" : null);
  const [form, setForm] = useState({
    defaultLocationId: value.defaultLocationId,
    onlineFulfilmentLocationId: value.onlineFulfilmentLocationId,
    defaultLowStockThreshold: String(value.defaultLowStockThreshold),
    unusualChangeThreshold: String(value.unusualChangeThreshold),
  });
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const { save, pending, error, fieldErrors } = useSaveSetting("inventory", onSaved);
  const errors: Record<string, string> = { ...fieldErrors, ...clientErrors };
  const set = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));

  function submit() {
    const low = toNumberOrNull(form.defaultLowStockThreshold);
    const unusual = toNumberOrNull(form.unusualChangeThreshold);
    const next: Record<string, string> = {};
    if (!form.defaultLocationId) next.defaultLocationId = "Choose a location.";
    if (!form.onlineFulfilmentLocationId) next.onlineFulfilmentLocationId = "Choose a location.";
    if (low === null || !Number.isInteger(low) || low < 0 || low > 1000) next.defaultLowStockThreshold = "Enter a whole number from 0 to 1,000.";
    if (unusual === null || !Number.isInteger(unusual) || unusual < 1 || unusual > 10_000) next.unusualChangeThreshold = "Enter a whole number from 1 to 10,000.";
    setClientErrors(next);
    if (Object.keys(next).length || low === null || unusual === null) return;
    void save({ defaultLocationId: form.defaultLocationId, onlineFulfilmentLocationId: form.onlineFulfilmentLocationId, defaultLowStockThreshold: low, unusualChangeThreshold: unusual });
  }

  return (
    <SettingsForm
      title="Stock"
      description="Where stock is taken from and when the team is warned."
      canManage={canManage}
      pending={pending}
      message={formErrorMessage(error, ["defaultLocationId", "onlineFulfilmentLocationId", "defaultLowStockThreshold", "unusualChangeThreshold"])}
      onSubmit={submit}
    >
      <LocationField
        label="Default location"
        hint="Returned items are restocked here when no other location is given."
        value={form.defaultLocationId}
        onChange={(id) => set({ defaultLocationId: id })}
        error={errors.defaultLocationId}
        locations={locations.data}
      />
      <LocationField
        label="Online fulfilment location"
        hint="Website availability is based on this location’s stock, and online orders are fulfilled from it."
        value={form.onlineFulfilmentLocationId}
        onChange={(id) => set({ onlineFulfilmentLocationId: id })}
        error={errors.onlineFulfilmentLocationId}
        locations={locations.data}
      />
      <NumberInput
        label="Default low-stock level"
        min={0}
        max={1000}
        step={1}
        inputMode="numeric"
        value={form.defaultLowStockThreshold}
        onChange={(e) => set({ defaultLowStockThreshold: e.target.value })}
        error={errors.defaultLowStockThreshold}
        hint="Used for new products that don’t set their own level. A product is “low stock” at or below it."
      />
      <NumberInput
        label="Unusual stock change threshold"
        min={1}
        max={10000}
        step={1}
        inputMode="numeric"
        value={form.unusualChangeThreshold}
        onChange={(e) => set({ unusualChangeThreshold: e.target.value })}
        error={errors.unusualChangeThreshold}
        hint="A single stock change of this many units or more raises an “unusual stock change” alert."
      />
    </SettingsForm>
  );
}

/* ------------------------------------------------------------------ */
/* Billing                                                             */
/* ------------------------------------------------------------------ */

export function BillingSettingsForm({ value, canManage, onSaved }: FormProps<BillingSettings>) {
  const [invoicePrefix, setInvoicePrefix] = useState(value.invoicePrefix);
  const [footerNote, setFooterNote] = useState(value.footerNote);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const { save, pending, error, fieldErrors } = useSaveSetting("billing", onSaved);
  const errors: Record<string, string> = { ...fieldErrors, ...clientErrors };

  function submit() {
    const prefix = invoicePrefix.trim();
    const next: Record<string, string> = {};
    if (!/^[A-Z]{2,5}$/.test(prefix)) next.invoicePrefix = "Use 2–5 capital letters (A–Z), e.g. INV.";
    setClientErrors(next);
    if (Object.keys(next).length) return;
    void save({ invoicePrefix: prefix, footerNote: footerNote.trim() });
  }

  return (
    <SettingsForm
      title="Invoices"
      description="Numbering and wording on invoices."
      canManage={canManage}
      pending={pending}
      message={formErrorMessage(error, ["invoicePrefix", "footerNote"])}
      onSubmit={submit}
    >
      <TextInput
        label="Invoice number prefix"
        required
        maxLength={5}
        value={invoicePrefix}
        onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
        error={errors.invoicePrefix}
        hint="2–5 capital letters at the start of each new invoice number. Invoices already issued keep their number."
      />
      <TextArea
        label="Footer note"
        rows={4}
        maxLength={500}
        value={footerNote}
        onChange={(e) => setFooterNote(e.target.value)}
        error={errors.footerNote}
        hint={`Printed at the bottom of invoices — terms, a thank-you note or bank details. ${footerNote.length}/500`}
        containerClassName={fullWidth}
      />
    </SettingsForm>
  );
}

/* ------------------------------------------------------------------ */
/* Expenses                                                            */
/* ------------------------------------------------------------------ */

export function ExpenseSettingsForm({ value, canManage, onSaved }: FormProps<ExpenseSettings>) {
  const [approvalRequired, setApprovalRequired] = useState(value.approvalRequired);
  const [taxFieldsEnabled, setTaxFieldsEnabled] = useState(value.taxFieldsEnabled);
  const [sources, setSources] = useState(value.paymentSources);
  const [draft, setDraft] = useState("");
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const { save, pending, error, fieldErrors } = useSaveSetting("expenses", onSaved);
  const errors: Record<string, string> = { ...fieldErrors, ...clientErrors };

  function addSource() {
    const name = draft.trim();
    if (!name) return;
    if (sources.some((source) => source.trim().toLowerCase() === name.toLowerCase())) {
      setClientErrors({ newSource: `“${name}” is already in the list.` });
      return;
    }
    if (sources.length >= 20) {
      setClientErrors({ newSource: "You can have up to 20 payment sources." });
      return;
    }
    setSources([...sources, name]);
    setDraft("");
    setClientErrors({});
  }

  function submit() {
    const cleaned = sources.map((source) => source.trim()).filter(Boolean);
    const next: Record<string, string> = {};
    cleaned.forEach((source, index) => {
      if (source.length > 60) next[`paymentSources.${index}`] = "Use 60 characters or fewer.";
    });
    if (cleaned.length > 20) next.paymentSources = "You can have up to 20 payment sources.";
    setClientErrors(next);
    if (Object.keys(next).length) return;
    setSources(cleaned);
    void save({ approvalRequired, taxFieldsEnabled, paymentSources: cleaned });
  }

  return (
    <SettingsForm
      title="Expenses"
      description="How expenses are recorded and approved."
      canManage={canManage}
      pending={pending}
      message={formErrorMessage(error, ["approvalRequired", "taxFieldsEnabled", "paymentSources", "paymentSources."])}
      onSubmit={submit}
    >
      <CheckboxInput
        className={fullWidth}
        label="Approval required"
        description="When on, submitted expenses wait for someone with approval permission. When off, they are approved automatically on submission."
        checked={approvalRequired}
        onChange={(e) => setApprovalRequired(e.target.checked)}
      />
      <CheckboxInput
        className={fullWidth}
        label="Tax fields enabled"
        description="Show tax amount and GST rate on expenses, and include tax in the expense total. Leave off if the business doesn’t track tax on expenses."
        checked={taxFieldsEnabled}
        onChange={(e) => setTaxFieldsEnabled(e.target.checked)}
      />
      <div className={fullWidth}>
        <p className="text-[0.75rem] font-medium text-ink-soft">Payment sources</p>
        <p className="mt-0.5 text-[0.75rem] text-muted">Where expense money is paid from (for example Cash or a bank account). Offered as choices when recording an expense.</p>
        {sources.length === 0 ? (
          <p className="mt-3 border border-dashed border-line px-4 py-4 text-center text-[0.8125rem] text-muted">No payment sources yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {sources.map((source, index) => (
              <li key={index}>
                <div className="flex gap-2">
                  <input
                    aria-label={`Payment source ${index + 1}`}
                    value={source}
                    maxLength={60}
                    onChange={(e) => setSources(sources.map((item, i) => (i === index ? e.target.value : item)))}
                    className={controlClass(errors[`paymentSources.${index}`], "h-10")}
                  />
                  <AdminButton variant="ghost" onClick={() => setSources(sources.filter((_, i) => i !== index))} aria-label={`Remove ${source || "payment source"}`}>
                    <TrashIcon size={15} />
                  </AdminButton>
                </div>
                {errors[`paymentSources.${index}`] && (
                  <p role="alert" className="mt-1 text-[0.75rem] text-danger">
                    {errors[`paymentSources.${index}`]}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
        {canManage && (
          <div className="mt-3 flex gap-2">
            <input
              aria-label="New payment source"
              placeholder="Add a payment source"
              value={draft}
              maxLength={60}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSource();
                }
              }}
              className={controlClass(errors.newSource, "h-10")}
            />
            <AdminButton onClick={addSource} disabled={!draft.trim()}>
              <PlusIcon size={15} />
              Add
            </AdminButton>
          </div>
        )}
        {(errors.newSource || errors.paymentSources) && (
          <p role="alert" className="mt-1 text-[0.75rem] text-danger">
            {errors.newSource ?? errors.paymentSources}
          </p>
        )}
      </div>
    </SettingsForm>
  );
}
